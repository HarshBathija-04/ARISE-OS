/**
 * Time Log AI classification — Gemini when configured, with a data-driven
 * keyword heuristic fallback so the module works fully without an API key
 * (same philosophy as the website's insight engine).
 *
 * The classifier answers, for a logged activity:
 *   category, difficulty, productivity/focus scores, suggested skill tree,
 *   XP multiplier, deep-work flag, quest contribution flags, and insights.
 */
import { config } from "../config.js";
import type { TimeLogCategory, TimeLogDifficulty } from "../db/tables.js";

export interface ClassifyInput {
  activity: string;
  description?: string;
  notes?: string;
  durationMinutes: number;
  /** User-picked category, if any — the AI may override it. */
  category?: TimeLogCategory;
  energyLevel?: number;
}

export interface TimeLogClassification {
  provider: "gemini" | "heuristic";
  category: TimeLogCategory;
  difficulty: TimeLogDifficulty;
  productivityScore: number; // 0–100
  focusScore: number; // 0–100
  /** Skill tree key ('' when none applies). */
  suggestedSkill: string;
  xpMultiplier: number;
  isProductive: boolean;
  isDeepWork: boolean;
  contributesToQuest: boolean;
  suggestNewQuest: boolean;
  insights: string;
  raw: Record<string, unknown>;
}

const CATEGORIES: TimeLogCategory[] = [
  "STUDY", "CODING", "AIML", "READING", "WRITING", "FITNESS", "HEALTH",
  "FINANCE", "BUSINESS", "PERSONAL", "ENTERTAINMENT", "SOCIAL", "REST",
];
const DIFFICULTIES: TimeLogDifficulty[] = ["EASY", "MEDIUM", "HARD"];

/** Skill-tree keys the backend seeds (engine/content/skill-trees.ts). */
const SKILL_KEYS = ["gate", "aiml", "fullstack", "dsa", "system-design", "data-science", "fitness"];

/** Categories that never earn XP on their own (recorded, not rewarded). */
export const NON_PRODUCTIVE_CATEGORIES: TimeLogCategory[] = ["ENTERTAINMENT", "REST", "SOCIAL"];

// ─────────────────── Heuristic fallback ───────────────────

const KEYWORDS: { pattern: RegExp; category: TimeLogCategory; skill: string }[] = [
  { pattern: /\b(ai|ml|machine learning|deep learning|neural|llm|model|dataset|pytorch|tensorflow)\b/i, category: "AIML", skill: "aiml" },
  { pattern: /\b(dsa|leetcode|algorithm|data structure|competitive)\b/i, category: "CODING", skill: "dsa" },
  { pattern: /\b(system design|architecture|scalab|distributed)\b/i, category: "CODING", skill: "system-design" },
  { pattern: /\b(cod|program|develop|built|building|debug|frontend|backend|api|app|website|landing page|ui|navbar|auth|deploy|refactor|flutter|react|node)\w*\b/i, category: "CODING", skill: "fullstack" },
  { pattern: /\b(study|gate|exam|lecture|revision|course|assignment|class|homework)\b/i, category: "STUDY", skill: "gate" },
  { pattern: /\b(data science|pandas|visualization|eda|statistics)\b/i, category: "AIML", skill: "data-science" },
  { pattern: /\b(read|book|paper|article|blog)\w*\b/i, category: "READING", skill: "" },
  { pattern: /\b(writ|blog post|journal|essay|documentation)\w*\b/i, category: "WRITING", skill: "" },
  { pattern: /\b(gym|workout|run|running|jog|cardio|lift|exercise|yoga|sport|walk)\w*\b/i, category: "FITNESS", skill: "fitness" },
  { pattern: /\b(meditat|sleep|doctor|therapy|health|nap|rest)\w*\b/i, category: "HEALTH", skill: "" },
  { pattern: /\b(budget|invest|finance|tax|bank|money)\w*\b/i, category: "FINANCE", skill: "" },
  { pattern: /\b(startup|business|client|meeting|pitch|market|entrepreneur)\w*\b/i, category: "BUSINESS", skill: "" },
  { pattern: /\b(game|gaming|movie|series|netflix|youtube|reels|scroll|tv|anime)\w*\b/i, category: "ENTERTAINMENT", skill: "" },
  { pattern: /\b(friend|family|party|hangout|call|chat|social)\w*\b/i, category: "SOCIAL", skill: "" },
  { pattern: /\b(break|chill|relax|idle)\w*\b/i, category: "REST", skill: "" },
];

const PRODUCTIVE_DEFAULTS: Partial<Record<TimeLogCategory, { productivity: number; focus: number; multiplier: number; difficulty: TimeLogDifficulty }>> = {
  STUDY: { productivity: 80, focus: 75, multiplier: 1.2, difficulty: "MEDIUM" },
  CODING: { productivity: 85, focus: 80, multiplier: 1.3, difficulty: "MEDIUM" },
  AIML: { productivity: 85, focus: 80, multiplier: 1.4, difficulty: "HARD" },
  READING: { productivity: 70, focus: 70, multiplier: 1.0, difficulty: "EASY" },
  WRITING: { productivity: 75, focus: 75, multiplier: 1.1, difficulty: "MEDIUM" },
  FITNESS: { productivity: 75, focus: 60, multiplier: 1.1, difficulty: "MEDIUM" },
  HEALTH: { productivity: 60, focus: 50, multiplier: 0.8, difficulty: "EASY" },
  FINANCE: { productivity: 65, focus: 60, multiplier: 1.0, difficulty: "MEDIUM" },
  BUSINESS: { productivity: 80, focus: 70, multiplier: 1.3, difficulty: "HARD" },
  PERSONAL: { productivity: 50, focus: 40, multiplier: 0.7, difficulty: "EASY" },
  ENTERTAINMENT: { productivity: 10, focus: 20, multiplier: 0, difficulty: "EASY" },
  SOCIAL: { productivity: 25, focus: 25, multiplier: 0, difficulty: "EASY" },
  REST: { productivity: 20, focus: 10, multiplier: 0, difficulty: "EASY" },
};

function heuristicClassify(input: ClassifyInput): TimeLogClassification {
  const text = `${input.activity} ${input.description ?? ""} ${input.notes ?? ""}`;
  let category: TimeLogCategory = input.category ?? "PERSONAL";
  let skill = "";
  for (const kw of KEYWORDS) {
    if (kw.pattern.test(text)) {
      category = kw.category;
      skill = kw.skill;
      break;
    }
  }
  // Respect an explicit user category when the keywords found nothing better.
  if (input.category && category === "PERSONAL") category = input.category;

  const d = PRODUCTIVE_DEFAULTS[category] ?? { productivity: 50, focus: 40, multiplier: 0.7, difficulty: "EASY" as TimeLogDifficulty };
  const isProductive = !NON_PRODUCTIVE_CATEGORIES.includes(category) && d.multiplier > 0;
  // 45+ uninterrupted productive minutes ≈ a deep-work session.
  const isDeepWork = isProductive && input.durationMinutes >= 45 && d.focus >= 70;

  return {
    provider: "heuristic",
    category,
    difficulty: input.durationMinutes >= 120 && d.difficulty === "MEDIUM" ? "HARD" : d.difficulty,
    productivityScore: d.productivity,
    focusScore: d.focus,
    suggestedSkill: skill,
    xpMultiplier: d.multiplier,
    isProductive,
    isDeepWork,
    contributesToQuest: isProductive,
    suggestNewQuest: false,
    insights: "",
    raw: {},
  };
}

// ─────────────────── Gemini ───────────────────

const SYSTEM_PROMPT = `You are the activity classifier for Arise OS, a Solo Leveling–style productivity RPG.
Given a user's logged real-world activity, respond with ONLY a JSON object (no markdown fences) with keys:
category: one of ${CATEGORIES.join(", ")}
difficulty: one of EASY, MEDIUM, HARD
productivityScore: integer 0-100 (how productive/valuable this activity was)
focusScore: integer 0-100 (estimated focus quality)
suggestedSkill: best matching skill tree key from [${SKILL_KEYS.join(", ")}] or "" if none
xpMultiplier: number 0-2 (0 for pure entertainment/rest, ~1 for normal productive work, up to 2 for hard deep work)
isProductive: boolean (false for entertainment, rest, idle socialising)
isDeepWork: boolean (sustained focused cognitive work ≥45min)
contributesToQuest: boolean (could this count toward a daily quest like coding/study/exercise)
suggestNewQuest: boolean (is this a recurring-looking effort worth formalising as a quest)
insights: one or two short sentences of coaching feedback (habit spotted, improvement suggestion, schedule recommendation)`;

async function geminiClassify(input: ClassifyInput): Promise<TimeLogClassification | null> {
  const body = {
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: JSON.stringify({
              activity: input.activity,
              description: input.description ?? "",
              notes: input.notes ?? "",
              durationMinutes: input.durationMinutes,
              userPickedCategory: input.category ?? null,
              energyLevel: input.energyLevel ?? null,
            }),
          },
        ],
      },
    ],
    generationConfig: {
      maxOutputTokens: 2048,
      temperature: 0.2,
      responseMimeType: "application/json",
      // Classification is simple — skip "thinking" so the token budget goes
      // to the answer (thinking models otherwise burn it and return nothing).
      thinkingConfig: { thinkingBudget: 0 },
    },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.AI_MODEL}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": config.AI_API_KEY },
    body: JSON.stringify(body),
    // Never let a slow model hang the request path.
    signal: AbortSignal.timeout(20_000),
  }).catch(() => null);
  if (!res || !res.ok) return null;

  const data = (await res.json().catch(() => null)) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  } | null;
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text.replace(/^```json?\s*|\s*```$/g, ""));
  } catch {
    return null;
  }

  const category = CATEGORIES.includes(parsed.category as TimeLogCategory)
    ? (parsed.category as TimeLogCategory)
    : (input.category ?? "PERSONAL");
  const difficulty = DIFFICULTIES.includes(parsed.difficulty as TimeLogDifficulty)
    ? (parsed.difficulty as TimeLogDifficulty)
    : "MEDIUM";
  const clamp = (v: unknown, lo: number, hi: number, dflt: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt;
  };
  const suggested = String(parsed.suggestedSkill ?? "");

  return {
    provider: "gemini",
    category,
    difficulty,
    productivityScore: Math.round(clamp(parsed.productivityScore, 0, 100, 50)),
    focusScore: Math.round(clamp(parsed.focusScore, 0, 100, 50)),
    suggestedSkill: SKILL_KEYS.includes(suggested) ? suggested : "",
    xpMultiplier: clamp(parsed.xpMultiplier, 0, 2, 1),
    isProductive: Boolean(parsed.isProductive),
    isDeepWork: Boolean(parsed.isDeepWork),
    contributesToQuest: Boolean(parsed.contributesToQuest),
    suggestNewQuest: Boolean(parsed.suggestNewQuest),
    insights: String(parsed.insights ?? "").slice(0, 1000),
    raw: parsed,
  };
}

/** Classify a logged activity — Gemini when configured, heuristic otherwise. */
export async function classifyTimeLog(input: ClassifyInput): Promise<TimeLogClassification> {
  if (config.AI_PROVIDER === "gemini" && config.AI_API_KEY) {
    const result = await geminiClassify(input);
    if (result) return result;
  }
  return heuristicClassify(input);
}
