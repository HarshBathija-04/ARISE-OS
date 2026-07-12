import Link from "next/link";
import { Target, Flame, EyeOff, Bell, ChevronRight, HeartPulse } from "lucide-react";
import { requireUserId } from "@/lib/current-user";
import {
  getProfileView, getAttributes, getTodayQuests, getActiveBossBattles,
  getStreaks, getPerformance, getUnusedShields, getShadowHabitStatus,
  getRecentNotifications, getOpenRecoveryQuest,
} from "@/lib/player-data";
import { toQuestVM } from "@/lib/quest-vm";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { PlayerCard } from "@/components/game/player-card";
import { QuestBoard } from "@/components/game/quest-board";
import { AttributeGrid } from "@/components/game/attribute-grid";
import { BossPanel } from "@/components/game/boss-panel";
import { ProgressBar } from "@/components/ui/bars";
import { dayKey } from "@/lib/date";

export default async function DashboardPage() {
  const userId = await requireUserId();
  const [
    profile, attributes, quests, bosses, streaks, perf, shields, shadow, notifications, recovery,
  ] = await Promise.all([
    getProfileView(userId),
    getAttributes(userId),
    getTodayQuests(userId),
    getActiveBossBattles(userId),
    getStreaks(userId),
    getPerformance(userId),
    getUnusedShields(userId),
    getShadowHabitStatus(userId),
    getRecentNotifications(userId, 6),
    getOpenRecoveryQuest(userId),
  ]);

  const questVMs = quests.map(toQuestVM);
  // "Today's Main Quest" = the highest-XP unresolved daily/main quest.
  const primary = [...quests]
    .filter((q) => !q.completion)
    .sort((a, b) => b.baseXp - a.baseXp)[0];

  const activeBoss = bosses.find((b) => b.status === "ACTIVE");
  const topStreaks = streaks.slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="sys-label">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="font-display text-2xl font-bold text-slate-100">Command Center</h1>
        </div>
        <div className="hidden font-mono text-xs text-slate-500 sm:block">day {dayKey()}</div>
      </div>

      {recovery && (
        <Link href="/recovery" className="block">
          <Panel className="border-success/20 bg-success/[0.04] p-4 transition hover:bg-success/[0.07]">
            <div className="flex items-center gap-3">
              <HeartPulse className="h-5 w-5 text-success" />
              <div className="flex-1">
                <div className="font-display font-semibold text-slate-100">Recovery quest active</div>
                <div className="text-sm text-slate-400">A short sequence is ready to help you regain control. No progress was lost.</div>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-500" />
            </div>
          </Panel>
        </Link>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left / main column */}
        <div className="space-y-6 lg:col-span-2">
          <PlayerCard
            name={profile.displayName}
            level={profile.level}
            rank={profile.rank}
            rankTier={profile.rankTier}
            currentXp={profile.currentXp}
            xpForNext={profile.xpForNext}
            title={profile.equippedTitle?.name}
            currentStreak={profile.currentStreak}
            longestStreak={profile.longestStreak}
            lifeScore={perf.life}
            shields={shields}
            coins={profile.coins}
          />

          {primary && (
            <Panel glow className="overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-arc-blue/60 to-transparent" />
              <div className="p-5">
                <div className="sys-label mb-1 flex items-center gap-2">
                  <Target className="h-3.5 w-3.5 text-arc-blue" /> Today&apos;s Priority Quest
                </div>
                <h3 className="font-display text-xl font-bold text-slate-100">{primary.title}</h3>
                <p className="mt-1 text-sm text-slate-400">{primary.description}</p>
                <div className="mt-3 flex items-center gap-4 font-mono text-xs">
                  <span className="text-arc-cyan">+{primary.baseXp} XP</span>
                  <span className="text-slate-500">{primary.estMinutes} min</span>
                  <span className="text-slate-500">RANK {primary.difficulty}</span>
                </div>
              </div>
            </Panel>
          )}

          <Panel>
            <PanelHeader label="Today" title="Daily Quests" right={
              <Link href="/quests" className="btn-ghost !py-1 text-xs">All quests <ChevronRight className="h-3 w-3" /></Link>
            } />
            <div className="p-4">
              <QuestBoard quests={questVMs} />
            </div>
          </Panel>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {activeBoss && (
            <Link href="/bosses" className="block">
              <BossPanel battle={activeBoss} compact />
            </Link>
          )}

          <Panel>
            <PanelHeader label="Performance" title="Life Scores" />
            <div className="space-y-3 p-5">
              <ScoreRow label="Discipline" value={perf.discipline} />
              <ScoreRow label="Knowledge" value={perf.knowledge} />
              <ScoreRow label="Physical" value={perf.physical} />
              <ScoreRow label="Focus" value={perf.focus} />
              <ScoreRow label="Recovery" value={perf.recovery} />
            </div>
          </Panel>

          <Panel>
            <PanelHeader label="Progression" title="Attributes" right={
              <Link href="/attributes" className="btn-ghost !py-1 text-xs">Detail</Link>
            } />
            <div className="p-4">
              <AttributeGrid attributes={attributes} />
            </div>
          </Panel>

          <Panel>
            <PanelHeader label="Consistency" title="Streaks" right={
              <Link href="/streaks" className="btn-ghost !py-1 text-xs">All</Link>
            } />
            <div className="space-y-2 p-4">
              {topStreaks.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                  <span className="text-sm text-slate-300">{s.title}</span>
                  <span className="inline-flex items-center gap-1 font-display font-semibold text-amber-300">
                    <Flame className="h-4 w-4" /> {s.current}
                  </span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <PanelHeader label="Discipline" title="Shadow Status" right={
              <Link href="/shadow" className="btn-ghost !py-1 text-xs"><EyeOff className="h-3 w-3" /></Link>
            } />
            <div className="space-y-2 p-4">
              {shadow.slice(0, 4).map((h) => (
                <div key={h.key} className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">{h.title}</span>
                  <span className="font-mono text-xs text-success">{h.streak?.current ?? 0}d clean</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <PanelHeader label="System" title="Notifications" right={<Bell className="mr-4 mt-1 h-4 w-4 text-slate-500" />} />
            <div className="space-y-2 p-4">
              {notifications.map((n) => (
                <div key={n.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                  <div className="font-mono text-[11px] uppercase tracking-widest text-arc-blue">{n.title}</div>
                  {n.body && <div className="mt-0.5 text-xs text-slate-500">{n.body}</div>}
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function ScoreRow({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm text-slate-400">{label}</span>
        <span className="font-mono text-xs text-slate-300">{value}</span>
      </div>
      <ProgressBar value={value} max={100} glow={false} />
    </div>
  );
}
