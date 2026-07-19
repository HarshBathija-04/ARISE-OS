import Link from "next/link";
import { Panel, PanelHeader } from "@/components/ui/panel";
import {
  BookOpen, Compass, Repeat, LayoutDashboard, Target, Swords, Timer, CalendarClock,
  Hexagon, GitBranch, Skull, Trophy, Crown, Flame, EyeOff, HeartPulse, Coins,
  BarChart3, FileText, Bot, Calendar, History, Settings, ArrowRight,
} from "lucide-react";

export const dynamic = "force-static";

interface Entry {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  what: string;
  how: string;
}

interface Section {
  group: string;
  blurb: string;
  entries: Entry[];
}

const SECTIONS: Section[] = [
  {
    group: "Core",
    blurb: "Where you spend most days. Plan the work, do the work, log the work.",
    entries: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard,
        what: "Your status window — level, XP, coins, attributes, and today's snapshot at a glance.",
        how: "Start here every session. It surfaces what needs attention and links you into every other module." },
      { href: "/quests", label: "Daily Quests", icon: Target,
        what: "Small daily objectives generated for you. Resolve them to earn XP, coins, and attribute growth.",
        how: "Check them off as you complete the real action. Fresh quests appear each day automatically." },
      { href: "/main-quests", label: "Main Quests", icon: Swords,
        what: "Your major life goals, broken into stages.",
        how: "Log progress on the current stage. Clearing a stage grants milestone XP and coins." },
      { href: "/focus", label: "Focus Mode", icon: Timer,
        what: "A timer for deep-work sessions. Focused minutes convert into XP and coins.",
        how: "Start a session before real focused work, stop it when you're done. Don't leave it running idle." },
      { href: "/timetable", label: "Timetable", icon: CalendarClock,
        what: "Three tabs: Schedule (your plan), Time Log (what actually happened), and Analytics. XP and streaks reward reality, not the plan.",
        how: "Set your recurring schedule once, then log each block against it daily. The gap between plan and reality is the point." },
    ],
  },
  {
    group: "Progression",
    blurb: "The RPG layer. Everything here grows automatically from the real actions you log elsewhere.",
    entries: [
      { href: "/attributes", label: "Attributes", icon: Hexagon,
        what: "Core stats (like Discipline, Intellect, Vitality). Every real action feeds an attribute.",
        how: "You don't edit these directly — they climb as you log quests, focus, and workouts. They level faster than you do." },
      { href: "/skills", label: "Skill Trees", icon: GitBranch,
        what: "Branching nodes that unlock as you make real progress.",
        how: "Master one node to open the next. Progress is driven by your logged activity." },
      { href: "/bosses", label: "Boss Battles", icon: Skull,
        what: "Major multi-day challenges with a health bar.",
        how: "Your real actions deal the damage. Chip away over days until the boss falls." },
      { href: "/achievements", label: "Achievements", icon: Trophy,
        what: "One-time unlocks for milestones. Some are hidden until discovered.",
        how: "Nothing to click — they fire when you hit the condition. Check back to see what unlocked." },
      { href: "/titles", label: "Titles", icon: Crown,
        what: "Earned through achievements and bosses. Some grant a small XP bonus.",
        how: "Equip one title at a time. Swap freely as you earn more." },
      { href: "/streaks", label: "Streaks", icon: Flame,
        what: "Consecutive perfect days per routine. Earn a Streak Shield every 7 perfect days.",
        how: "Keep the chain alive. A shield automatically absorbs one missed day so a single slip doesn't reset you." },
    ],
  },
  {
    group: "Discipline",
    blurb: "The honest, human side. Track urges, recover from slips, and reward yourself without guilt.",
    entries: [
      { href: "/shadow", label: "Shadow Habits", icon: EyeOff,
        what: "Private tracking for habits you're trying to break. Counts urges resisted.",
        how: "Log an urge when it hits — resisting it is a win the system records. Kept discreet." },
      { href: "/recovery", label: "Recovery", icon: HeartPulse,
        what: "Turns slips into reps. Recovery is a skill you're training, not a punishment.",
        how: "After a slip, run a recovery to get back on track. The system tracks recoveries completed." },
      { href: "/rewards", label: "Reward Shop", icon: Coins,
        what: "Spend coins on real-life rewards, guilt-free. Coins are separate from XP.",
        how: "Coins come from quests, focus, and bosses. Cash them in here for things you actually want." },
    ],
  },
  {
    group: "Insight",
    blurb: "Look back at the data. Metrics, reports, and the AI Guide that reads it all for you.",
    entries: [
      { href: "/analytics", label: "Analytics", icon: BarChart3,
        what: "Transparent metrics over the last 30 days.",
        how: "Use it to spot trends — what's climbing, what's slipping." },
      { href: "/report", label: "Weekly Report", icon: FileText,
        what: "An automatic weekly summary with a life score and next week's objective.",
        how: "Read it at week's end to close one loop and set the next." },
      { href: "/guide", label: "The Guide", icon: Bot,
        what: "The AI core. Reports what your data says — never slogans.",
        how: "Every insight is derived from your own logs. Also reachable from the floating button, bottom-right, anywhere in the app." },
      { href: "/calendar", label: "Calendar", icon: Calendar,
        what: "The last 5 weeks — brightness shows routine completion per day.",
        how: "A quick heatmap read of how consistent you've been." },
      { href: "/activity", label: "Activity Log", icon: History,
        what: "A full timeline of system events and a year-long contribution heatmap.",
        how: "Scroll it to audit exactly what the system recorded and when." },
      { href: "/settings", label: "Settings", icon: Settings,
        what: "Account, alarms, and notification preferences.",
        how: "Configure reminders here so the system nudges you at the right times." },
    ],
  },
];

const STEPS = [
  { n: 1, text: "Open the Dashboard to see your current status and what needs attention today." },
  { n: 2, text: "Set your recurring plan once in Timetable → Schedule (office / WFH / weekend variants)." },
  { n: 3, text: "As the day happens, log reality: check off Daily Quests, run Focus sessions, and fill the Time Log." },
  { n: 4, text: "Watch the RPG layer respond — Attributes, Skills, Streaks, and Bosses all move from what you logged." },
  { n: 5, text: "At week's end, read the Weekly Report and let The Guide tell you what the data says." },
];

export default function ManualPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-arc-blue/40 bg-arc-blue/10 shadow-glow">
          <BookOpen className="h-6 w-6 text-arc-blue" />
        </div>
        <div>
          <p className="sys-label">Onboarding · Field Manual</p>
          <h1 className="font-display text-2xl font-bold text-slate-100">How Arise OS Works</h1>
        </div>
      </div>

      {/* The one idea */}
      <Panel className="border-arc-blue/25 bg-arc-blue/[0.05] p-5 shadow-glow">
        <div className="flex items-start gap-3">
          <Compass className="mt-0.5 h-5 w-5 shrink-0 text-arc-blue" />
          <div>
            <div className="sys-label mb-1 text-arc-blue">The one idea</div>
            <p className="text-sm leading-relaxed text-slate-100">
              Arise OS turns your real life into an RPG. You <span className="text-slate-100">log real actions</span> —
              study, focus, workouts, habits — and the game layer (XP, attributes, skills, streaks, bosses) grows
              from them <span className="text-slate-100">automatically</span>. You almost never edit stats by hand.
              The system only rewards what actually happened.
            </p>
          </div>
        </div>
      </Panel>

      {/* The core loop */}
      <Panel>
        <PanelHeader label="Getting started" title="The core loop" right={<Repeat className="mr-4 mt-1 h-4 w-4 text-slate-500" />} />
        <div className="grid gap-2 p-5">
          {STEPS.map((s) => (
            <div key={s.n} className="flex items-start gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-arc-blue/40 bg-arc-blue/10 font-display text-xs font-bold text-arc-blue">
                {s.n}
              </div>
              <p className="text-sm text-slate-200">{s.text}</p>
            </div>
          ))}
        </div>
      </Panel>

      {/* Module reference, grouped like the sidebar */}
      <div>
        <div className="sys-label mb-1 px-1">Module reference</div>
        <p className="mb-4 px-1 text-sm text-slate-500">
          Every item in the sidebar, in the same four groups. Tap any card to jump straight there.
        </p>
        <div className="space-y-6">
          {SECTIONS.map((section) => (
            <div key={section.group}>
              <div className="mb-3 px-1">
                <h2 className="font-display text-lg font-semibold text-slate-100">{section.group}</h2>
                <p className="mt-0.5 text-sm text-slate-500">{section.blurb}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {section.entries.map((e) => {
                  const Icon = e.icon;
                  return (
                    <Link key={e.href} href={e.href} className="group">
                      <Panel className="h-full p-4 transition hover:border-arc-blue/30 hover:bg-white/[0.03]">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-arc-blue" />
                          <span className="font-display text-sm font-semibold text-slate-100">{e.label}</span>
                          <ArrowRight className="ml-auto h-3.5 w-3.5 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-arc-blue" />
                        </div>
                        <p className="mt-2 text-sm text-slate-300">{e.what}</p>
                        <p className="mt-2 text-xs leading-relaxed text-slate-500">
                          <span className="text-slate-400">How:</span> {e.how}
                        </p>
                      </Panel>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer nudge */}
      <Panel className="border-arc-violet/20 bg-arc-violet/[0.04] p-4">
        <div className="flex items-start gap-3">
          <Bot className="mt-0.5 h-5 w-5 shrink-0 text-arc-violet" />
          <p className="text-sm text-slate-300">
            Stuck or curious what to do next? Open{" "}
            <Link href="/guide" className="text-arc-violet underline-offset-2 hover:underline">The Guide</Link>{" "}
            — it reads your own logs and tells you exactly where you stand.
          </p>
        </div>
      </Panel>
    </div>
  );
}
