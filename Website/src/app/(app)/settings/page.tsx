import { redirect } from "next/navigation";
import { getSettings } from "@/lib/player-data";
import { createClient } from "@/lib/supabase/server";
import { Panel } from "@/components/ui/panel";
import { SettingsForm, type SettingsVM } from "./settings-form";
import { LogOut } from "lucide-react";
import { ResetButton } from "./reset-button";

export default async function SettingsPage() {
  const supabase = await createClient();
  const [settings, { data: userData }] = await Promise.all([
    getSettings(),
    supabase.auth.getUser(),
  ]);
  const user = {
    name: userData.user?.user_metadata?.name ?? "Hunter",
    email: userData.user?.email ?? "",
  };

  const vm: SettingsVM = {
    wakeTarget: settings.wakeTarget,
    sleepTarget: settings.sleepTarget,
    minSleepHours: settings.minSleepHours,
    difficultyBias: settings.difficultyBias,
    reduceMotion: settings.reduceMotion,
    aiProvider: settings.aiProvider,
    aiModel: settings.aiModel,
    resetTime: settings.resetTime,
    eveningReminderTime: settings.eveningReminderTime,
    pushEnabled: settings.pushEnabled,
    questPushEnabled: settings.questPushEnabled,
    timetableAlarmsEnabled: settings.timetableAlarmsEnabled,
    preReminderMinutes: settings.preReminderMinutes,
    alarmRepeatCount: settings.alarmRepeatCount,
    autoStartFocus: settings.autoStartFocus,
    weekendAlarms: settings.weekendAlarms,
    dndStart: settings.dndStart,
    dndEnd: settings.dndEnd,
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="sys-label">Insight</p>
        <h1 className="font-display text-2xl font-bold text-slate-100">Settings</h1>
      </div>

      <SettingsForm initial={vm} />

      <Panel className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 gap-4">
        <div>
          <div className="font-display font-semibold text-slate-100">{user.name}</div>
          <div className="text-sm text-slate-500">{user.email}</div>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <ResetButton />
          <form
            action={async () => {
              "use server";
              const sb = await createClient();
              await sb.auth.signOut();
              redirect("/login");
            }}
            className="w-full sm:w-auto"
          >
            <button type="submit" className="btn-secondary w-full sm:w-auto">
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          </form>
        </div>
      </Panel>
    </div>
  );
}
