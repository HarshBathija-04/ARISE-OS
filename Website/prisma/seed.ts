/**
 * Seed for ASCEND//SYSTEM.
 * Creates the single player (Harsh Bathija) at Level 1 with a real starting state:
 * main quests, skill trees, habits, streaks, attributes, first daily quests.
 * Global content (achievements, titles, bosses, quest templates) is seeded once.
 *
 * Run: npm run db:seed   (or: npm run db:reset for a clean slate)
 */
import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

import { ATTRIBUTES } from "../src/lib/game-engine/attributes";
import { rankForLevel } from "../src/lib/game-engine/ranks";
import { HABITS, STREAKS } from "../src/lib/game-engine/content/habits";
import { MAIN_QUESTS } from "../src/lib/game-engine/content/main-quests";
import { SKILL_TREES } from "../src/lib/game-engine/content/skill-trees";
import { QUEST_TEMPLATES } from "../src/lib/game-engine/content/quest-templates";
import { ACHIEVEMENTS } from "../src/lib/game-engine/content/achievements";
import { TITLES } from "../src/lib/game-engine/content/titles";
import { BOSSES } from "../src/lib/game-engine/content/bosses";
import { DEFAULT_REWARDS } from "../src/lib/game-engine/content/rewards";
import { generateDailyQuests } from "../src/lib/game-engine/quest-engine";
import { gameDay, dayKey } from "../src/lib/date";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.PLAYER_EMAIL ?? "harsh004bathija@gmail.com";
  const name = process.env.PLAYER_NAME ?? "Harsh Bathija";
  const password = process.env.PLAYER_PASSWORD ?? "change-me-after-first-login";
  const passwordHash = await bcrypt.hash(password, 10);

  console.log("→ Seeding global content...");

  // ── Global: titles (needed before achievements reference them) ──
  for (const t of TITLES) {
    await prisma.title.upsert({
      where: { key: t.key },
      update: { name: t.name, description: t.description, rarity: t.rarity, xpBonusPct: t.xpBonusPct },
      create: t,
    });
  }

  // ── Global: achievements ──
  for (const a of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { key: a.key },
      update: {
        title: a.title, description: a.description, rarity: a.rarity, category: a.category,
        targetValue: a.targetValue, metric: a.metric, xpReward: a.xpReward, coinReward: a.coinReward,
        titleKey: a.titleKey ?? null, hidden: a.hidden ?? false,
      },
      create: {
        key: a.key, title: a.title, description: a.description, rarity: a.rarity, category: a.category,
        targetValue: a.targetValue, metric: a.metric, xpReward: a.xpReward, coinReward: a.coinReward,
        titleKey: a.titleKey ?? null, hidden: a.hidden ?? false,
      },
    });
  }
  console.log(`  ✓ ${ACHIEVEMENTS.length} achievements`);

  // ── Global: bosses ──
  for (const b of BOSSES) {
    await prisma.boss.upsert({
      where: { key: b.key },
      update: {
        name: b.name, tagline: b.tagline, description: b.description, maxHp: b.maxHp,
        phases: b.phases as unknown as Prisma.InputJsonValue, rewardXp: b.rewardXp, rewardCoins: b.rewardCoins,
        rewardTitle: b.rewardTitle ?? null, rarity: b.rarity,
      },
      create: {
        key: b.key, name: b.name, tagline: b.tagline, description: b.description, maxHp: b.maxHp,
        phases: b.phases as unknown as Prisma.InputJsonValue, rewardXp: b.rewardXp, rewardCoins: b.rewardCoins,
        rewardTitle: b.rewardTitle ?? null, rarity: b.rarity,
      },
    });
  }
  console.log(`  ✓ ${BOSSES.length} bosses`);

  // ── Global: quest templates ──
  for (const t of QUEST_TEMPLATES) {
    await prisma.questTemplate.upsert({
      where: { key: t.key },
      update: {
        title: t.title, description: t.description, type: t.type, difficulty: t.difficulty,
        category: t.category, estMinutes: t.estMinutes, baseXp: t.baseXp,
        attributeXp: t.attributeXp, coinReward: t.coinReward ?? 0, streakKey: t.streakKey ?? null,
        failureNote: t.failureNote ?? "",
      },
      create: {
        key: t.key, title: t.title, description: t.description, type: t.type, difficulty: t.difficulty,
        category: t.category, estMinutes: t.estMinutes, baseXp: t.baseXp,
        attributeXp: t.attributeXp, coinReward: t.coinReward ?? 0, streakKey: t.streakKey ?? null,
        failureNote: t.failureNote ?? "",
      },
    });
  }
  console.log(`  ✓ ${QUEST_TEMPLATES.length} quest templates`);

  console.log("→ Seeding player...");

  // ── User + settings + profile ──
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

  const initiate = rankForLevel(1);
  await prisma.playerProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      displayName: name,
      level: 1,
      totalXp: 0,
      currentXp: 0,
      rank: initiate.name,
      coins: 0,
    },
  });

  // ── Attributes (all start at level 1) ──
  for (const a of ATTRIBUTES) {
    await prisma.attribute.upsert({
      where: { userId_key: { userId: user.id, key: a.key } },
      update: {},
      create: { userId: user.id, key: a.key, level: 1, xp: 0, totalXp: 0 },
    });
  }

  // ── Streaks ──
  for (const s of STREAKS) {
    await prisma.streak.upsert({
      where: { userId_key: { userId: user.id, key: s.key } },
      update: {},
      create: { userId: user.id, key: s.key, title: s.title },
    });
  }

  // ── Habits ──
  for (const h of HABITS) {
    await prisma.habit.upsert({
      where: { userId_key: { userId: user.id, key: h.key } },
      update: {},
      create: {
        userId: user.id, key: h.key, title: h.title, kind: h.kind,
        streakKey: h.streakKey ?? null, private: h.private ?? false,
      },
    });
  }

  // ── Main quests + stages ──
  for (const mq of MAIN_QUESTS) {
    const created = await prisma.mainQuest.upsert({
      where: { userId_key: { userId: user.id, key: mq.key } },
      update: { title: mq.title, description: mq.description, theme: mq.theme, order: mq.order },
      create: {
        userId: user.id, key: mq.key, title: mq.title, description: mq.description,
        theme: mq.theme, order: mq.order,
      },
    });
    for (let i = 0; i < mq.stages.length; i++) {
      const st = mq.stages[i]!;
      await prisma.mainQuestStage.upsert({
        where: { mainQuestId_key: { mainQuestId: created.id, key: st.key } },
        update: { title: st.title, description: st.description, order: i, targetUnits: st.targetUnits },
        create: {
          mainQuestId: created.id, key: st.key, title: st.title, description: st.description,
          order: i, targetUnits: st.targetUnits,
        },
      });
    }
  }
  console.log(`  ✓ ${MAIN_QUESTS.length} main quests`);

  // ── Skill trees + nodes + progress (roots become AVAILABLE) ──
  for (const tree of SKILL_TREES) {
    const createdTree = await prisma.skillTree.upsert({
      where: { userId_key: { userId: user.id, key: tree.key } },
      update: { title: tree.title, domain: tree.domain },
      create: { userId: user.id, key: tree.key, title: tree.title, domain: tree.domain },
    });
    for (const node of tree.nodes) {
      const createdNode = await prisma.skillNode.upsert({
        where: { treeId_key: { treeId: createdTree.id, key: node.key } },
        update: {
          title: node.title, description: node.description, tier: node.tier,
          parentKey: node.parentKey ?? null, targetUnits: node.targetUnits ?? 100,
        },
        create: {
          treeId: createdTree.id, key: node.key, title: node.title, description: node.description,
          tier: node.tier, parentKey: node.parentKey ?? null, targetUnits: node.targetUnits ?? 100,
        },
      });
      await prisma.skillProgress.upsert({
        where: { nodeId: createdNode.id },
        update: {},
        create: {
          userId: user.id,
          nodeId: createdNode.id,
          status: node.parentKey ? "LOCKED" : "AVAILABLE",
        },
      });
    }
  }
  console.log(`  ✓ ${SKILL_TREES.length} skill trees`);

  // ── UserAchievements (progress 0) ──
  const achievements = await prisma.achievement.findMany();
  for (const a of achievements) {
    await prisma.userAchievement.upsert({
      where: { userId_achievementId: { userId: user.id, achievementId: a.id } },
      update: {},
      create: { userId: user.id, achievementId: a.id, progress: 0, unlocked: false },
    });
  }

  // ── The Initiate title, equipped by default ──
  const initiateTitle = await prisma.title.findUnique({ where: { key: "the-initiate" } });
  if (initiateTitle) {
    await prisma.userTitle.upsert({
      where: { userId_titleId: { userId: user.id, titleId: initiateTitle.id } },
      update: {},
      create: { userId: user.id, titleId: initiateTitle.id },
    });
    await prisma.playerProfile.update({
      where: { userId: user.id },
      data: { equippedTitleId: initiateTitle.id },
    });
  }

  // ── Rewards ──
  const existingRewards = await prisma.reward.count({ where: { userId: user.id } });
  if (existingRewards === 0) {
    for (const r of DEFAULT_REWARDS) {
      await prisma.reward.create({
        data: { userId: user.id, title: r.title, description: r.description, cost: r.cost, icon: r.icon, custom: false },
      });
    }
  }

  // ── First boss encounter: The 30-Day Discipline Trial ──
  const firstBoss = await prisma.boss.findUnique({ where: { key: "the-30-day-trial" } });
  if (firstBoss) {
    await prisma.bossBattle.upsert({
      where: { userId_bossId: { userId: user.id, bossId: firstBoss.id } },
      update: {},
      create: {
        userId: user.id, bossId: firstBoss.id, status: "ACTIVE",
        currentHp: firstBoss.maxHp, maxHp: firstBoss.maxHp,
      },
    });
  }

  // ── Today's daily quests (only if none exist for today) ──
  const today = gameDay();
  const existingToday = await prisma.quest.count({
    where: { userId: user.id, assignedDate: today },
  });
  if (existingToday === 0) {
    const planned = generateDailyQuests({
      dayKey: dayKey(),
      userId: user.id,
      recentCompletion: [],
      failingStreaks: [],
      distractionMinutesYesterday: 0,
      inRecovery: false,
      difficultyBias: 1,
    });
    const templates = await prisma.questTemplate.findMany();
    const tmap = new Map(templates.map((t) => [t.key, t]));
    for (const q of planned) {
      const tmpl = tmap.get(q.key);
      await prisma.quest.create({
        data: {
          userId: user.id,
          templateId: tmpl?.id ?? null,
          title: q.title,
          description: q.description,
          type: q.type,
          difficulty: q.difficulty,
          category: q.category,
          estMinutes: q.estMinutes,
          baseXp: q.baseXp,
          attributeXp: q.attributeXp,
          coinReward: q.coinReward ?? 0,
          streakKey: q.streakKey ?? null,
          failureNote: q.failureNote ?? "",
          assignedDate: today,
        },
      });
    }
    console.log(`  ✓ ${planned.length} daily quests for ${today.toISOString().slice(0, 10)}`);
  }

  // ── Welcome notification ──
  await prisma.notification.create({
    data: {
      userId: user.id,
      type: "SYSTEM",
      title: "SYSTEM ONLINE",
      body: `Welcome, ${name}. You are bound to the System at Level 1. Your ascent begins now.`,
    },
  });

  console.log(`\n✅ Seed complete. Login: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
