-- ════════════════════════════════════════════════════════════════
-- SOLO OS — SEED: Titles (bonuses capped at 5%)
-- ════════════════════════════════════════════════════════════════

insert into titles (key, name, description, rarity, bonus_type, bonus_value, sort_order) values
  ('the_initiate','THE INITIATE','You answered the System''s call.','COMMON','NONE',0,1),
  ('the_consistent','THE CONSISTENT','Consistency is your weapon.','RARE','COIN',0.02,2),
  ('focus_hunter','FOCUS HUNTER','You hunt distraction to extinction.','RARE','XP',0.02,3),
  ('algorithm_hunter','ALGORITHM HUNTER','Problems fall before you.','EPIC','XP',0.03,4),
  ('iron_mind','IRON MIND','Body and will forged as one.','EPIC','XP',0.03,5),
  ('the_unyielding','THE UNYIELDING','You return no matter how many times you fall.','LEGENDARY','XP',0.04,6),
  ('deep_work_master','DEEP WORK MASTER','Master of sustained focus.','EPIC','XP',0.03,7),
  ('the_ascendant','THE ASCENDANT','Rising beyond your former limits.','LEGENDARY','XP',0.04,8),
  ('the_disciplined','THE DISCIPLINED','Discipline is your default state.','EPIC','COIN',0.03,9),
  ('the_sovereign','THE SOVEREIGN','You command your own existence.','MYTHIC','XP',0.05,10)
on conflict (key) do update set
  name=excluded.name, description=excluded.description, rarity=excluded.rarity,
  bonus_type=excluded.bonus_type, bonus_value=excluded.bonus_value, sort_order=excluded.sort_order;
