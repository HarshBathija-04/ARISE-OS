"use server";

/**
 * Time Log server actions — thin wrappers over /v1/time-logs.
 * The Time Log records what the user ACTUALLY did; the backend classifies
 * each entry with AI and awards XP / skill progress per the override rules.
 */
import { z } from "zod";
import { revalidatePath } from "next/cache";

import { apiFetch } from "@/lib/api-client";

const category = z.enum([
  "STUDY",
  "CODING",
  "AIML",
  "READING",
  "WRITING",
  "FITNESS",
  "HEALTH",
  "FINANCE",
  "BUSINESS",
  "PERSONAL",
  "ENTERTAINMENT",
  "SOCIAL",
  "REST",
]);

const logInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startHour: z.number().int().min(0).max(23),
  startMin: z.number().int().min(0).max(59),
  endHour: z.number().int().min(0).max(23),
  endMin: z.number().int().min(0).max(59),
  activity: z.string().min(1).max(160),
  category: category.optional(),
  description: z.string().max(2000).optional(),
  notes: z.string().max(2000).optional(),
  mood: z.string().max(40).optional(),
  energyLevel: z.number().int().min(1).max(10).optional(),
  location: z.string().max(160).optional(),
  tags: z.array(z.string().min(1).max(40)).max(20).optional(),
});

export type TimeLogInput = z.infer<typeof logInput>;

function revalidate() {
  revalidatePath("/timetable");
  revalidatePath("/");
}

export async function createTimeLogAction(input: TimeLogInput) {
  const data = logInput.parse(input);
  const res = await apiFetch("/v1/time-logs", {
    method: "POST",
    body: JSON.stringify(data),
  });
  revalidate();
  const { ok: _ok, ...rest } = res;
  return rest as { log: any; xpAwarded: number; skillXp: number };
}

export async function updateTimeLogAction(input: { id: string; updates: Partial<TimeLogInput> }) {
  const { id, updates } = z
    .object({ id: z.string().min(1), updates: logInput.partial() })
    .parse(input);
  const { log } = await apiFetch(`/v1/time-logs/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
  revalidate();
  return log;
}

export async function deleteTimeLogAction(input: { id: string }) {
  const { id } = z.object({ id: z.string().min(1) }).parse(input);
  await apiFetch(`/v1/time-logs/${id}`, { method: "DELETE" });
  revalidate();
  return { ok: true };
}

/** AI classify + XP preview without saving (debounced from the form). */
export async function analyzeTimeLogAction(input: Omit<TimeLogInput, "tags">) {
  const data = logInput.omit({ tags: true }).parse(input);
  const res = await apiFetch("/v1/time-logs/analyze", {
    method: "POST",
    body: JSON.stringify(data),
  });
  const { ok: _ok, ...rest } = res;
  return rest as {
    classification: {
      provider: string;
      category: string;
      difficulty: string;
      productivityScore: number;
      focusScore: number;
      suggestedSkill: string;
      xpMultiplier: number;
      isProductive: boolean;
      isDeepWork: boolean;
      insights: string;
    };
    estimatedXp: number;
  };
}

export async function awardTimeLogXpAction(input: { id: string }) {
  const { id } = z.object({ id: z.string().min(1) }).parse(input);
  const res = await apiFetch("/v1/time-logs/award-xp", {
    method: "POST",
    body: JSON.stringify({ id }),
  });
  revalidate();
  const { ok: _ok, ...rest } = res;
  return rest as { xpAwarded: number; skillXp: number; reason: string };
}
