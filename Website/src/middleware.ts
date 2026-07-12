import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Edge-safe: uses only authConfig (no Prisma). The `authorized` callback
// handles redirects to /login for unauthenticated users.
export const { auth: middleware } = NextAuth(authConfig);

export default middleware((req) => {
  // The `authorized` callback in authConfig already gates access; nothing else needed.
  void req;
});

export const config = {
  // Exclude all /api routes — they authenticate themselves (NextAuth handlers
  // under /api/auth, and Bearer-token guards on the mobile /api/* endpoints).
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
