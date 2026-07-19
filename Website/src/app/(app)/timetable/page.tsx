import Link from "next/link";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { getTimeLogAnalytics, getTimeLogs, getTimetableData } from "@/lib/player-data";
import { TimetableBoard, type ClientBlock } from "@/components/game/timetable-board";
import { TimeLogBoard, type ClientTimeLog } from "@/components/game/time-log-board";
import { TimeLogAnalyticsPanel } from "@/components/game/time-log-analytics";
import type { TimetableDayType } from "@/lib/game-types";

export const dynamic = "force-dynamic";

const DAY_PARAM_MAP: Record<string, Exclude<TimetableDayType, "ALL">> = {
  office: "OFFICE",
  wfh: "WFH",
  weekend: "WEEKEND",
};

/** Default variant: WEEKEND on Sat/Sun (Asia/Kolkata), OFFICE otherwise. */
function defaultDayType(): Exclude<TimetableDayType, "ALL"> {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
  }).format(new Date());
  return weekday === "Sat" || weekday === "Sun" ? "WEEKEND" : "OFFICE";
}

function todayKey(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

type Tab = "schedule" | "log" | "analytics";

const TABS: { key: Tab; label: string }[] = [
  { key: "schedule", label: "Schedule" },
  { key: "log", label: "Time Log" },
  { key: "analytics", label: "Analytics" },
];

export default async function TimetablePage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string; tab?: string; date?: string; view?: string }>;
}) {
  const { day, tab: tabParam, date: dateParam, view } = await searchParams;
  const dayType = DAY_PARAM_MAP[day?.toLowerCase() ?? ""] ?? defaultDayType();
  const tab: Tab = tabParam === "log" ? "log" : tabParam === "analytics" ? "analytics" : "schedule";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateParam ?? "") ? dateParam! : todayKey();
  const history = view === "history";

  return (
    <div className="space-y-6">
      <div>
        <p className="sys-label">Core</p>
        <h1 className="font-display text-2xl font-bold text-slate-100">Timetable</h1>
        <p className="mt-1 text-sm text-slate-500">
          The schedule is the plan — the Time Log is what actually happened. XP, streaks and
          analytics reward reality.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/timetable?tab=${t.key}${t.key === "schedule" && day ? `&day=${day}` : ""}`}
            className={`flex-1 rounded-lg px-3 py-1.5 text-center font-display text-xs font-semibold uppercase tracking-wider transition ${
              tab === t.key
                ? "border border-arc-violet/40 bg-arc-violet/10 text-arc-violet"
                : "border border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "schedule" && <ScheduleTab dayType={dayType} />}
      {tab === "log" && <TimeLogTab date={date} history={history} />}
      {tab === "analytics" && <AnalyticsTab />}
    </div>
  );
}

async function ScheduleTab({ dayType }: { dayType: Exclude<TimetableDayType, "ALL"> }) {
  const { blocks, states, excuses } = await getTimetableData(dayType);

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
    dayType: (b.dayType ?? "ALL") as ClientBlock["dayType"],
    state: (states[b.id] ?? "UPCOMING") as ClientBlock["state"],
    excuseReason: excuses[b.id],
  }));

  return (
    <Panel glow>
      <PanelHeader label="Schedule" title="Today's Timeline" />
      <div className="p-4 sm:p-6">
        <TimetableBoard key={dayType} initialBlocks={clientBlocks} dayType={dayType} />
      </div>
    </Panel>
  );
}

async function TimeLogTab({ date, history }: { date: string; history: boolean }) {
  // History view: no date filter — the API returns the most recent logs
  // across all days (up to 200), grouped by day client-side.
  const logs = (await getTimeLogs(history ? undefined : date)) as ClientTimeLog[];
  return (
    <Panel glow>
      <PanelHeader label="Time Log" title="What Actually Happened" />
      <div className="p-4 sm:p-6">
        <TimeLogBoard key={history ? "history" : date} initialLogs={logs} date={date} history={history} />
      </div>
    </Panel>
  );
}

async function AnalyticsTab() {
  const analytics = await getTimeLogAnalytics({ days: 7 });
  return (
    <Panel glow>
      <PanelHeader label="Analytics" title="Planned vs Actual" />
      <div className="p-4 sm:p-6">
        <TimeLogAnalyticsPanel analytics={analytics} />
      </div>
    </Panel>
  );
}
