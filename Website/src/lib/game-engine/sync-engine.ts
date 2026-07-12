import { prisma } from "@/lib/prisma";
import { completeQuest } from "./service";
import type { QuestStatus } from "@prisma/client";

export async function syncProfileFromMobile(userId: string, mobileProfile: any) {
  if (!mobileProfile) return;
  const current = await prisma.playerProfile.findUnique({ where: { userId } });
  if (!current) return;

  // We take the mobile profile's values for core progression stats
  // if they are higher/equal, to prevent accidental demotions.
  await prisma.playerProfile.update({
    where: { userId },
    data: {
      level: Math.max(current.level, mobileProfile.level || 1),
      totalXp: Math.max(current.totalXp, mobileProfile.lifetimeXp || 0),
      coins: Math.max(current.coins, mobileProfile.coins || 0),
      rank: mobileProfile.rank || current.rank,
    }
  });
}

export async function syncAttributesFromMobile(userId: string, mobileAttributes: any[]) {
  if (!Array.isArray(mobileAttributes)) return;
  
  for (const attr of mobileAttributes) {
    if (!attr.code) continue;
    
    // Convert mobile code ('INT', 'STR') to AttributeKey
    const key = attr.code as any;
    const current = await prisma.attribute.findUnique({
      where: { userId_key: { userId, key } }
    });

    if (current) {
      await prisma.attribute.update({
        where: { id: current.id },
        data: {
          level: Math.max(current.level, attr.level || 1),
          totalXp: Math.max(current.totalXp, attr.lifetimeXp || 0),
          xp: attr.currentXp || current.xp,
        }
      });
    } else {
      await prisma.attribute.create({
        data: {
          userId,
          key,
          level: attr.level || 1,
          totalXp: attr.lifetimeXp || 0,
          xp: attr.currentXp || 0,
        }
      });
    }
  }
}

export async function syncMissionsFromMobile(userId: string, mobileMissions: any[]) {
  if (!Array.isArray(mobileMissions)) return;

  for (const mission of mobileMissions) {
    if (!mission.id) continue;

    // Check if it exists in Postgres
    let quest = await prisma.quest.findFirst({
      where: { id: mission.id, userId }
    });

    if (!quest) {
      // It's a new mobile-generated quest. Create it in Postgres.
      const assignedDate = mission.startDate ? new Date(mission.startDate) : new Date();
      if (isNaN(assignedDate.getTime())) {
        assignedDate.setTime(Date.now());
      }
      assignedDate.setHours(0, 0, 0, 0);

      quest = await prisma.quest.create({
        data: {
          id: mission.id,
          userId,
          title: mission.title || "Unknown Mission",
          description: mission.description || "",
          type: (mission.type === "DAILY" ? "DAILY" : mission.type === "MAIN" ? "MAIN" : "SIDE") as any,
          difficulty: mission.difficulty || "C",
          category: mission.category || "GENERAL",
          estMinutes: mission.objectiveType === "DURATION_MINUTES" ? mission.targetValue : 30,
          baseXp: mission.xpReward || 0,
          attributeXp: Array.isArray(mission.attributeRewards) ? (mission.attributeRewards.reduce((acc: any, r: any) => {
            acc[r.code] = r.xp; return acc;
          }, {})) : {},
          coinReward: mission.coinReward || 0,
          status: mission.status === "COMPLETED" ? "ACTIVE" : (mission.status === "FAILED" ? "FAILED" : "ACTIVE"),
          assignedDate: assignedDate,
        }
      });
    }

    // If it exists in Postgres and is active, but is completed on mobile
    if (quest && quest.status === "ACTIVE" && mission.status === "COMPLETED") {
      try {
        await completeQuest(userId, quest.id, "COMPLETED");
      } catch (e) {
        console.error("Failed to sync mobile completion for quest", quest.id, e);
      }
    }
  }
}

export async function mergePostgresToSnapshot(userId: string, snapshotData: any): Promise<any> {
  const cloned = JSON.parse(JSON.stringify(snapshotData || { game: {} }));
  if (!cloned.game) cloned.game = {};

  const profile = await prisma.playerProfile.findUnique({ where: { userId } });
  if (profile) {
    cloned.game.profile = {
      ...(cloned.game.profile || {}),
      level: Math.max(cloned.game.profile?.level || 1, profile.level),
      lifetimeXp: Math.max(cloned.game.profile?.lifetimeXp || 0, profile.totalXp),
      coins: Math.max(cloned.game.profile?.coins || 0, profile.coins),
      rank: profile.rank,
      performance: {
        total: profile.lifeScore,
        status: profile.lifeScore >= 85 ? 'ASCENDING' :
                profile.lifeScore >= 70 ? 'STABLE' :
                profile.lifeScore >= 50 ? 'FLUCTUATING' :
                profile.lifeScore >= 30 ? 'UNSTABLE' : 'CRITICAL',
        categories: {
          discipline: profile.disciplineScore,
          knowledge: profile.knowledgeScore,
          physical: profile.physicalScore,
          focus: profile.focusScore,
          recovery: profile.recoveryScore,
        }
      }
    };
  }

  const attributes = await prisma.attribute.findMany({ where: { userId } });
  if (attributes.length > 0) {
    const existingAttrMap = new Map<string, any>((cloned.game.attributes || []).map((a: any) => [a.code, a]));
    for (const attr of attributes) {
      const code = attr.key as string;
      const existing = existingAttrMap.get(code);
      if (existing) {
        existing.level = Math.max(existing.level || 1, attr.level);
        existing.lifetimeXp = Math.max(existing.lifetimeXp || 0, attr.totalXp);
        existing.currentXp = Math.max(existing.currentXp || 0, attr.xp);
      } else {
        existingAttrMap.set(code, {
          code,
          level: attr.level,
          currentXp: attr.xp,
          requiredXp: 100 * attr.level,
          lifetimeXp: attr.totalXp,
          lastIncreaseAt: new Date().toISOString(),
        });
      }
    }
    cloned.game.attributes = Array.from(existingAttrMap.values());
  }

  // Inject web-generated quests that aren't yet in the mobile snapshot.
  // We fetch ALL active quests, plus any completed today.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const relevantQuests = await prisma.quest.findMany({
    where: { 
      userId,
      OR: [
        { status: "ACTIVE" },
        { status: "COMPLETED", updatedAt: { gte: today } }
      ]
    },
  });

  if (relevantQuests.length > 0) {
    const existingMissionIds = new Set((cloned.game.missions || []).map((m: any) => m.id));
    const newMissions = [];
    for (const q of relevantQuests) {
      if (!existingMissionIds.has(q.id)) {
        
        let attributeRewards: any[] = [];
        if (q.attributeXp && typeof q.attributeXp === 'object') {
          attributeRewards = Object.entries(q.attributeXp).map(([code, xp]) => ({
            code,
            xp: Number(xp)
          }));
        }

        newMissions.push({
          id: q.id,
          title: q.title,
          description: q.description,
          type: q.type === "DAILY" ? "DAILY" : (q.type === "MAIN" ? "MAIN" : "SIDE"),
          difficulty: q.difficulty || "C",
          category: q.category,
          status: q.status === "COMPLETED" ? "COMPLETED" : "AVAILABLE",
          objectiveType: "BOOLEAN",
          targetValue: 1,
          currentProgress: q.status === "COMPLETED" ? 1 : 0,
          xpReward: q.baseXp,
          coinReward: q.coinReward,
          attributeRewards,
          activityType: "CUSTOM",
          startDate: q.assignedDate.toISOString(),
          deadline: q.deadline ? q.deadline.toISOString() : null,
          completedAt: q.status === "COMPLETED" ? q.updatedAt.toISOString() : null,
          failureConsequence: q.failureNote,
          verificationType: "MANUAL",
          bossId: q.bossBattleId,
          createdAt: q.createdAt.toISOString(),
          updatedAt: q.updatedAt.toISOString(),
        });
      }
    }
    cloned.game.missions = [...(cloned.game.missions || []), ...newMissions];
  }

  return cloned;
}
