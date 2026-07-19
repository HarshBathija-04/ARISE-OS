import { NextRequest } from "next/server";
import { requireUserId } from "@/lib/current-user";
import { getAiProvider } from "@/lib/ai/provider";
import { buildInsights } from "@/lib/ai/guide";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const { message } = await req.json();

    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "Invalid message" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const provider = getAiProvider();
    if (provider.name === "none") {
      return new Response(
        JSON.stringify({
          error: "AI provider not configured. Set AI_PROVIDER=gemini and AI_API_KEY in .env",
        }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Fetch user's data for context
    const { insights, weekly } = await buildInsights(userId);
    const insightsSummary = insights.map((i) => `- [${i.kind}] ${i.text}`).join("\n");

    const systemPrompt =
      "You are THE GUIDE, the AI core of Arise OS — a personal real-life RPG system. " +
      "You have access to the player's complete data: XP, attributes, streaks, quests, focus sessions, and time logs. " +
      "Speak directly to the player in second person, calm and precise. " +
      "Rules: " +
      "(1) Reference ONLY the numeric facts provided — never invent data. " +
      "(2) No generic motivation or platitudes. Stay grounded in their actual logs. " +
      "(3) Be concise but thorough. If they ask 'how do I improve X', give 2-3 specific, actionable steps based on their data. " +
      "(4) You understand the entire Arise OS system: quests, attributes (Discipline, Intellect, Vitality, Focus, Social, Creativity), " +
      "timetable (schedule vs reality), boss battles, streaks & shields, shadow habits, recovery mode, and the reward shop.";

    const contextPrompt =
      `\n\nCurrent player data:\n` +
      `This week: Study ${weekly.totalStudyHours}h · Focus ${weekly.totalFocusHours}h · DSA ${weekly.dsaSolved} · ` +
      `Workouts ${weekly.workoutDays}/7 · Strongest ${weekly.strongest} · Weakest ${weekly.weakest} · ` +
      `Life Score ${weekly.lifeScore}/100.\n\n` +
      `Active insights:\n${insightsSummary}\n\n` +
      `Player question: ${message}`;

    const response = await provider.generate([
      { role: "system", content: systemPrompt },
      { role: "user", content: contextPrompt },
    ]);

    if (!response) {
      return new Response(
        JSON.stringify({ error: "Failed to generate response" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ response }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
