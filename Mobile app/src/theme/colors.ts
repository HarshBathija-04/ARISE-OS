/**
 * SOLO OS — Centralized color system.
 *
 * Inspired by Solo Leveling's System Interface:
 *  - Near-void black backgrounds
 *  - Iconic system-blue window borders / accents (#4A7AFF)
 *  - Shadow-violet monarch energy (#7B61FF)
 *  - Cold, authoritarian text hierarchy
 *
 * NEVER hardcode hex values in components. Import from here (or `theme`).
 */

export const colors = {
  // ── Backgrounds (The Void) ──────────────────────────────────────
  bg: '#020408',            // primary — near-void black
  bgSecondary: '#060A14',   // secondary — deep space
  surface: '#0A1228',       // panels / cards — cold blue-tinted glass
  surface2: '#0E1A36',      // raised surface — darker dungeon blue
  surface3: '#162040',      // elevated / hover — faint gate glow
  border: '#1A2744',        // hairline borders — blue-tinted
  borderBright: '#2B4A7A',  // active / focused borders — system edge

  // ── System Energies ─────────────────────────────────────────────
  energy: '#4A7AFF',        // System Blue — primary (the iconic gate blue)
  energyBright: '#6B9AFF',  // Bright system blue
  energyDim: '#1E3A8A',     // Dim system blue
  violet: '#7B61FF',        // Shadow Violet — monarch energy
  violetBright: '#9D8AFF',  // Bright violet
  cyan: '#22D3EE',          // Phantom Cyan — focus / system online
  cyanBright: '#67E8F9',    // Bright cyan
  crimson: '#DC2626',       // Blood crimson — danger / boss
  crimsonDim: '#7F1D2A',    // Dim crimson
  gold: '#F5A623',          // Sovereign Gold — legendary / rank
  goldBright: '#FFCC44',    // Bright gold
  green: '#34D399',         // Success / stable states

  // ── Solo Leveling Signature Colors ──────────────────────────────
  systemBlue: '#4A7AFF',    // The System window color
  shadowViolet: '#7B61FF',  // Shadow monarch aura
  monarchGold: '#F5A623',   // Rank / sovereignty
  phantomCyan: '#22D3EE',   // System online / phantom
  dungeonGateStart: '#4A7AFF', // Dungeon gate gradient start
  dungeonGateEnd: '#7B61FF',   // Dungeon gate gradient end

  // ── Text ────────────────────────────────────────────────────────
  text: '#E2E8F4',          // cold white with blue undertone
  textSecondary: '#7A8FB5', // muted blue-grey
  textDim: '#3D5278',       // low-emphasis — cold
  textFaint: '#1E3050',     // ghost / placeholder

  // ── Rarity ──────────────────────────────────────────────────────
  rarityCommon: '#7A8FB5',
  rarityRare: '#4A7AFF',
  rarityEpic: '#7B61FF',
  rarityLegendary: '#F5A623',
  rarityMythic: '#DC2626',

  // ── Absolutes ───────────────────────────────────────────────────
  black: '#000000',
  white: '#FFFFFF',
  transparent: 'transparent',
} as const;

export type ColorKey = keyof typeof colors;

/** Convert a hex color + alpha (0..1) to an rgba() string. */
export function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '').slice(0, 6);
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** Rarity → color lookup used across achievements / titles / items. */
export const rarityColor: Record<string, string> = {
  COMMON: colors.rarityCommon,
  RARE: colors.rarityRare,
  EPIC: colors.rarityEpic,
  LEGENDARY: colors.rarityLegendary,
  MYTHIC: colors.rarityMythic,
};
