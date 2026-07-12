"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, ArrowUp, Coins } from "lucide-react";

export interface AwardResult {
  xpAwarded: number;
  coinsAwarded: number;
  leveledUp: boolean;
  newLevel: number;
  newRank: string;
}

/** Small XP/coin toast, top-center. */
export function AwardToast({ award, onDone }: { award: AwardResult | null; onDone: () => void }) {
  return (
    <AnimatePresence>
      {award && (
        <motion.div
          key="toast"
          initial={{ opacity: 0, y: -24, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -24, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          onAnimationComplete={() => setTimeout(onDone, 1600)}
          className="pointer-events-none fixed left-1/2 top-6 z-50 -translate-x-1/2"
        >
          <div className="panel-glow flex items-center gap-3 px-5 py-3">
            <Sparkles className="h-5 w-5 text-arc-cyan" />
            <div>
              <div className="font-display text-sm font-semibold text-slate-100">QUEST COMPLETED</div>
              <div className="flex items-center gap-3 font-mono text-xs text-slate-400">
                <span className="text-arc-cyan">+{award.xpAwarded} XP</span>
                {award.coinsAwarded > 0 && (
                  <span className="inline-flex items-center gap-1 text-rank-gold">
                    <Coins className="h-3 w-3" /> +{award.coinsAwarded}
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Full-screen, extremely-rewarding level-up celebration. */
export function LevelUpOverlay({ award, onDone }: { award: AwardResult | null; onDone: () => void }) {
  const show = !!award?.leveledUp;
  return (
    <AnimatePresence>
      {show && award && (
        <motion.div
          key="levelup"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-void-950/85 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onDone}
        >
          {/* radial burst */}
          <motion.div
            className="absolute h-[520px] w-[520px] rounded-full bg-arc-violet/20 blur-3xl"
            initial={{ scale: 0.2, opacity: 0.8 }}
            animate={{ scale: 1.4, opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
          {/* rays */}
          {Array.from({ length: 12 }).map((_, i) => (
            <motion.span
              key={i}
              className="absolute h-40 w-[2px] origin-bottom bg-gradient-to-t from-transparent via-arc-blue/60 to-transparent"
              style={{ rotate: `${i * 30}deg` }}
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{ scaleY: 1, opacity: [0, 1, 0] }}
              transition={{ duration: 1, delay: 0.1 + i * 0.02 }}
            />
          ))}

          <motion.div
            className="relative text-center"
            initial={{ scale: 0.5, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 16, delay: 0.15 }}
          >
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-arc-violet/40 bg-arc-violet/10 px-4 py-1 font-mono text-xs uppercase tracking-[0.3em] text-arc-violet">
              <ArrowUp className="h-3.5 w-3.5" /> Level Increased
            </div>
            <div className="font-display text-8xl font-black text-transparent [background:linear-gradient(180deg,#fff,#8b5cff)] [-webkit-background-clip:text] [background-clip:text]">
              {award.newLevel}
            </div>
            <div className="mt-2 font-mono text-sm uppercase tracking-[0.3em] text-slate-300">
              {award.newRank}
            </div>
            <p className="mt-5 text-xs text-slate-500">tap to continue</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
