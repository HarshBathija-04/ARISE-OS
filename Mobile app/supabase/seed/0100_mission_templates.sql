-- ════════════════════════════════════════════════════════════════
-- SOLO OS — SEED: Mission templates (global catalog)
-- Idempotent: upserts by template_key.
-- ════════════════════════════════════════════════════════════════

insert into mission_templates
  (template_key, title, description, type, difficulty, category, activity_type,
   objective_type, target_value, base_xp, base_coins, attribute_rewards,
   verification_type, failure_consequence)
values
  ('daily_wake', 'AWAKEN BEFORE THE DAY', 'Wake before 05:15 and confirm.',
   'DAILY','D','DISCIPLINE','WAKE_5AM','BOOLEAN',1,120,10,
   '[{"code":"DIS","xp":40},{"code":"CON","xp":30}]','MANUAL','Wake streak resets.'),

  ('daily_gate', 'THE GATE OPENS', 'Complete the assigned GATE study duration.',
   'DAILY','C','GATE','GATE_STUDY','DURATION_MINUTES',90,180,15,
   '[{"code":"INT","xp":60},{"code":"FOC","xp":30},{"code":"DIS","xp":20}]','TIMER','GATE streak resets.'),

  ('daily_dsa', 'ALGORITHM TRAINING', 'Complete assigned DSA problems.',
   'DAILY','C','DSA','DSA','COUNT',3,150,15,
   '[{"code":"INT","xp":45},{"code":"SKL","xp":45},{"code":"FOC","xp":20}]','PROGRESS_VALUE','DSA streak resets.'),

  ('daily_deepwork', 'ENTER DEEP FOCUS', 'Complete a deep focus session.',
   'DAILY','C','FOCUS','DEEP_WORK','DURATION_MINUTES',50,140,12,
   '[{"code":"FOC","xp":55},{"code":"DIS","xp":25},{"code":"INT","xp":20}]','TIMER','Deep work streak resets.'),

  ('daily_workout', 'FORGE THE BODY', 'Complete today''s workout.',
   'DAILY','C','PHYSICAL','WORKOUT','BOOLEAN',1,160,15,
   '[{"code":"STR","xp":55},{"code":"END","xp":30},{"code":"VIT","xp":25}]','MANUAL','Workout streak resets.'),

  ('daily_move', 'KEEP MOVING', 'Complete running or walking.',
   'DAILY','D','PHYSICAL','RUNNING','BOOLEAN',1,110,10,
   '[{"code":"END","xp":45},{"code":"VIT","xp":25},{"code":"DIS","xp":15}]','MANUAL','Movement day missed.'),

  ('daily_silence', 'DIGITAL SILENCE', 'Maintain a Reels and Shorts-free day.',
   'DAILY','B','DISCIPLINE','NO_REELS','BOOLEAN',1,170,15,
   '[{"code":"FOC","xp":50},{"code":"DIS","xp":50}]','MANUAL','Digital silence streak resets.'),

  ('daily_shadow', 'CONTROL THE SHADOW', 'Maintain control for the day.',
   'DAILY','B','RECOVERY','PORN_FREE','BOOLEAN',1,170,15,
   '[{"code":"DIS","xp":55},{"code":"CON","xp":45}]','MANUAL','Shadow control streak resets.'),

  ('daily_rest', 'REST PROTOCOL', 'Meet the sleep target.',
   'DAILY','D','RECOVERY','ROUTINE_COMPLETION','BOOLEAN',1,90,8,
   '[{"code":"VIT","xp":40},{"code":"CON","xp":20}]','MANUAL','Recovery reduced.'),

  ('daily_routine', 'ROUTINE LOCK', 'Complete the core routine blocks.',
   'DAILY','B','DISCIPLINE','ROUTINE_COMPLETION','BOOLEAN',1,150,14,
   '[{"code":"CON","xp":55},{"code":"DIS","xp":35}]','MANUAL','Routine streak resets.'),

  -- Side / campaign-supporting templates
  ('side_aiml', 'NEURAL EXPANSION', 'Study AI / ML for the target duration.',
   'SIDE','C','AI_ML','AI_ML','DURATION_MINUTES',60,130,12,
   '[{"code":"INT","xp":50},{"code":"SKL","xp":40}]','TIMER',null),

  ('side_fullstack', 'BUILD PROTOCOL', 'Full-stack development session.',
   'SIDE','C','FULL_STACK','FULL_STACK','DURATION_MINUTES',60,130,12,
   '[{"code":"SKL","xp":55},{"code":"INT","xp":35}]','TIMER',null),

  ('side_sysdesign', 'ARCHITECT MIND', 'Study System Design.',
   'SIDE','C','SYSTEM_DESIGN','SYSTEM_DESIGN','DURATION_MINUTES',60,130,12,
   '[{"code":"INT","xp":50},{"code":"SKL","xp":40}]','TIMER',null),

  ('side_datasci', 'DATA INSIGHT', 'Data Science study session.',
   'SIDE','C','DATA_SCIENCE','DATA_SCIENCE','DURATION_MINUTES',60,120,11,
   '[{"code":"INT","xp":50},{"code":"SKL","xp":35}]','TIMER',null),

  ('recovery_reclaim', 'RECLAIM CONTROL', 'Execute the recovery protocol.',
   'RECOVERY','D','RECOVERY','RECOVERY','BOOLEAN',1,80,5,
   '[{"code":"DIS","xp":30},{"code":"CON","xp":20}]','MANUAL',null)
on conflict (template_key) do update set
  title = excluded.title, description = excluded.description,
  type = excluded.type, difficulty = excluded.difficulty, category = excluded.category,
  activity_type = excluded.activity_type, objective_type = excluded.objective_type,
  target_value = excluded.target_value, base_xp = excluded.base_xp,
  base_coins = excluded.base_coins, attribute_rewards = excluded.attribute_rewards,
  verification_type = excluded.verification_type,
  failure_consequence = excluded.failure_consequence;
