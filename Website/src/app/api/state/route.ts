/**
 * Per-user game-state snapshot for cross-device sync.
 *
 * GET /api/state  → { ok, snapshot: { data, revision, updatedAt } | null }
 * PUT /api/state  → push a snapshot; body { data, revision } → { ok, revision }
 *
 * Conflict policy: last-write-wins guarded by `revision`. A push whose
 * `revision` is not strictly greater than the stored one is rejected with the
 * current server snapshot so the client can reconcile.
 */
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBearer, jsonOk, jsonError, CORS_HEADERS, corsPreflight } from "@/lib/api-auth";

export function OPTIONS() {
  return corsPreflight();
}

export async function GET(req: Request) {
  const auth = await requireBearer(req);
  if ("error" in auth) return auth.error;
  const snapshot = await prisma.gameStateSnapshot.findUnique({ where: { userId: auth.userId } });
  return Response.json(
    { ok: true, snapshot: snapshot ? { data: snapshot.data, revision: snapshot.revision, updatedAt: snapshot.updatedAt } : null },
    { headers: CORS_HEADERS },
  );
}

const schema = z.object({
  data: z.record(z.string(), z.unknown()),
  revision: z.number().int().min(0),
});

export async function PUT(req: Request) {
  const auth = await requireBearer(req);
  if ("error" in auth) return auth.error;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid snapshot payload");
  const { data, revision } = parsed.data;

  const existing = await prisma.gameStateSnapshot.findUnique({ where: { userId: auth.userId } });
  if (existing && revision <= existing.revision) {
    return Response.json(
      {
        ok: false,
        error: "stale_revision",
        snapshot: { data: existing.data, revision: existing.revision, updatedAt: existing.updatedAt },
      },
      { status: 409, headers: CORS_HEADERS },
    );
  }

  const saved = await prisma.gameStateSnapshot.upsert({
    where: { userId: auth.userId },
    update: { data: data as never, revision },
    create: { userId: auth.userId, data: data as never, revision },
  });
  return jsonOk({ revision: saved.revision });
}
