import type { Rarity } from "@prisma/client";

export interface BossPhase {
  name: string;
  threshold: number; // fraction of HP remaining where this phase begins (1 → 0)
  note: string;
}

export interface BossDef {
  key: string;
  name: string;
  tagline: string;
  description: string;
  maxHp: number;
  phases: BossPhase[];
  rewardXp: number;
  rewardCoins: number;
  rewardTitle?: string; // title key
  rarity: Rarity;
}

export const BOSSES: BossDef[] = [
  {
    key: "the-procrastinator", name: "The Procrastinator",
    tagline: "It feeds on 'later'.",
    description: "A slow, heavy entity that grows fat on postponed intentions. Land damage by completing productive work across consecutive days.",
    maxHp: 700,
    phases: [
      { name: "Fog", threshold: 1, note: "The haze of 'I'll start tomorrow'." },
      { name: "Resistance", threshold: 0.6, note: "It pushes back as momentum builds." },
      { name: "Collapse", threshold: 0.25, note: "Its grip is failing." },
    ],
    rewardXp: 1200, rewardCoins: 60, rewardTitle: "the-unstuck", rarity: "EPIC",
  },
  {
    key: "the-distraction-beast", name: "The Distraction Beast",
    tagline: "A thousand tiny screens.",
    description: "Every reel and short feeds it. Starve it: each fully clean day deals heavy damage; a relapse lets it recover.",
    maxHp: 500,
    phases: [
      { name: "Swarm", threshold: 1, note: "Endless scroll." },
      { name: "Withdrawal", threshold: 0.5, note: "The urge spikes, then fades." },
      { name: "Silence", threshold: 0.2, note: "Your attention returns to you." },
    ],
    rewardXp: 900, rewardCoins: 45, rewardTitle: "digital-silence", rarity: "EPIC",
  },
  {
    key: "the-algorithm-guardian", name: "The Algorithm Guardian",
    tagline: "Guards the gate of mastery.",
    description: "A construct of pure logic. Each solved DSA problem chips its armor. Fifty problems will bring it down.",
    maxHp: 750,
    phases: [
      { name: "Warden", threshold: 1, note: "Basic patterns." },
      { name: "Sentinel", threshold: 0.5, note: "Harder problems appear." },
      { name: "Core", threshold: 0.2, note: "Only real understanding lands hits." },
    ],
    rewardXp: 1300, rewardCoins: 65, rewardTitle: "algorithm-slayer", rarity: "LEGENDARY",
  },
  {
    key: "the-gatekeeper", name: "The Gatekeeper",
    tagline: "One subject. Prove it.",
    description: "Barring the path to GATE. Complete one full GATE subject and its PYQs to break through.",
    maxHp: 900,
    phases: [
      { name: "Trial", threshold: 1, note: "Learn the subject." },
      { name: "Examination", threshold: 0.4, note: "PYQs test true depth." },
      { name: "Judgment", threshold: 0.15, note: "Final questions." },
    ],
    rewardXp: 1600, rewardCoins: 80, rewardTitle: "gate-challenger", rarity: "LEGENDARY",
  },
  {
    key: "the-iron-trial", name: "The Iron Trial",
    tagline: "Thirty sessions of iron.",
    description: "A test of the body's discipline. Each workout deals damage. Thirty workouts end it.",
    maxHp: 600,
    phases: [
      { name: "Ache", threshold: 1, note: "The body resists." },
      { name: "Adaptation", threshold: 0.5, note: "Strength begins to build." },
      { name: "Forged", threshold: 0.2, note: "Iron discipline." },
    ],
    rewardXp: 1000, rewardCoins: 55, rewardTitle: "iron-will", rarity: "EPIC",
  },
  {
    key: "the-30-day-trial", name: "The 30-Day Discipline Trial",
    tagline: "Hold the line for a month.",
    description: "The ultimate early boss. Maintain your core routine for 30 days. Each fully completed day deals heavy damage.",
    maxHp: 1500,
    phases: [
      { name: "Ignition", threshold: 1, note: "Days 1–10: build the habit." },
      { name: "The Wall", threshold: 0.55, note: "Days 11–20: motivation fades, discipline carries you." },
      { name: "Identity", threshold: 0.2, note: "Days 21–30: this is simply who you are now." },
    ],
    rewardXp: 2500, rewardCoins: 120, rewardTitle: "the-unyielding", rarity: "MYTHIC",
  },
];
