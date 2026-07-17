-- Include timetable and notification scheduling state in full profile reset.
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

revoke execute on function reset_profile(uuid) from public, anon, authenticated;
