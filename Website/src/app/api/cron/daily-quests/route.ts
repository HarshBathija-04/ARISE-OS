/**
 * GET /api/cron/daily-quests — daily quest roll-over.
 *
 * Invoked by Vercel Cron at 18:30 UTC (= 00:00 IST). Vercel attaches
 * `Authorization: Bearer ${CRON_SECRET}` automatically. For every player we call
 * the idempotent `ensureTodayQuests`, so today's randomized set exists the moment
 * the day begins — no page load required. Safe to call more than once a day.
 *
 * Also reachable manually for testing with the same bearer secret.
 */
import { prisma } from "@/lib/prisma";
import { ensureTodayQuests } from "@/lib/game-engine/service-extra";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ ok: false, error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const header = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (header !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({ select: { id: true } });
  const results: { userId: string; created: number }[] = [];
  for (const u of users) {
    try {
      const res = await ensureTodayQuests(u.id);
      results.push({ userId: u.id, created: res.created });
    } catch (e) {
      console.error("cron daily-quests failed for user", u.id, e);
    }
  }

  return Response.json({ ok: true, count: results.length, results });
}
