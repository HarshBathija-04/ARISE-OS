-- ════════════════════════════════════════════════════════════════
-- SOLO OS — 0009 Row Level Security
-- Private progress data: owner-only.
-- Global definitions (templates/defs): readable by any authenticated user,
--   writable by nobody (seeded via service role / migrations).
-- ════════════════════════════════════════════════════════════════

-- ── Helper: owner policy generator via explicit statements ───────

-- Per-user private tables ------------------------------------------------
do $$
declare t text;
  owner_tables text[] := array[
    'profiles','player_profiles','attributes','attribute_history',
    'missions','mission_completions','campaign_progress','skill_progress',
    'focus_sessions','boss_encounters','boss_logs','shadow_habits',
    'shadow_habit_logs','urge_logs','recovery_missions','streaks',
    'streak_shields','user_achievements','user_titles','rewards',
    'reward_purchases','coin_transactions','daily_reports','weekly_reports',
    'activity_logs','system_notifications','user_settings','notification_preferences'
  ];
begin
  foreach t in array owner_tables loop
    execute format('alter table %I enable row level security;', t);

    -- profiles / player_profiles / user_settings use user_id OR id
    if t = 'profiles' then
      execute format($f$
        drop policy if exists %1$s_select on %1$s;
        create policy %1$s_select on %1$s for select using (auth.uid() = id);
        drop policy if exists %1$s_insert on %1$s;
        create policy %1$s_insert on %1$s for insert with check (auth.uid() = id);
        drop policy if exists %1$s_update on %1$s;
        create policy %1$s_update on %1$s for update using (auth.uid() = id) with check (auth.uid() = id);
        drop policy if exists %1$s_delete on %1$s;
        create policy %1$s_delete on %1$s for delete using (auth.uid() = id);
      $f$, t);
    elsif t = 'user_settings' then
      execute format($f$
        drop policy if exists %1$s_select on %1$s;
        create policy %1$s_select on %1$s for select using (auth.uid() = user_id);
        drop policy if exists %1$s_insert on %1$s;
        create policy %1$s_insert on %1$s for insert with check (auth.uid() = user_id);
        drop policy if exists %1$s_update on %1$s;
        create policy %1$s_update on %1$s for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
        drop policy if exists %1$s_delete on %1$s;
        create policy %1$s_delete on %1$s for delete using (auth.uid() = user_id);
      $f$, t);
    else
      execute format($f$
        drop policy if exists %1$s_select on %1$s;
        create policy %1$s_select on %1$s for select using (auth.uid() = user_id);
        drop policy if exists %1$s_insert on %1$s;
        create policy %1$s_insert on %1$s for insert with check (auth.uid() = user_id);
        drop policy if exists %1$s_update on %1$s;
        create policy %1$s_update on %1$s for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
        drop policy if exists %1$s_delete on %1$s;
        create policy %1$s_delete on %1$s for delete using (auth.uid() = user_id);
      $f$, t);
    end if;
  end loop;
end $$;

-- Global read-only definition tables -------------------------------------
do $$
declare t text;
  def_tables text[] := array[
    'player_levels','mission_templates','campaigns','campaign_stages',
    'skill_trees','skill_nodes','bosses','achievements','titles'
  ];
begin
  foreach t in array def_tables loop
    execute format('alter table %I enable row level security;', t);
    execute format($f$
      drop policy if exists %1$s_read on %1$s;
      create policy %1$s_read on %1$s for select to authenticated using (true);
    $f$, t);
    -- No insert/update/delete policies => writes blocked for normal users.
    -- Service role bypasses RLS for seeding.
  end loop;
end $$;
