/**
 * Token-based auth for the mobile frontend.
 *
 * The website itself authenticates via NextAuth (JWT in an httpOnly cookie),
 * which the React Native app cannot use. Mobile clients instead call
 * `/api/auth/login` to obtain a signed bearer token and send it back as
 * `Authorization: Bearer <token>` on every `/api/*` request.
 *
 * Tokens are signed with the same `AUTH_SECRET` used by NextAuth, via `jose`
 * (already a transitive dependency of next-auth), so there is a single secret
 * to manage.
 */
import { SignJWT, jwtVerify } from "jose";

const ISSUER = "solo-os";
const AUDIENCE = "solo-os-mobile";
const TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

/** Sign a bearer token for a given user id. */
export async function signMobileToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(secretKey());
}

/**
 * Verify the `Authorization: Bearer <token>` header on an incoming request.
 * Returns the user id, or null when the token is missing / invalid / expired.
 */
export async function verifyBearer(req: Request): Promise<string | null> {
  const header = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

/** Standard JSON responses so every mobile route speaks the same shape. */
export function jsonOk(data: Record<string, unknown> = {}): Response {
  return Response.json({ ok: true, ...data });
}

export function jsonError(error: string, status = 400): Response {
  return Response.json({ ok: false, error }, { status });
}

/** Guard helper: returns the userId or an error Response to return directly. */
export async function requireBearer(
  req: Request,
): Promise<{ userId: string } | { error: Response }> {
  const userId = await verifyBearer(req);
  if (!userId) return { error: jsonError("Not authenticated", 401) };
  return { userId };
}

/** Permissive CORS headers for cross-origin mobile calls. */
export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function corsPreflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
