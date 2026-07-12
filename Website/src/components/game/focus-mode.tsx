"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Play, Square, Pause, Timer as TimerIcon } from "lucide-react";
import { startFocusAction, completeFocusAction } from "@/app/actions";
import { AwardToast, LevelUpOverlay, type AwardResult } from "./award-feedback";

const CATEGORIES = [
  { key: "GATE", label: "GATE" },
  { key: "DSA", label: "DSA" },
  { key: "AIML", label: "AI / ML" },
  { key: "FULLSTACK", label: "Full Stack" },
  { key: "DATASCIENCE", label: "Data Science" },
  { key: "SYSTEMDESIGN", label: "System Design" },
  { key: "PROJECT", label: "Project Work" },
] as const;

const DURATIONS = [25, 50, 90];

const SYSTEM_MESSAGES = [
  "Attention is the currency of ascension. Spend it here.",
  "No notifications. No feeds. Only the work in front of you.",
  "Depth compounds. Stay in the shaft.",
  "The System is watching your focus, not your intentions.",
];

type Phase = "setup" | "running" | "review" | "done";

export function FocusMode({ initialCategory }: { initialCategory?: string }) {
  const [phase, setPhase] = useState<Phase>("setup");
  const [category, setCategory] = useState<string>(initialCategory ?? "GATE");
  const [planned, setPlanned] = useState(50);
  const [custom, setCustom] = useState(50);
  const [remaining, setRemaining] = useState(0);
  const [paused, setPaused] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [award, setAward] = useState<AwardResult | null>(null);
  const [levelAward, setLevelAward] = useState<AwardResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [elapsedMin, setElapsedMin] = useState(0);
  const startedRef = useRef<number>(0);
  const msg = useRef(SYSTEM_MESSAGES[0]);

  useEffect(() => {
    if (phase !== "running" || paused) return;
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(id);
          stop();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, paused]);

  /** Stop the timer and move to the review step (no XP awarded yet). */
  function stop() {
    const mins = Math.max(0, Math.round((Date.now() - startedRef.current) / 60000));
    setElapsedMin(mins);
    setPhase("review");
  }

  async function begin() {
    setBusy(true);
    try {
      const { sessionId } = await startFocusAction({ category, plannedMinutes: planned });
      setSessionId(sessionId);
      startedRef.current = Date.now();
      msg.current = SYSTEM_MESSAGES[Math.floor(Math.random() * SYSTEM_MESSAGES.length)];
      setRemaining(planned * 60);
      setPhase("running");
    } finally {
      setBusy(false);
    }
  }

  async function submit(result: "COMPLETE" | "PARTIAL" | "ABANDONED") {
    if (!sessionId) return;
    setBusy(true);
    try {
      const res = await completeFocusAction({ sessionId, actualMinutes: elapsedMin, result });
      const a: AwardResult = {
        xpAwarded: res.xpAwarded, coinsAwarded: res.coinsAwarded,
        leveledUp: res.leveledUp, newLevel: res.newLevel, newRank: res.newRank,
      };
      if (res.xpAwarded > 0) setAward(a);
      if (res.leveledUp) setLevelAward(a);
      setPhase("done");
    } finally {
      setBusy(false);
    }
  }

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const progress = planned > 0 ? 1 - remaining / (planned * 60) : 0;

  return (
    <>
      <AwardToast award={award} onDone={() => setAward(null)} />
      <LevelUpOverlay award={levelAward} onDone={() => setLevelAward(null)} />

      {phase === "setup" && (
        <div className="mx-auto max-w-lg space-y-6">
          <div>
            <div className="sys-label mb-2">Discipline</div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setCategory(c.key)}
                  className={`chip border px-3 py-1.5 ${
                    category === c.key
                      ? "border-arc-blue/50 bg-arc-blue/15 text-arc-blue"
                      : "border-white/[0.06] bg-white/[0.02] text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="sys-label mb-2">Duration</div>
            <div className="flex gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setPlanned(d)}
                  className={`flex-1 rounded-lg border py-3 font-display text-lg font-semibold transition ${
                    planned === d
                      ? "border-arc-blue/50 bg-arc-blue/10 text-arc-blue shadow-glow"
                      : "border-white/[0.06] bg-white/[0.02] text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {d}m
                </button>
              ))}
              <div className={`flex flex-1 items-center gap-1 rounded-lg border px-2 ${
                !DURATIONS.includes(planned) ? "border-arc-blue/50 bg-arc-blue/10" : "border-white/[0.06] bg-white/[0.02]"
              }`}>
                <input
                  type="number" min={5} max={240} value={custom}
                  onChange={(e) => { const v = Number(e.target.value); setCustom(v); setPlanned(v); }}
                  className="w-full bg-transparent text-center font-display text-lg font-semibold text-slate-200 outline-none"
                />
                <span className="text-xs text-slate-500">m</span>
              </div>
            </div>
          </div>

          <button onClick={begin} disabled={busy} className="btn-primary w-full py-3">
            <Play className="h-4 w-4" /> Enter Focus
          </button>
        </div>
      )}

      {phase === "running" && (
        <div className="mx-auto flex max-w-md flex-col items-center gap-8 py-8">
          <div className="sys-label">{category} · deep work</div>
          <div className="relative flex h-72 w-72 items-center justify-center">
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
              <motion.circle
                cx="50" cy="50" r="46" fill="none" stroke="#39a7ff" strokeWidth="3" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 46}
                strokeDashoffset={2 * Math.PI * 46 * (1 - progress)}
                style={{ filter: "drop-shadow(0 0 6px rgba(57,167,255,0.6))" }}
              />
            </svg>
            <div className="text-center">
              <div className="font-display text-6xl font-bold tabular-nums text-slate-100">{mm}:{ss}</div>
              <div className="sys-label mt-1">remaining</div>
            </div>
          </div>
          <p className="max-w-xs text-center text-sm italic text-slate-500">“{msg.current}”</p>
          <div className="flex gap-3">
            <button onClick={() => setPaused((p) => !p)} className="btn-ghost">
              {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              {paused ? "Resume" : "Pause"}
            </button>
            <button onClick={stop} disabled={busy} className="btn-primary">
              <Square className="h-4 w-4" /> End Session
            </button>
          </div>
        </div>
      )}

      {phase === "review" && (
        <div className="mx-auto max-w-md space-y-5 py-8 text-center">
          <TimerIcon className="mx-auto h-10 w-10 text-arc-cyan" />
          <h3 className="font-display text-xl font-bold text-slate-100">
            {elapsedMin} active minute{elapsedMin === 1 ? "" : "s"} on {category}
          </h3>
          <p className="text-sm text-slate-400">Did you complete your objective?</p>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => submit("COMPLETE")} disabled={busy} className="btn-primary flex-col !py-4">Yes</button>
            <button onClick={() => submit("PARTIAL")} disabled={busy} className="btn-violet flex-col !py-4">Partially</button>
            <button onClick={() => submit("ABANDONED")} disabled={busy} className="btn-ghost flex-col !py-4">No</button>
          </div>
          <p className="text-xs text-slate-600">
            XP scales with active minutes and this answer — under 10 active minutes earns nothing, so the timer can&apos;t be farmed.
          </p>
        </div>
      )}

      {phase === "done" && (
        <div className="mx-auto max-w-md space-y-5 py-8 text-center">
          <TimerIcon className="mx-auto h-10 w-10 text-arc-cyan" />
          <h3 className="font-display text-xl font-bold text-slate-100">Session logged</h3>
          <p className="text-sm text-slate-400">Your focus has been recorded and rewarded.</p>
          <button onClick={() => setPhase("setup")} className="btn-primary">Log another session</button>
        </div>
      )}
    </>
  );
}
