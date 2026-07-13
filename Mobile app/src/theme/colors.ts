/**
 * SOLO OS — Centralized color system.
 *
 * "Neon Forge" — deep obsidian base with electric emerald primary,
 * molten amber accents, arctic frost text, and hot-red danger states.
 *
 * NEVER hardcode hex values in components. Import from here (or `theme`).
 */

export const colors = {
  // ── Backgrounds (The Void) ──────────────────────────────────────
  bg: '#060B14',            // primary — deep navy-black
  bgSecondary: '#0A1020',   // secondary — deep space
  surface: '#0E1628',       // panels / cards — cold navy glass
  surface2: '#141E34',      // raised surface — slightly lighter
  surface3: '#1A2844',      // elevated / hover — faint glow
  border: '#1C2D4A',        // hairline borders — navy-tinted
  borderBright: '#2A4A6E',  // active / focused borders — brighter edge

  // ── System Energies ─────────────────────────────────────────────
  energy: '#00E5A0',        // Electric Emerald — primary accent
  energyBright: '#33FFB8',  // Bright emerald
  energyDim: '#0A5E42',     // Dim emerald
  violet: '#FF6B35',        // Molten Orange — secondary accent
  violetBright: '#FF8F5E',  // Bright orange
  cyan: '#00D4FF',          // Electric Cyan — info / system online
  cyanBright: '#55E0FF',    // Bright cyan
  crimson: '#FF4757',       // Hot Red — danger / boss
  crimsonDim: '#8B1A25',    // Dim crimson
  gold: '#FFD93D',          // Bright Amber — legendary / rank
  goldBright: '#FFE570',    // Bright amber
  green: '#00E5A0',         // Success / stable states (matches primary)

  // ── Signature Colors ───────────────────────────────────────────
  systemBlue: '#00E5A0',    // Primary system accent (emerald)
  shadowViolet: '#FF6B35',  // Secondary accent (molten orange)
  monarchGold: '#FFD93D',   // Rank / sovereignty (bright amber)
  phantomCyan: '#00D4FF',   // System online / info
  dungeonGateStart: '#00E5A0', // Gate gradient start (emerald)
  dungeonGateEnd: '#00D4FF',   // Gate gradient end (cyan)

  // ── Text ────────────────────────────────────────────────────────
  text: '#E8EDF5',          // arctic frost — cold white with blue undertone
  textSecondary: '#8A9BB5', // muted blue-grey
  textDim: '#445570',       // low-emphasis — cold
  textFaint: '#243050',     // ghost / placeholder

  // ── Rarity ──────────────────────────────────────────────────────
  rarityCommon: '#8A9BB5',
  rarityRare: '#00D4FF',
  rarityEpic: '#FF6B35',
  rarityLegendary: '#FFD93D',
  rarityMythic: '#FF4757',

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
