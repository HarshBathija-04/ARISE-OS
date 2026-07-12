"use client";

import { useState, useTransition } from "react";
import { Coins, Plus, Gift, Lock } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { purchaseRewardAction, createRewardAction } from "@/app/actions";

export interface RewardVM {
  id: string;
  title: string;
  description: string;
  cost: number;
}

export function RewardShop({ rewards, coins }: { rewards: RewardVM[]; coins: number }) {
  const [balance, setBalance] = useState(coins);
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  function buy(id: string, cost: number) {
    setBusy(id);
    startTransition(async () => {
      try {
        const res = await purchaseRewardAction({ rewardId: id });
        setBalance(res.balance);
        setMsg("Reward unlocked. Enjoy it — you earned it.");
        setTimeout(() => setMsg(null), 2500);
      } catch {
        setMsg("Not enough coins yet.");
        setTimeout(() => setMsg(null), 2500);
      } finally {
        setBusy(null);
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 rounded-lg border border-rank-gold/30 bg-rank-gold/10 px-4 py-2">
          <Coins className="h-5 w-5 text-rank-gold" />
          <span className="font-display text-xl font-bold text-rank-gold">{balance.toLocaleString()}</span>
          <span className="sys-label">coins</span>
        </div>
        <button onClick={() => setShowForm((s) => !s)} className="btn-ghost">
          <Plus className="h-4 w-4" /> Custom reward
        </button>
      </div>

      {msg && (
        <div className="rounded-lg border border-arc-blue/30 bg-arc-blue/10 px-4 py-2 text-sm text-arc-blue">{msg}</div>
      )}

      {showForm && <CreateRewardForm onDone={() => setShowForm(false)} />}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rewards.map((r) => {
          const affordable = balance >= r.cost;
          return (
            <Panel key={r.id} className="flex flex-col p-4">
              <div className="flex items-center justify-between">
                <Gift className={affordable ? "h-5 w-5 text-arc-cyan" : "h-5 w-5 text-slate-600"} />
                <span className="inline-flex items-center gap-1 font-display font-semibold text-rank-gold">
                  <Coins className="h-4 w-4" /> {r.cost}
                </span>
              </div>
              <h3 className="mt-2 font-display font-semibold text-slate-100">{r.title}</h3>
              <p className="flex-1 text-xs text-slate-500">{r.description}</p>
              <button
                onClick={() => buy(r.id, r.cost)}
                disabled={!affordable || (pending && busy === r.id)}
                className={affordable ? "btn-primary mt-3" : "btn-ghost mt-3"}
              >
                {affordable ? "Redeem" : <><Lock className="h-4 w-4" /> {r.cost - balance} more</>}
              </button>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

function CreateRewardForm({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState(100);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!title.trim()) return;
    startTransition(async () => {
      await createRewardAction({ title, description, cost });
      onDone();
    });
  }

  return (
    <Panel className="space-y-3 p-4">
      <div className="sys-label">Create a custom reward</div>
      <div className="grid gap-2 sm:grid-cols-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Reward title"
          className="rounded-md border border-white/[0.08] bg-void-800/60 px-3 py-2 text-sm text-slate-200 outline-none focus:border-arc-blue/40" />
        <input type="number" value={cost} min={1} onChange={(e) => setCost(Number(e.target.value))} placeholder="Cost"
          className="rounded-md border border-white/[0.08] bg-void-800/60 px-3 py-2 text-sm text-slate-200 outline-none focus:border-arc-blue/40" />
      </div>
      <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)"
        className="w-full rounded-md border border-white/[0.08] bg-void-800/60 px-3 py-2 text-sm text-slate-200 outline-none focus:border-arc-blue/40" />
      <div className="flex gap-2">
        <button onClick={submit} disabled={pending} className="btn-primary">Create</button>
        <button onClick={onDone} className="btn-ghost">Cancel</button>
      </div>
    </Panel>
  );
}
