import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Bot } from "lucide-react";
import { Sidebar } from "@/components/nav/sidebar";
import { currentUserId } from "@/lib/current-user";
import { ensureTodayQuestsViaApi } from "@/lib/player-data";
import { RealtimeRefresher } from "@/components/realtime-refresher";
import { PushManager } from "@/components/push/push-manager";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const userId = await currentUserId();
  if (!userId) redirect("/login");

  // Make sure the player always has today's quests waiting for them.
  try {
    await ensureTodayQuestsViaApi();
  } catch {
    // Non-fatal: /v1/quests/today lazily ensures quests on read as well.
  }

  return (
    <div className="min-h-screen">
      <RealtimeRefresher />
      {/* useSearchParams requires a Suspense boundary in an RSC layout */}
      <Suspense fallback={null}>
        <PushManager />
      </Suspense>
      <Sidebar />
      <main className="px-4 pb-24 pt-20 lg:ml-64 lg:px-8 lg:pt-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>

      {/* Floating AI Guide access */}
      <Link
        href="/guide"
        className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full border border-arc-violet/40 bg-arc-violet/15 text-arc-violet shadow-glow-violet backdrop-blur-xl transition hover:scale-105 hover:bg-arc-violet/25"
        aria-label="Open The Guide"
      >
        <Bot className="h-6 w-6" />
        <span className="absolute inset-0 animate-pulse-glow rounded-full ring-1 ring-arc-violet/30" />
      </Link>
    </div>
  );
}
