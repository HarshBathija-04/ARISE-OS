/**
 * Rank tiers. Original terminology (no copyrighted names).
 * Level 100 = "Sovereign" and is intentionally a multi-year goal (see xp-engine).
 */
export interface RankTier {
  key: string;
  name: string;
  minLevel: number;
  maxLevel: number;
  color: string; // hex, used for the player card glow
  blurb: string;
}

export const RANK_TIERS: RankTier[] = [
  { key: "initiate", name: "Initiate", minLevel: 1, maxLevel: 10, color: "#7c8aa5", blurb: "The System has bound to you. The climb begins." },
  { key: "awakened", name: "Awakened", minLevel: 11, maxLevel: 20, color: "#39a7ff", blurb: "Your potential has stirred awake." },
  { key: "vanguard", name: "Vanguard", minLevel: 21, maxLevel: 35, color: "#3ff0e0", blurb: "You move at the front of your own life." },
  { key: "ascendant", name: "Ascendant", minLevel: 36, maxLevel: 50, color: "#8b5cff", blurb: "Momentum has become identity." },
  { key: "elite", name: "Elite", minLevel: 51, maxLevel: 70, color: "#b57bff", blurb: "Few sustain what you now sustain." },
  { key: "apex", name: "Apex", minLevel: 71, maxLevel: 90, color: "#f5c451", blurb: "You operate at the edge of your capacity." },
  { key: "transcendent", name: "Transcendent", minLevel: 91, maxLevel: 99, color: "#ff9f45", blurb: "The person you were could not imagine this." },
  { key: "sovereign", name: "Sovereign", minLevel: 100, maxLevel: 100, color: "#ff5db1", blurb: "You rule the system that once ruled you." },
];

export function rankForLevel(level: number): RankTier {
  const tier = RANK_TIERS.find((r) => level >= r.minLevel && level <= r.maxLevel);
  return tier ?? RANK_TIERS[RANK_TIERS.length - 1]!;
}
