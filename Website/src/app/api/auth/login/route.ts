/**
 * POST /api/auth/login  — mobile bearer-token login.
 * Body: { email, password }  →  { ok, token, user }
 */
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signMobileToken, jsonError, CORS_HEADERS, corsPreflight } from "@/lib/api-auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
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
  if (!parsed.success) return jsonError("Email and password are required");

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return jsonError("Invalid credentials", 401);

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return jsonError("Invalid credentials", 401);

  const token = await signMobileToken(user.id);
  return Response.json(
    { ok: true, token, user: { id: user.id, email: user.email, name: user.name } },
    { headers: CORS_HEADERS },
  );
}
