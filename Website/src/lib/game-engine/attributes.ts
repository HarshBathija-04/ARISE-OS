import type { AttributeKey } from "@prisma/client";

export interface AttributeDef {
  key: AttributeKey;
  name: string;
  short: string;
  color: string;
  blurb: string;
}

export const ATTRIBUTES: AttributeDef[] = [
  { key: "STR", name: "Strength", short: "STR", color: "#ff6b6b", blurb: "Raw physical power built through resistance work." },
  { key: "INT", name: "Intelligence", short: "INT", color: "#39a7ff", blurb: "Depth of study, reasoning, and conceptual mastery." },
  { key: "FOC", name: "Focus", short: "FOC", color: "#8b5cff", blurb: "Sustained attention and resistance to distraction." },
  { key: "DIS", name: "Discipline", short: "DIS", color: "#f5c451", blurb: "Doing what you planned, whether or not you feel like it." },
  { key: "END", name: "Endurance", short: "END", color: "#3ce8a0", blurb: "Cardiovascular and mental stamina over long efforts." },
  { key: "CON", name: "Consistency", short: "CON", color: "#3ff0e0", blurb: "Showing up across days, weeks, and months." },
  { key: "SKL", name: "Technical Skill", short: "SKL", color: "#ff9f45", blurb: "Applied engineering ability that compounds into projects." },
  { key: "VIT", name: "Vitality", short: "VIT", color: "#ff5db1", blurb: "Sleep, recovery, energy, and overall health." },
];

export const ATTRIBUTE_KEYS: AttributeKey[] = ATTRIBUTES.map((a) => a.key);

export function attributeDef(key: AttributeKey): AttributeDef {
  return ATTRIBUTES.find((a) => a.key === key) ?? ATTRIBUTES[0]!;
}
