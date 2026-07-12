import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** Returns the authenticated user's id, or null. */
export async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** Throws if not authenticated — for server actions. */
export async function requireUserId(): Promise<string> {
  const id = await currentUserId();
  if (!id) throw new Error("Not authenticated");
  return id;
}

export async function requireProfile() {
  const userId = await requireUserId();
  const profile = await prisma.playerProfile.findUnique({ where: { userId } });
  if (!profile) throw new Error("Profile not found");
  return profile;
}
