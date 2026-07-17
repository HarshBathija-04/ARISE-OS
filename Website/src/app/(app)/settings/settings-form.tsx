"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff, Save } from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { updateSettingsAction } from "@/app/actions";
import {
  disableWebPush,
  enableWebPush,
} from "@/components/push/push-manager";
import { pushConfigured, pushSupported } from "@/lib/push/firebase-client";

export interface SettingsVM {
  wakeTarget: string;
  sleepTarget: string;
  minSleepHours: number;
  difficultyBias: number;
  reduceMotion: boolean;
  aiProvider: string;
  aiModel: string;
  // Notifications & alarms
  resetTime: string;
  eveningReminderTime: string;
  pushEnabled: boolean;
  questPushEnabled: boolean;
  timetableAlarmsEnabled: boolean;
  preReminderMinutes: number;
  alarmRepeatCount: number;
  autoStartFocus: boolean;
  weekendAlarms: boolean;
  dndStart: string | null;
  dndEnd: string | null;
}

export function SettingsForm({ initial }: { initial: SettingsVM }) {
  const [s, setS] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [pushState, setPushState] = useState<"unknown" | "on" | "off" | "denied" | "unsupported">(
    "unknown",
  );

  useEffect(() => {
    if (!pushSupported() || !pushConfigured()) {
      setPushState("unsupported");
      return;
    }
    const enabled = localStorage.getItem("arise-push-enabled") === "true";
    if (Notification.permission === "denied") setPushState("denied");
    else setPushState(enabled && Notification.permission === "granted" ? "on" : "off");
  }, []);

  async function togglePush() {
    if (pushState === "on") {
      disableWebPush();
      setPushState("off");
      return;
    }
    const res = await enableWebPush();
    setPushState(res === "granted" ? "on" : res === "denied" ? "denied" : "unsupported");
  }

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
        resetTime: s.resetTime,
        eveningReminderTime: s.eveningReminderTime,
        pushEnabled: s.pushEnabled,
        questPushEnabled: s.questPushEnabled,
        timetableAlarmsEnabled: s.timetableAlarmsEnabled,
        preReminderMinutes: s.preReminderMinutes,
        alarmRepeatCount: s.alarmRepeatCount,
        autoStartFocus: s.autoStartFocus,
        weekendAlarms: s.weekendAlarms,
        dndStart: s.dndStart,
        dndEnd: s.dndEnd,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  const field = "w-full rounded-md border border-white/[0.08] bg-void-800/60 px-3 py-2 text-sm text-slate-200 outline-none focus:border-arc-blue/40";
  const check = "accent-arc-blue";

  return (
    <div className="space-y-6">
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
            <input type="checkbox" checked={s.reduceMotion} onChange={(e) => setS({ ...s, reduceMotion: e.target.checked })} className={check} />
            Reduce motion / animations
          </label>
        </div>
      </Panel>

      <Panel>
        <PanelHeader label="Alerts" title="Notifications &amp; Alarms" />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
            <button type="button" onClick={togglePush} disabled={pushState === "unsupported" || pushState === "denied" || pushState === "unknown"} className="btn-secondary">
              {pushState === "on" ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
              {pushState === "on" ? "Disable browser push" : "Enable browser push"}
            </button>
            <span className="text-xs text-slate-500">
              {pushState === "on" && "This browser receives push notifications."}
              {pushState === "off" && "Push is off for this browser."}
              {pushState === "denied" && "Notifications are blocked in browser settings."}
              {pushState === "unsupported" && "Push is not configured or not supported here."}
            </span>
          </div>
          <div>
            <label className="sys-label">Daily Reset Time</label>
            <input type="time" value={s.resetTime} onChange={(e) => setS({ ...s, resetTime: e.target.value })} className={`mt-1 ${field}`} />
          </div>
          <div>
            <label className="sys-label">Evening Reminder Time</label>
            <input type="time" value={s.eveningReminderTime} onChange={(e) => setS({ ...s, eveningReminderTime: e.target.value })} className={`mt-1 ${field}`} />
          </div>
          <div>
            <label className="sys-label">Pre-Reminder Lead (min)</label>
            <input type="number" min={0} max={60} value={s.preReminderMinutes}
              onChange={(e) => setS({ ...s, preReminderMinutes: Number(e.target.value) })} className={`mt-1 ${field}`} />
          </div>
          <div>
            <label className="sys-label">Alarm Repeat Attempts</label>
            <input type="number" min={1} max={10} value={s.alarmRepeatCount}
              onChange={(e) => setS({ ...s, alarmRepeatCount: Number(e.target.value) })} className={`mt-1 ${field}`} />
          </div>
          <div>
            <label className="sys-label">Do Not Disturb — Start</label>
            <input type="time" value={s.dndStart ?? ""} onChange={(e) => setS({ ...s, dndStart: e.target.value || null })} className={`mt-1 ${field}`} />
          </div>
          <div>
            <label className="sys-label">Do Not Disturb — End</label>
            <input type="time" value={s.dndEnd ?? ""} onChange={(e) => setS({ ...s, dndEnd: e.target.value || null })} className={`mt-1 ${field}`} />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={s.pushEnabled} onChange={(e) => setS({ ...s, pushEnabled: e.target.checked })} className={check} />
            Push notifications (all devices)
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={s.questPushEnabled} onChange={(e) => setS({ ...s, questPushEnabled: e.target.checked })} className={check} />
            Quest reset &amp; reminder pushes
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={s.timetableAlarmsEnabled} onChange={(e) => setS({ ...s, timetableAlarmsEnabled: e.target.checked })} className={check} />
            Timetable alarms
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={s.weekendAlarms} onChange={(e) => setS({ ...s, weekendAlarms: e.target.checked })} className={check} />
            Alarms on weekends
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={s.autoStartFocus} onChange={(e) => setS({ ...s, autoStartFocus: e.target.checked })} className={check} />
            Auto-start focus timer on alarm confirm
          </label>
        </div>
      </Panel>

      <Panel>
        <div className="flex items-center gap-3 p-5">
          <button onClick={save} disabled={pending} className="btn-primary">
            <Save className="h-4 w-4" /> {pending ? "Saving…" : "Save Settings"}
          </button>
          {saved && <span className="text-sm text-success">Saved.</span>}
          <p className="ml-auto text-xs text-slate-600">API keys are set via <code className="text-slate-500">.env</code>, never stored here.</p>
        </div>
      </Panel>
    </div>
  );
}
