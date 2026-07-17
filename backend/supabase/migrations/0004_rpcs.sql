-- ─────────────────────────────────────────────────────────────
-- ARISE//OS — 0004_rpcs.sql
-- The only three operations that need true transactional semantics.
-- Everything else is sequential supabase-js calls from the backend.
-- ─────────────────────────────────────────────────────────────

-- Sum of XP already granted during the current game day (quests + focus).
-- Mirrors xpEarnedToday() in the old service.ts.
create or replace function xp_earned_today(p_user_id uuid, p_since timestamptz)
returns integer language sql stable as $$
  select
    coalesce((select sum(xp_awarded) from quest_completions
              where user_id = p_user_id and completed_at >= p_since), 0)::integer
    +
    coalesce((select sum(xp_awarded) from focus_sessions
              where user_id = p_user_id and started_at >= p_since), 0)::integer;
$$;

-- Atomic coin check + debit + purchase record. Mirrors purchaseReward()
-- from service-extra.ts (the one true transaction in the old code).
create or replace function purchase_reward(p_user_id uuid, p_reward_id text)
returns jsonb language plpgsql as $$
declare
  v_reward  rewards%rowtype;
  v_coins   integer;
  v_balance integer;
begin
  select * into v_reward from rewards
    where id = p_reward_id and user_id = p_user_id and active = true;
  if not found then
    raise exception 'Reward not found';
  end if;

  select coins into v_coins from player_profiles
    where user_id = p_user_id for update;
  if not found then
    raise exception 'Profile not found';
  end if;
  if v_coins < v_reward.cost then
    raise exception 'Not enough coins';
  end if;

  v_balance := v_coins - v_reward.cost;
  update player_profiles set coins = v_balance where user_id = p_user_id;
  insert into coin_transactions (user_id, amount, reason, source, balance)
    values (p_user_id, -v_reward.cost, 'PURCHASE', v_reward.title, v_balance);
  insert into reward_purchases (user_id, reward_id, cost)
    values (p_user_id, p_reward_id, v_reward.cost);

  return jsonb_build_object('ok', true, 'balance', v_balance);
end;
$$;

-- Full profile reset. Mirrors resetProfileAction() from actions.ts
-- (minus game_state_snapshots, which no longer exists).
create or replace function reset_profile(p_user_id uuid)
returns void language plpgsql as $$
begin
  update player_profiles set
    level = 1, total_xp = 0, current_xp = 0, coins = 0, rank = 'Initiate',
    active_days = 0, current_streak = 0, longest_streak = 0,
    discipline_score = 0, knowledge_score = 0, physical_score = 0,
    focus_score = 0, recovery_score = 0, life_score = 0
  where user_id = p_user_id;

  update attributes set level = 1, xp = 0, total_xp = 0 where user_id = p_user_id;

  delete from quest_completions where user_id = p_user_id;
  delete from quests where user_id = p_user_id;
  delete from boss_battle_logs where battle_id in
    (select id from boss_battles where user_id = p_user_id);
  delete from boss_battles where user_id = p_user_id;
  delete from focus_sessions where user_id = p_user_id;

  update streaks set current = 0, longest = 0, shields_used = 0 where user_id = p_user_id;
  update user_achievements set progress = 0, unlocked = false, unlocked_at = null
    where user_id = p_user_id;

  delete from activity_logs where user_id = p_user_id;
  delete from habit_logs where user_id = p_user_id;
  delete from urge_logs where user_id = p_user_id;
  delete from notification_events where user_id = p_user_id;
  delete from alarm_events where user_id = p_user_id;
  delete from scheduled_notifications where user_id = p_user_id;
  delete from study_logs where user_id = p_user_id;
  delete from timetable_block_logs where user_id = p_user_id;
  delete from timetable_blocks where user_id = p_user_id;
  delete from coin_transactions where user_id = p_user_id;
  delete from level_progress where user_id = p_user_id;
  delete from attribute_history where user_id = p_user_id;
  delete from notifications where user_id = p_user_id;
  delete from reports where user_id = p_user_id;
end;
$$;

-- Lock the RPCs down: only the service role (backend) may call them.
revoke execute on function xp_earned_today(uuid, timestamptz) from public, anon, authenticated;
revoke execute on function purchase_reward(uuid, text) from public, anon, authenticated;
revoke execute on function reset_profile(uuid) from public, anon, authenticated;
