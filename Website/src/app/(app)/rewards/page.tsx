import { requireUserId } from "@/lib/current-user";
import { getRewards } from "@/lib/player-data";
import { prisma } from "@/lib/prisma";
import { RewardShop, type RewardVM } from "./reward-shop";

export default async function RewardsPage() {
  const userId = await requireUserId();
  const [rewards, profile] = await Promise.all([
    getRewards(userId),
    prisma.playerProfile.findUniqueOrThrow({ where: { userId } }),
  ]);

  const vms: RewardVM[] = rewards.map((r) => ({
    id: r.id, title: r.title, description: r.description, cost: r.cost,
  }));

  return (
    <div className="space-y-6">
      <div>
        <p className="sys-label">Discipline</p>
        <h1 className="font-display text-2xl font-bold text-slate-100">Reward Shop</h1>
        <p className="mt-1 text-sm text-slate-500">
          Coins are earned from quests, focus, and bosses — separate from XP. Spend them on real-life rewards, guilt-free.
        </p>
      </div>
      <RewardShop rewards={vms} coins={profile.coins} />
    </div>
  );
}
