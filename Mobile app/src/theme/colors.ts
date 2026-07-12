/**
 * SOLO OS — Centralized color system.
 *
 * The interface should resemble a secret operating system: dark, minimal,
 * with glow used sparingly to represent energy / progression.
 *
 * NEVER hardcode hex values in components. Import from here (or `theme`).
 */

export const colors = {
  // ── Backgrounds ────────────────────────────────────────────────
  bg: '#030508', // primary background (near-black)
  bgSecondary: '#070B12', // secondary background
  surface: '#0B111C', // panels / cards
  surface2: '#101828', // raised surface
  surface3: '#16203200', // transparent tint helper
  border: '#1B2536', // hairline borders
  borderBright: '#2A3A54', // active / focused borders

  // ── Energies ───────────────────────────────────────────────────
  energy: '#3B82F6', // Electric Blue — primary energy
  energyBright: '#60A5FA',
  energyDim: '#1E40AF',
  violet: '#8B5CF6', // Deep Violet — secondary energy
  violetBright: '#A78BFA',
  cyan: '#22D3EE', // Focus energy
  cyanBright: '#67E8F9',
  crimson: '#E23A4E', // Controlled crimson — warning
  crimsonDim: '#7F1D2A',
  gold: '#F5C542', // Legendary
  goldBright: '#FCD34D',
  green: '#34D399', // success / stable states

  // ── Text ───────────────────────────────────────────────────────
  text: '#E8EEF6', // cold white
  textSecondary: '#7D8DA6', // blue grey
  textDim: '#4A5568', // low-emphasis
  textFaint: '#2E3646', // ghost / placeholder

  // ── Rarity ─────────────────────────────────────────────────────
  rarityCommon: '#7D8DA6',
  rarityRare: '#3B82F6',
  rarityEpic: '#8B5CF6',
  rarityLegendary: '#F5C542',
  rarityMythic: '#E23A4E',

  // ── Absolutes ──────────────────────────────────────────────────
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
