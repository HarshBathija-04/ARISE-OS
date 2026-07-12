import { requireUserId } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { Panel } from "@/components/ui/panel";
import { cn, pct } from "@/lib/utils";
import type { SkillStatus } from "@prisma/client";
import { Lock, CircleDot, Loader, CheckCircle2 } from "lucide-react";

const STATUS_META: Record<SkillStatus, { icon: typeof Lock; color: string; label: string }> = {
  LOCKED: { icon: Lock, color: "text-slate-600", label: "Locked" },
  AVAILABLE: { icon: CircleDot, color: "text-arc-blue", label: "Available" },
  IN_PROGRESS: { icon: Loader, color: "text-arc-violet", label: "In Progress" },
  MASTERED: { icon: CheckCircle2, color: "text-success", label: "Mastered" },
};

export default async function SkillsPage() {
  const userId = await requireUserId();
  const trees = await prisma.skillTree.findMany({
    where: { userId },
    include: { nodes: { orderBy: [{ tier: "asc" }, { order: "asc" }], include: { progress: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="sys-label">Progression</p>
        <h1 className="font-display text-2xl font-bold text-slate-100">Skill Trees</h1>
        <p className="mt-1 text-sm text-slate-500">Nodes unlock as you make real progress. Master one to open the next.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {trees.map((tree) => {
          const mastered = tree.nodes.filter((n) => n.progress?.status === "MASTERED").length;
          return (
            <Panel key={tree.id} className="p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-slate-100">{tree.title}</h3>
                <span className="font-mono text-xs text-slate-500">{mastered}/{tree.nodes.length}</span>
              </div>

              <div className="mt-4 space-y-1">
                {tree.nodes.map((node, i) => {
                  const status = node.progress?.status ?? "LOCKED";
                  const meta = STATUS_META[status];
                  const Icon = meta.icon;
                  const p = node.progress ? pct(node.progress.units, node.targetUnits) : 0;
                  return (
                    <div key={node.id} className="relative pl-6">
                      {i < tree.nodes.length - 1 && (
                        <span className="absolute left-[9px] top-6 h-full w-px bg-white/[0.06]" />
                      )}
                      <Icon className={cn("absolute left-0 top-1 h-4 w-4", meta.color, status === "IN_PROGRESS" && "animate-spin")} />
                      <div className="flex items-center justify-between">
                        <span className={cn("text-sm", status === "LOCKED" ? "text-slate-600" : "text-slate-200")}>
                          {node.title}
                        </span>
                        <span className={cn("font-mono text-[10px]", meta.color)}>
                          {status === "IN_PROGRESS" ? `${p}%` : meta.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">{node.description}</p>
                    </div>
                  );
                })}
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
