-- ════════════════════════════════════════════════════════════════
-- SOLO OS — SEED: Player profile fields for Harsh Bathija.
-- Per-user. The app applies these on first launch; this file is the
-- manual equivalent. Set :user_id first.
-- ════════════════════════════════════════════════════════════════

-- \set user_id 'YOUR-AUTH-UID'

update player_profiles set
  display_name       = 'Harsh Bathija',
  height_cm          = 188.0,   -- 6 ft 2 in
  weight_kg          = 75.0,
  wake_target        = '05:00',
  sleep_target_hours = 6.0
where user_id = :'user_id'::uuid;
