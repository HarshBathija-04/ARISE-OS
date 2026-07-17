"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Zap } from "lucide-react";

const LINES = [
  "> initializing arise protocol …",
  "> binding neural interface … OK",
  "> loading player manifest … OK",
  "> calibrating attribute matrix … OK",
  "> synchronizing quest engine … OK",
  "> SYSTEM ONLINE",
];

export default function BootPage() {
  const router = useRouter();
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    const timers = LINES.map((_, i) => setTimeout(() => setVisible(i + 1), 420 * (i + 1)));
    const done = setTimeout(() => router.push("/"), 420 * LINES.length + 900);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(done);
    };
  }, [router]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-void-950">
      <div className="grid-overlay absolute inset-0 opacity-40" />
      <div className="absolute inset-0 bg-radial-arc" />
      <div className="relative w-full max-w-md px-6">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 18 }}
          className="mb-8 flex flex-col items-center"
        >
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-arc-blue/10">
            <img src="/logo.png" alt="Arise OS Logo" className="h-10 w-10 object-contain" />
            <span className="absolute inset-0 animate-pulse-glow rounded-2xl ring-1 ring-arc-blue/40" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-bold tracking-tight">
            ARISE<span className="text-arc-blue">//</span>OS
          </h1>
        </motion.div>

        <div className="panel px-5 py-4 font-mono text-sm">
          <AnimatePresence>
            {LINES.slice(0, visible).map((line, i) => (
              <motion.div
                key={line}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className={i === LINES.length - 1 ? "mt-2 font-bold text-arc-cyan" : "text-slate-400"}
              >
                {line}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
