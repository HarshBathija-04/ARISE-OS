import type { NextAuthConfig } from "next-auth";

const PUBLIC_PREFIXES = ["/login", "/boot"];

/**
 * Edge-safe auth config: NO database imports here (middleware runs on Edge).
 * The Credentials provider (which touches Prisma) lives in auth.ts.
 */
export const authConfig = {
  // Trust the deployment host (Vercel / custom domain) for callback URLs.
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.uid = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.uid && session.user) {
        session.user.id = token.uid as string;
      }
      return session;
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isPublic = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
      const isAuthed = !!auth?.user;
      if (isPublic) return true;
      return isAuthed; // redirects to signIn page when false
    },
  },
} satisfies NextAuthConfig;
