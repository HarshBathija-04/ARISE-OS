"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Clock, X, ChevronRight, CircleSlash } from "lucide-react";
import type { Difficulty, QuestStatus, QuestType } from "@prisma/client";
import { DifficultyChip } from "@/components/ui/bars";
import { EmptyState } from "@/components/ui/panel";
import { completeQuestAction } from "@/app/actions";
import { AwardToast, LevelUpOverlay, type AwardResult } from "./award-feedback";
import { cn } from "@/lib/utils";

export interface QuestVM {
  id: string;
  title: string;
  description: string;
  type: QuestType;
  difficulty: Difficulty;
  estMinutes: number;
  baseXp: number;
  coinReward: number;
  attributeXp: Record<string, number>;
  failureNote: string;
  status: QuestStatus;
  resolved: boolean;
}

const TYPE_STYLE: Record<QuestType, string> = {
  MAIN: "text-rank-gold",
  DAILY: "text-arc-blue",
  SIDE: "text-arc-cyan",
  EMERGENCY: "text-danger",
  RECOVERY: "text-success",
  BOSS: "text-rank-mythic",
  HIDDEN: "text-arc-violet",
};

export function QuestBoard({ quests }: { quests: QuestVM[] }) {
  const [items, setItems] = useState(quests);
  const [award, setAward] = useState<AwardResult | null>(null);
  const [levelAward, setLevelAward] = useState<AwardResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  function resolve(id: string, result: QuestStatus) {
    setBusyId(id);
    startTransition(async () => {
      try {
        const res = await completeQuestAction({ questId: id, result });
        const awardRes: AwardResult = {
          xpAwarded: res.xpAwarded,
          coinsAwarded: res.coinsAwarded,
          leveledUp: res.leveledUp,
          newLevel: res.newLevel,
          newRank: res.newRank,
        };
        setItems((prev) => prev.map((q) => (q.id === id ? { ...q, status: result, resolved: true } : q)));
        if (result !== "FAILED") setAward(awardRes);
        if (res.leveledUp) setLevelAward(awardRes);
      } finally {
        setBusyId(null);
      }
    });
  }

  const active = items.filter((q) => !q.resolved);
  const done = items.filter((q) => q.resolved);

  if (items.length === 0) {
    return <EmptyState title="No quests yet" hint="The System will generate your quests. Refresh the dashboard." />;
  }

  return (
    <>
      <AwardToast award={award} onDone={() => setAward(null)} />
      <LevelUpOverlay award={levelAward} onDone={() => setLevelAward(null)} />

      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {active.map((q) => (
            <motion.div
              key={q.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.2 } }}
            >
              <QuestRow
                q={q}
                busy={pending && busyId === q.id}
                onComplete={() => resolve(q.id, "COMPLETED")}
                onPartial={() => resolve(q.id, "PARTIAL")}
                onFail={() => resolve(q.id, "FAILED")}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {done.length > 0 && (
          <div className="pt-2">
            <div className="sys-label mb-2">Resolved · {done.length}</div>
            <div className="space-y-2">
              {done.map((q) => (
                <div
                  key={q.id}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-4 py-2 text-sm",
                    q.status === "FAILED"
                      ? "border-danger/20 bg-danger/5 text-slate-500"
                      : "border-success/20 bg-success/5 text-slate-400",
                  )}
                >
                  {q.status === "FAILED" ? (
                    <CircleSlash className="h-4 w-4 text-danger/70" />
                  ) : (
                    <Check className="h-4 w-4 text-success" />
                  )}
                  <span className="line-through decoration-white/20">{q.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function QuestRow({
  q,
  busy,
  onComplete,
  onPartial,
  onFail,
}: {
  q: QuestVM;
  busy: boolean;
  onComplete: () => void;
  onPartial: () => void;
  onFail: () => void;
}) {
  const [open, setOpen] = useState(false);
  const attrs = Object.entries(q.attributeXp);
  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("font-mono text-[10px] uppercase tracking-widest", TYPE_STYLE[q.type])}>
              {q.type}
            </span>
            <DifficultyChip difficulty={q.difficulty} />
            <span className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-500">
              <Clock className="h-3 w-3" /> {q.estMinutes}m
            </span>
          </div>
          <button onClick={() => setOpen((o) => !o)} className="mt-1 block text-left">
            <h4 className="font-display font-semibold text-slate-100">{q.title}</h4>
          </button>
        </div>
        <div className="text-right">
          <div className="font-mono text-sm text-arc-cyan">+{q.baseXp}</div>
          <div className="sys-label">base xp</div>
        </div>
        <button
          onClick={onComplete}
          disabled={busy}
          className="btn-primary !px-3"
          aria-label="Complete quest"
        >
          {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-arc-blue/40 border-t-arc-blue" /> : <Check className="h-4 w-4" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/[0.06]"
          >
            <div className="space-y-3 px-4 py-3">
              <p className="text-sm text-slate-400">{q.description}</p>
              {attrs.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {attrs.map(([k, v]) => (
                    <span key={k} className="chip border border-white/[0.06] bg-white/[0.02] text-slate-300">
                      {k} +{v}
                    </span>
                  ))}
                </div>
              )}
              {q.failureNote && (
                <p className="text-xs text-slate-600">
                  <span className="text-slate-500">If failed: </span>
                  {q.failureNote}
                </p>
              )}
              <div className="flex gap-2">
                <button onClick={onPartial} disabled={busy} className="btn-ghost">
                  <ChevronRight className="h-4 w-4" /> Partial (50%)
                </button>
                <button onClick={onFail} disabled={busy} className="btn-danger">
                  <X className="h-4 w-4" /> Mark Failed
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
