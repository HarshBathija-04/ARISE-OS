/**
 * POST /api/auth/register  — create an account and return a bearer token.
 * Body: { email, password, name }  →  { ok, token, user }
 */
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { bootstrapAccount } from "@/lib/account";
import { signMobileToken, jsonError, CORS_HEADERS, corsPreflight } from "@/lib/api-auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).max(60),
});

export function OPTIONS() {
  return corsPreflight();
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Valid email, name, and a 6+ char password are required");
  }

  const { email, password, name } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return jsonError("An account with that email already exists", 409);

  const userId = await bootstrapAccount({ email, password, name });
  const token = await signMobileToken(userId);
  return Response.json(
    { ok: true, token, user: { id: userId, email, name } },
    { status: 201, headers: CORS_HEADERS },
  );
}
