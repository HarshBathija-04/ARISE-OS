import type { Quest, QuestCompletion } from "@prisma/client";
import type { QuestVM } from "@/components/game/quest-board";

export function toQuestVM(q: Quest & { completion: QuestCompletion | null }): QuestVM {
  return {
    id: q.id,
    title: q.title,
    description: q.description,
    type: q.type,
    difficulty: q.difficulty,
    estMinutes: q.estMinutes,
    baseXp: q.baseXp,
    coinReward: q.coinReward,
    attributeXp: (q.attributeXp as Record<string, number>) ?? {},
    failureNote: q.failureNote,
    status: q.status,
    resolved: !!q.completion,
  };
}
