import { requireUserId } from "@/lib/current-user";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { getTimetable, getDayStates } from "@/lib/game-engine/timetable-service";
import { TimetableBoard, type ClientBlock } from "@/components/game/timetable-board";

export const dynamic = "force-dynamic";

export default async function TimetablePage() {
  const userId = await requireUserId();
  const [blocks, states] = await Promise.all([getTimetable(userId), getDayStates(userId)]);

  const clientBlocks: ClientBlock[] = blocks.map((b) => ({
    id: b.id,
    order: b.order,
    startHour: b.startHour,
    startMin: b.startMin,
    endHour: b.endHour,
    endMin: b.endMin,
    activity: b.activity,
    category: b.category,
    xpReward: b.xpReward,
    state: states[b.id] ?? "UPCOMING",
  }));

  return (
    <div className="space-y-6">
      <div>
        <p className="sys-label">Core</p>
        <h1 className="font-display text-2xl font-bold text-slate-100">Timetable</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your daily schedule, 5 AM – 11 PM. Start a block to log it and earn XP.
        </p>
      </div>

      <Panel glow>
        <PanelHeader label="Schedule" title="Today's Timeline" />
        <div className="p-4 sm:p-6">
          <TimetableBoard initialBlocks={clientBlocks} />
        </div>
      </Panel>
    </div>
  );
}
