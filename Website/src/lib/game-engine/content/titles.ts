import type { Rarity } from "@prisma/client";

export interface TitleDef {
  key: string;
  name: string;
  description: string;
  rarity: Rarity;
  xpBonusPct: number; // tiny, balanced
}

export const TITLES: TitleDef[] = [
  { key: "the-initiate", name: "The Initiate", description: "You answered the System's call.", rarity: "COMMON", xpBonusPct: 0 },
  { key: "the-consistent", name: "The Consistent", description: "Seven days without breaking the chain.", rarity: "RARE", xpBonusPct: 0.01 },
  { key: "focus-hunter", name: "Focus Hunter", description: "You hunt distraction and win.", rarity: "RARE", xpBonusPct: 0.01 },
  { key: "algorithm-slayer", name: "Algorithm Slayer", description: "The Algorithm Guardian fell to you.", rarity: "LEGENDARY", xpBonusPct: 0.03 },
  { key: "iron-will", name: "Iron Will", description: "The body obeys the mind.", rarity: "EPIC", xpBonusPct: 0.02 },
  { key: "the-unyielding", name: "The Unyielding", description: "Thirty days. No surrender.", rarity: "MYTHIC", xpBonusPct: 0.05 },
  { key: "deep-work-master", name: "Deep Work Master", description: "Master of sustained attention.", rarity: "EPIC", xpBonusPct: 0.02 },
  { key: "the-ascendant", name: "The Ascendant", description: "Momentum became identity.", rarity: "LEGENDARY", xpBonusPct: 0.03 },
  { key: "the-unstuck", name: "The Unstuck", description: "You defeated The Procrastinator.", rarity: "EPIC", xpBonusPct: 0.02 },
  { key: "digital-silence", name: "Digital Silence", description: "You silenced the endless scroll.", rarity: "EPIC", xpBonusPct: 0.02 },
  { key: "gate-challenger", name: "GATE Challenger", description: "You broke through The Gatekeeper.", rarity: "LEGENDARY", xpBonusPct: 0.03 },
  { key: "the-sovereign", name: "The Sovereign", description: "Level 100. You rule the system that once ruled you.", rarity: "MYTHIC", xpBonusPct: 0.05 },
];
