-- ════════════════════════════════════════════════════════════════
-- SOLO OS — 0011 Trusted progression RPCs
-- The client submits an ACTION (mission id). The server computes all
-- rewards from server-side state. Client-supplied XP is never trusted.
-- ════════════════════════════════════════════════════════════════

-- Daily soft cap for manual-activity XP (anti-farming).
-- Beyond the cap, XP efficiency decays.
create or replace function soloos_apply_daily_softcap(
  p_user uuid, p_base_xp int
) returns int language plpgsql stable as $$
declare
  earned_today bigint;
  soft_cap constant int := 1200;
begin
  select coalesce(sum(xp_awarded),0) into earned_today
  from activity_logs
  where user_id = p_user
    and for_date = (now() at time zone 'utc')::date;

  if earned_today >= soft_cap then
    return greatest(1, round(p_base_xp * 0.25));   -- heavy decay past cap
  elsif earned_today + p_base_xp > soft_cap then
    return greatest(1, round(p_base_xp * 0.6));     -- partial decay crossing cap
  end if;
  return p_base_xp;
end $$;

-- Award attribute XP (handles multi-level attribute-ups). Internal.
create or replace function soloos_award_attribute(
  p_user uuid, p_code attribute_code, p_xp int, p_source activity_type, p_ref uuid
) returns void language plpgsql as $$
declare
  rec attributes%rowtype;
  remaining int := p_xp;
begin
  if p_xp <= 0 then return; end if;
  select * into rec from attributes where user_id = p_user and code = p_code for update;
  if not found then return; end if;

  rec.current_xp := rec.current_xp + remaining;
  rec.lifetime_xp := rec.lifetime_xp + remaining;
  -- attribute level curve: required = 100 * level^1.35
  while rec.current_xp >= rec.required_xp loop
    rec.current_xp := rec.current_xp - rec.required_xp;
    rec.level := rec.level + 1;
    rec.required_xp := round(100 * power(rec.level, 1.35));
  end loop;
  rec.last_increase_at := now();

  update attributes set
    current_xp = rec.current_xp, required_xp = rec.required_xp,
    level = rec.level, lifetime_xp = rec.lifetime_xp,
    last_increase_at = rec.last_increase_at
  where id = rec.id;

  insert into attribute_history(user_id, code, xp_delta, source, ref_id)
  values (p_user, p_code, p_xp, p_source, p_ref);
end $$;

-- Core: complete a mission. Returns a jsonb result envelope.
create or replace function complete_mission(p_mission_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  m missions%rowtype;
  pp player_profiles%rowtype;
  title_bonus numeric := 0;
  base_xp int;
  final_xp int;
  final_coins int;
  ar jsonb;
  old_level int;
  new_level int;
  new_rank rank_name;
  levels_gained int;
  attr jsonb;
begin
  -- Ownership + status guard
  select * into m from missions
    where id = p_mission_id and user_id = auth.uid() for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'MISSION_NOT_FOUND');
  end if;
  if m.status = 'COMPLETED' then
    return jsonb_build_object('ok', false, 'error', 'ALREADY_COMPLETED');
  end if;

  select * into pp from player_profiles where user_id = auth.uid() for update;

  -- Title bonus (max 5%)
  if pp.equipped_title_key is not null then
    select least(coalesce(bonus_value,0),0.05) into title_bonus
    from titles where key = pp.equipped_title_key and bonus_type = 'XP';
    title_bonus := coalesce(title_bonus, 0);
  end if;

  base_xp := m.xp_reward;
  final_xp := soloos_apply_daily_softcap(auth.uid(), base_xp);
  final_xp := round(final_xp * (1 + title_bonus));
  final_coins := m.coin_reward;

  old_level := pp.level;

  -- Persist mission completion
  update missions set
    status = 'COMPLETED',
    current_progress = target_value,
    completed_at = now()
  where id = m.id;

  -- XP -> lifetime + recompute level/rank
  update player_profiles set
    lifetime_xp = lifetime_xp + final_xp,
    coins = coins + final_coins
  where user_id = auth.uid()
  returning lifetime_xp into pp.lifetime_xp;

  select level, rank into new_level, new_rank
  from soloos_level_from_xp(pp.lifetime_xp);

  update player_profiles set level = new_level, rank = new_rank
  where user_id = auth.uid();
  levels_gained := new_level - old_level;

  -- Attribute rewards
  for attr in select * from jsonb_array_elements(m.attribute_rewards) loop
    perform soloos_award_attribute(
      auth.uid(),
      (attr->>'code')::attribute_code,
      (attr->>'xp')::int,
      m.activity_type, m.id
    );
  end loop;

  -- Coin ledger
  if final_coins <> 0 then
    insert into coin_transactions(user_id, amount, reason, ref_id, balance_after)
    values (auth.uid(), final_coins, 'MISSION', m.id, pp.coins + final_coins);
  end if;

  -- Activity log (trusted record for analytics + boss damage)
  insert into activity_logs(user_id, activity_type, quantity, unit, xp_awarded, source_table, source_id)
  values (auth.uid(), m.activity_type, m.target_value, 'unit', final_xp, 'missions', m.id);

  -- Completion audit
  insert into mission_completions(user_id, mission_id, xp_awarded, coins_awarded, attribute_awards)
  values (auth.uid(), m.id, final_xp, final_coins, m.attribute_rewards);

  -- System event feed
  insert into system_notifications(user_id, type, title, detail)
  values (auth.uid(), 'MISSION_COMPLETE', m.title, 'Mission validated. +' || final_xp || ' XP');

  if levels_gained > 0 then
    insert into system_notifications(user_id, type, title, detail)
    values (auth.uid(), 'LEVEL_UP', 'LEVEL INCREASE', 'Level ' || old_level || ' -> ' || new_level);
  end if;

  return jsonb_build_object(
    'ok', true,
    'xpAwarded', final_xp,
    'coinsAwarded', final_coins,
    'oldLevel', old_level,
    'newLevel', new_level,
    'levelsGained', levels_gained,
    'rank', new_rank,
    'lifetimeXp', pp.lifetime_xp
  );
end $$;
