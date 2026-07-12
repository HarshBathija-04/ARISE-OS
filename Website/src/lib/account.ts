/**
 * Account bootstrap shared by the seed script and the mobile `/api/auth/register`
 * endpoint. Creates the minimum viable player state so a freshly-registered user
 * can log in on either frontend and have a working profile.
 */
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ATTRIBUTES } from "@/lib/game-engine/attributes";
import { STREAKS } from "@/lib/game-engine/content/habits";
import { rankForLevel } from "@/lib/game-engine/ranks";

export interface NewAccount {
  email: string;
  password: string;
  name: string;
}

/**
 * Create a user + settings + profile + attributes + streaks. Idempotent per
 * email (upserts). Returns the user id.
 */
export async function bootstrapAccount({ email, password, name }: NewAccount): Promise<string> {
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { name },
    create: { email, name, passwordHash },
  });

  await prisma.userSettings.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });

  await prisma.playerProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      displayName: name,
      level: 1,
      totalXp: 0,
      currentXp: 0,
      rank: rankForLevel(1).name,
      coins: 0,
    },
  });

  for (const a of ATTRIBUTES) {
    await prisma.attribute.upsert({
      where: { userId_key: { userId: user.id, key: a.key } },
      update: {},
      create: { userId: user.id, key: a.key, level: 1, xp: 0, totalXp: 0 },
    });
  }

  for (const s of STREAKS) {
    await prisma.streak.upsert({
      where: { userId_key: { userId: user.id, key: s.key } },
      update: {},
      create: { userId: user.id, key: s.key, title: s.title },
    });
  }

  return user.id;
}
