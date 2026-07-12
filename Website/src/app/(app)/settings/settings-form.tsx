"use client";

import { useState, useTransition } from "react";
import { Save } from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { updateSettingsAction } from "@/app/actions";

export interface SettingsVM {
  wakeTarget: string;
  sleepTarget: string;
  minSleepHours: number;
  difficultyBias: number;
  reduceMotion: boolean;
  aiProvider: string;
  aiModel: string;
}

export function SettingsForm({ initial }: { initial: SettingsVM }) {
  const [s, setS] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function save() {
    startTransition(async () => {
      await updateSettingsAction({
        wakeTarget: s.wakeTarget,
        sleepTarget: s.sleepTarget,
        minSleepHours: s.minSleepHours,
        difficultyBias: s.difficultyBias,
        reduceMotion: s.reduceMotion,
        aiProvider: s.aiProvider as never,
        aiModel: s.aiModel,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  const field = "w-full rounded-md border border-white/[0.08] bg-void-800/60 px-3 py-2 text-sm text-slate-200 outline-none focus:border-arc-blue/40";

  return (
    <Panel>
      <PanelHeader label="Configuration" title="System Settings" />
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <div>
          <label className="sys-label">Wake Target</label>
          <input type="time" value={s.wakeTarget} onChange={(e) => setS({ ...s, wakeTarget: e.target.value })} className={`mt-1 ${field}`} />
        </div>
        <div>
          <label className="sys-label">Sleep Target</label>
          <input type="time" value={s.sleepTarget} onChange={(e) => setS({ ...s, sleepTarget: e.target.value })} className={`mt-1 ${field}`} />
        </div>
        <div>
          <label className="sys-label">Minimum Sleep (h)</label>
          <input type="number" min={3} max={12} step={0.5} value={s.minSleepHours}
            onChange={(e) => setS({ ...s, minSleepHours: Number(e.target.value) })} className={`mt-1 ${field}`} />
        </div>
        <div>
          <label className="sys-label">Difficulty Bias ({s.difficultyBias.toFixed(2)}×)</label>
          <input type="range" min={0.5} max={2} step={0.05} value={s.difficultyBias}
            onChange={(e) => setS({ ...s, difficultyBias: Number(e.target.value) })} className="mt-3 w-full accent-arc-blue" />
        </div>
        <div>
          <label className="sys-label">AI Provider</label>
          <select value={s.aiProvider} onChange={(e) => setS({ ...s, aiProvider: e.target.value })} className={`mt-1 ${field}`}>
            <option value="none">None (local insight engine)</option>
            <option value="anthropic">Anthropic Claude</option>
            <option value="openai">OpenAI</option>
            <option value="gemini">Gemini</option>
          </select>
        </div>
        <div>
          <label className="sys-label">AI Model</label>
          <input value={s.aiModel} onChange={(e) => setS({ ...s, aiModel: e.target.value })} className={`mt-1 ${field}`} />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={s.reduceMotion} onChange={(e) => setS({ ...s, reduceMotion: e.target.checked })} className="accent-arc-blue" />
          Reduce motion / animations
        </label>
      </div>
      <div className="flex items-center gap-3 border-t border-white/[0.06] p-5">
        <button onClick={save} disabled={pending} className="btn-primary">
          <Save className="h-4 w-4" /> {pending ? "Saving…" : "Save Settings"}
        </button>
        {saved && <span className="text-sm text-success">Saved.</span>}
        <p className="ml-auto text-xs text-slate-600">API keys are set via <code className="text-slate-500">.env</code>, never stored here.</p>
      </div>
    </Panel>
  );
}
