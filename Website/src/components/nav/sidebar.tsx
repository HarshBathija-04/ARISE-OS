"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, NAV_GROUPS } from "./nav-items";

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-5 px-3">
      {NAV_GROUPS.map((group) => (
        <div key={group}>
          <div className="sys-label px-3 pb-2">{group}</div>
          <div className="flex flex-col gap-0.5">
            {NAV_ITEMS.filter((i) => i.group === group).map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                    active
                      ? "bg-arc-blue/10 text-slate-100"
                      : "text-slate-400 hover:bg-white/[0.03] hover:text-slate-200",
                  )}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-arc-blue shadow-glow" />
                  )}
                  <Icon className={cn("h-4 w-4", active ? "text-arc-blue" : "text-slate-500 group-hover:text-slate-300")} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2 px-5 py-5">
      <div className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-arc-blue/40 bg-arc-blue/10 shadow-glow">
        <Zap className="h-5 w-5 text-arc-blue" />
      </div>
      <div className="leading-tight">
        <div className="font-display text-sm font-bold tracking-tight text-slate-100">
          SOLO<span className="text-arc-blue">//</span>OS
        </div>
        <div className="sys-label">Solo Protocol</div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* Desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/[0.06] bg-void-900/60 backdrop-blur-xl lg:flex">
        <Brand />
        <div className="flex-1 overflow-y-auto pb-6">
          <NavLinks />
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-white/[0.06] bg-void-900/80 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Brand />
        <button className="btn-ghost !px-2" onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-white/[0.06] bg-void-900">
            <div className="flex items-center justify-between">
              <Brand />
              <button className="btn-ghost mr-3 !px-2" onClick={() => setOpen(false)} aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pb-6">
              <NavLinks onNavigate={() => setOpen(false)} />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
