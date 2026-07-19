import { requireUserId } from "@/lib/current-user";
import { buildInsights, type Insight } from "@/lib/ai/guide";
import { getAiProvider } from "@/lib/ai/provider";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Bot, TrendingUp, AlertTriangle, CheckCircle2, Lightbulb } from "lucide-react";
import { GuideChat } from "@/components/guide/guide-chat";

const KIND_META: Record<Insight["kind"], { icon: typeof Bot; color: string }> = {
  observation: { icon: TrendingUp, color: "text-arc-blue" },
  warning: { icon: AlertTriangle, color: "text-warn" },
  win: { icon: CheckCircle2, color: "text-success" },
  recommendation: { icon: Lightbulb, color: "text-arc-violet" },
};

async function generateBriefing(
  provider: ReturnType<typeof getAiProvider>,
  insights: Insight[],
  weekly: Awaited<ReturnType<typeof buildInsights>>["weekly"],
): Promise<string | null> {
  if (provider.name === "none") return null;
  const facts = insights.map((i) => `- [${i.kind}] ${i.text}`).join("\n");
  const system =
    "You are THE GUIDE, the AI core of a personal real-life RPG called Arise OS. " +
    "Speak to the player directly, in second person, in a calm, precise, slightly futuristic tone. " +
    "Rules: (1) Use ONLY the numeric facts provided — never invent numbers. " +
    "(2) No generic motivation or slogans ('you can do it'). Reference the actual data. " +
    "(3) 3–5 short sentences. End with ONE concrete action for tomorrow.";
  const user =
    `This week's data:\n` +
    `Study ${weekly.totalStudyHours}h · Focus ${weekly.totalFocusHours}h · DSA ${weekly.dsaSolved} · ` +
    `Workouts ${weekly.workoutDays}/7 · Strongest ${weekly.strongest} · Weakest ${weekly.weakest} · ` +
    `Life Score ${weekly.lifeScore}/100.\n\nDerived observations:\n${facts}\n\n` +
    `Write the System Briefing.`;
  try {
    return await provider.generate([
      { role: "system", content: system },
      { role: "user", content: user },
    ]);
  } catch {
    return null;
  }
}

export default async function GuidePage() {
  const userId = await requireUserId();
  const { insights, weekly } = await buildInsights(userId);
  const provider = getAiProvider();
  const briefing = await generateBriefing(provider, insights, weekly);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-arc-violet/40 bg-arc-violet/10 shadow-glow-violet">
          <Bot className="h-6 w-6 text-arc-violet" />
        </div>
        <div>
          <p className="sys-label">Insight · provider: {provider.name}</p>
          <h1 className="font-display text-2xl font-bold text-slate-100">The Guide</h1>
        </div>
      </div>

      {/* Chat Interface */}
      <GuideChat />

      {briefing ? (
        <Panel className="border-arc-violet/25 bg-arc-violet/[0.05] p-5 shadow-glow-violet">
          <div className="sys-label mb-2 text-arc-violet">System Briefing · {provider.name}</div>
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-100">{briefing}</p>
        </Panel>
      ) : (
        <Panel className="border-arc-violet/15 bg-arc-violet/[0.03] p-4">
          <p className="text-sm text-slate-300">
            The Guide reports <span className="text-arc-violet">what your data says</span>, not slogans. Every line below is
            derived from your own logs. Set <code className="text-slate-400">AI_PROVIDER=gemini</code> and{" "}
            <code className="text-slate-400">AI_API_KEY</code> in <code className="text-slate-400">.env</code> to have it expand these into a prose briefing.
          </p>
        </Panel>
      )}

      <div className="grid gap-3">
        {insights.map((ins, i) => {
          const meta = KIND_META[ins.kind];
          const Icon = meta.icon;
          return (
            <Panel key={i} className="flex items-start gap-3 p-4">
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${meta.color}`} />
              <div>
                <div className={`sys-label ${meta.color}`}>{ins.kind}</div>
                <p className="mt-0.5 text-sm text-slate-200">{ins.text}</p>
              </div>
            </Panel>
          );
        })}
      </div>

      <Panel>
        <PanelHeader label="Report" title={`Weekly System Report · ${weekly.periodKey}`} />
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Study" value={`${weekly.totalStudyHours}h`} />
          <Metric label="Focus" value={`${weekly.totalFocusHours}h`} />
          <Metric label="DSA solved" value={String(weekly.dsaSolved)} />
          <Metric label="Workout days" value={`${weekly.workoutDays}/7`} />
          <Metric label="Strongest" value={weekly.strongest} />
          <Metric label="Weakest" value={weekly.weakest} />
          <Metric label="Best day" value={weekly.bestDay?.slice(5) ?? "—"} />
          <Metric label="Life Score" value={String(weekly.lifeScore)} />
        </div>
        <div className="border-t border-white/[0.06] p-5">
          <div className="sys-label mb-1">Next Week&apos;s Main Objective</div>
          <p className="text-sm text-slate-200">{weekly.nextObjective}</p>
        </div>
      </Panel>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="font-display text-xl font-semibold text-slate-100">{value}</div>
      <div className="sys-label mt-0.5">{label}</div>
    </div>
  );
}
