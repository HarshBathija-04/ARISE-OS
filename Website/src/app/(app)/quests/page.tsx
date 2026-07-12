import { requireUserId } from "@/lib/current-user";
import { getTodayQuests } from "@/lib/player-data";
import { toQuestVM } from "@/lib/quest-vm";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { QuestBoard } from "@/components/game/quest-board";

export default async function QuestsPage() {
  const userId = await requireUserId();
  const quests = await getTodayQuests(userId);
  const vms = quests.map(toQuestVM);

  const total = quests.length;
  const done = quests.filter((q) => q.completion && q.completion.result !== "FAILED").length;

  return (
    <div className="space-y-6">
      <div>
        <p className="sys-label">Core</p>
        <h1 className="font-display text-2xl font-bold text-slate-100">Daily Quests</h1>
        <p className="mt-1 text-sm text-slate-500">
          {done}/{total} resolved today · complete quests to earn XP, coins, and attribute growth.
        </p>
      </div>

      <Panel>
        <PanelHeader label="Assigned" title="Today's Board" />
        <div className="p-4">
          <QuestBoard quests={vms} />
        </div>
      </Panel>
    </div>
  );
}
