import type { TitleDef } from '@/types';

/** Client mirror of supabase/seed/0102_titles.sql. Bonuses capped at 5%. */
export const TITLE_DEFS: TitleDef[] = [
  { key: 'the_initiate', name: 'THE INITIATE', description: "You answered the System's call.", rarity: 'COMMON', bonusType: 'NONE', bonusValue: 0 },
  { key: 'the_consistent', name: 'THE CONSISTENT', description: 'Consistency is your weapon.', rarity: 'RARE', bonusType: 'COIN', bonusValue: 0.02 },
  { key: 'focus_hunter', name: 'FOCUS HUNTER', description: 'You hunt distraction to extinction.', rarity: 'RARE', bonusType: 'XP', bonusValue: 0.02 },
  { key: 'algorithm_hunter', name: 'ALGORITHM HUNTER', description: 'Problems fall before you.', rarity: 'EPIC', bonusType: 'XP', bonusValue: 0.03 },
  { key: 'iron_mind', name: 'IRON MIND', description: 'Body and will forged as one.', rarity: 'EPIC', bonusType: 'XP', bonusValue: 0.03 },
  { key: 'the_unyielding', name: 'THE UNYIELDING', description: 'You return no matter how many times you fall.', rarity: 'LEGENDARY', bonusType: 'XP', bonusValue: 0.04 },
  { key: 'deep_work_master', name: 'DEEP WORK MASTER', description: 'Master of sustained focus.', rarity: 'EPIC', bonusType: 'XP', bonusValue: 0.03 },
  { key: 'the_ascendant', name: 'THE ASCENDANT', description: 'Rising beyond your former limits.', rarity: 'LEGENDARY', bonusType: 'XP', bonusValue: 0.04 },
  { key: 'the_disciplined', name: 'THE DISCIPLINED', description: 'Discipline is your default state.', rarity: 'EPIC', bonusType: 'COIN', bonusValue: 0.03 },
  { key: 'the_sovereign', name: 'THE SOVEREIGN', description: 'You command your own existence.', rarity: 'MYTHIC', bonusType: 'XP', bonusValue: 0.05 },
];

export function titleDef(key: string | null): TitleDef | undefined {
  if (!key) return undefined;
  return TITLE_DEFS.find((t) => t.key === key);
}
