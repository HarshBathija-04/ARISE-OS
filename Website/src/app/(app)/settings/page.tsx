import { requireUserId } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { signOut } from "@/auth";
import { Panel } from "@/components/ui/panel";
import { SettingsForm, type SettingsVM } from "./settings-form";
import { LogOut } from "lucide-react";

export default async function SettingsPage() {
  const userId = await requireUserId();
  const [settings, user] = await Promise.all([
    prisma.userSettings.findUniqueOrThrow({ where: { userId } }),
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
  ]);

  const vm: SettingsVM = {
    wakeTarget: settings.wakeTarget,
    sleepTarget: settings.sleepTarget,
    minSleepHours: settings.minSleepHours,
    difficultyBias: settings.difficultyBias,
    reduceMotion: settings.reduceMotion,
    aiProvider: settings.aiProvider,
    aiModel: settings.aiModel,
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="sys-label">Insight</p>
        <h1 className="font-display text-2xl font-bold text-slate-100">Settings</h1>
      </div>

      <SettingsForm initial={vm} />

      <Panel className="flex items-center justify-between p-5">
        <div>
          <div className="font-display font-semibold text-slate-100">{user.name}</div>
          <div className="text-sm text-slate-500">{user.email}</div>
        </div>
        <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
          <button type="submit" className="btn-danger">
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </form>
      </Panel>
    </div>
  );
}
