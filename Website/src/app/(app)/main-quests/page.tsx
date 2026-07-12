import { requireUserId } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { MainQuestBoard, type MainQuestVM } from "./main-quest-board";

export default async function MainQuestsPage() {
  const userId = await requireUserId();
  const mainQuests = await prisma.mainQuest.findMany({
    where: { userId },
    include: { stages: { orderBy: { order: "asc" } } },
    orderBy: { order: "asc" },
  });

  const quests: MainQuestVM[] = mainQuests.map((mq) => ({
    id: mq.id,
    title: mq.title,
    description: mq.description,
    theme: mq.theme,
    stages: mq.stages.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      targetUnits: s.targetUnits,
      progress: s.progress,
      completed: s.completed,
    })),
  }));

  return (
    <div className="space-y-6">
      <div>
        <p className="sys-label">Core</p>
        <h1 className="font-display text-2xl font-bold text-slate-100">Main Quests</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your major life goals, broken into stages. Log progress on the current stage of each — clearing a
          stage grants milestone XP and coins.
        </p>
      </div>

      <MainQuestBoard quests={quests} />
    </div>
  );
}
