import type { RankName, RankTier } from '@/types';
import { colors } from '@/theme';

/** Rank tiers by level band. Centralized configuration. */
export const RANK_TIERS: RankTier[] = [
  { name: 'INITIATE', minLevel: 1, maxLevel: 10, color: colors.textSecondary },
  { name: 'AWAKENED', minLevel: 11, maxLevel: 20, color: colors.energy },
  { name: 'VANGUARD', minLevel: 21, maxLevel: 35, color: colors.cyan },
  { name: 'ASCENDANT', minLevel: 36, maxLevel: 50, color: colors.violet },
  { name: 'ELITE', minLevel: 51, maxLevel: 65, color: colors.violetBright },
  { name: 'APEX', minLevel: 66, maxLevel: 80, color: colors.gold },
  { name: 'TRANSCENDENT', minLevel: 81, maxLevel: 90, color: colors.goldBright },
  { name: 'PARAGON', minLevel: 91, maxLevel: 99, color: colors.crimson },
  { name: 'SOVEREIGN', minLevel: 100, maxLevel: 100, color: colors.white },
];

export const MAX_LEVEL = 100;

export function rankColor(rank: RankName): string {
  return RANK_TIERS.find((t) => t.name === rank)?.color ?? colors.textSecondary;
}
