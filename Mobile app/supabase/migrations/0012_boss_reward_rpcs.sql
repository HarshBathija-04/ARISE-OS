-- ════════════════════════════════════════════════════════════════
-- SOLO OS — 0012 Boss damage + reward purchase RPCs
-- ════════════════════════════════════════════════════════════════

-- Server-side damage table for an activity (never trust client damage).
create or replace function soloos_activity_damage(p_activity activity_type, p_qty numeric)
returns int language plpgsql immutable as $$
begin
  return case p_activity
    when 'DEEP_WORK'          then greatest(5, round(p_qty / 30.0 * 5))  -- ~5 per 30 min
    when 'DSA'                then 3 * greatest(1, round(p_qty))
    when 'WORKOUT'            then 15
    when 'RUNNING'            then 12
    when 'GATE_STUDY'         then 10 * greatest(1, round(p_qty))
    when 'ROUTINE_COMPLETION' then 25
    when 'FOCUS_SESSION'      then greatest(5, round(p_qty / 30.0 * 5))
    when 'AI_ML'              then 8
    when 'FULL_STACK'         then 8
    when 'SYSTEM_DESIGN'      then 8
    when 'DATA_SCIENCE'       then 8
    else 4
  end;
end $$;

-- Apply damage from a real activity to a player's active boss encounter.
create or replace function apply_boss_damage(
  p_encounter_id uuid, p_activity activity_type, p_quantity numeric
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  e boss_encounters%rowtype;
  base_dmg int;
  is_crit boolean := false;
  final_dmg int;
  hp_after int;
begin
  select * into e from boss_encounters
    where id = p_encounter_id and user_id = auth.uid() for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'ENCOUNTER_NOT_FOUND');
  end if;
  if e.status <> 'ACTIVE' then
    return jsonb_build_object('ok', false, 'error', 'NOT_ACTIVE');
  end if;

  base_dmg := soloos_activity_damage(p_activity, p_quantity);

  -- Weakness => critical impact (1.5x)
  if p_activity = any (
    select unnest(weakness) from bosses where id = e.boss_id
  ) then
    is_crit := true;
    final_dmg := round(base_dmg * 1.5);
  else
    final_dmg := base_dmg;
  end if;

  hp_after := greatest(0, e.current_hp - final_dmg);

  -- Update HP, derive phase from damage dealt, mark defeat at 0 HP.
  update boss_encounters set
    current_hp = hp_after,
    phase = case
      when hp_after = 0 then phase
      else greatest(1, least(
        (select phase_count from bosses where id = e.boss_id),
        ceil(((max_hp - hp_after)::numeric / max_hp) *
             (select phase_count from bosses where id = e.boss_id))::int
      ))
    end,
    status = case when hp_after = 0 then 'DEFEATED' else 'ACTIVE' end,
    defeated_at = case when hp_after = 0 then now() else defeated_at end
  where id = e.id;

  insert into boss_logs(user_id, encounter_id, activity_type, damage, is_critical, hp_after)
  values (auth.uid(), e.id, p_activity, final_dmg, is_crit, hp_after);

  insert into system_notifications(user_id, type, title, detail)
  values (
    auth.uid(),
    case when hp_after = 0 then 'BOSS_DEFEAT' else 'BOSS_DAMAGE' end,
    (select name from bosses where id = e.boss_id),
    case when hp_after = 0 then 'BOSS DEFEATED' else '-' || final_dmg || ' HP' end
  );

  return jsonb_build_object(
    'ok', true, 'damage', final_dmg, 'critical', is_crit,
    'hpAfter', hp_after, 'defeated', hp_after = 0
  );
end $$;

-- Purchase a reward: validates coin balance server-side.
create or replace function purchase_reward(p_reward_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r rewards%rowtype;
  pp player_profiles%rowtype;
  cooldown_ok boolean;
begin
  select * into r from rewards where id = p_reward_id and user_id = auth.uid() for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'REWARD_NOT_FOUND');
  end if;

  select * into pp from player_profiles where user_id = auth.uid() for update;

  if pp.coins < r.coin_cost then
    return jsonb_build_object('ok', false, 'error', 'INSUFFICIENT_COINS');
  end if;

  cooldown_ok := r.last_purchased_at is null
    or r.cooldown_hours = 0
    or r.last_purchased_at + (r.cooldown_hours || ' hours')::interval <= now();
  if not cooldown_ok then
    return jsonb_build_object('ok', false, 'error', 'ON_COOLDOWN');
  end if;

  update player_profiles set coins = coins - r.coin_cost where user_id = auth.uid();

  update rewards set
    purchase_count = purchase_count + 1,
    last_purchased_at = now()
  where id = r.id;

  insert into reward_purchases(user_id, reward_id, coin_cost)
  values (auth.uid(), r.id, r.coin_cost);

  insert into coin_transactions(user_id, amount, reason, ref_id, balance_after)
  values (auth.uid(), -r.coin_cost, 'PURCHASE', r.id, pp.coins - r.coin_cost);

  insert into system_notifications(user_id, type, title, detail)
  values (auth.uid(), 'REWARD', 'REWARD AUTHORIZED', r.name);

  return jsonb_build_object('ok', true, 'balanceAfter', pp.coins - r.coin_cost);
end $$;
