import { requireUserId } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { TitleList, type TitleVM } from "./title-list";

export default async function TitlesPage() {
  const userId = await requireUserId();
  const [titles, owned, profile] = await Promise.all([
    prisma.title.findMany(),
    prisma.userTitle.findMany({ where: { userId } }),
    prisma.playerProfile.findUniqueOrThrow({ where: { userId } }),
  ]);
  const ownedSet = new Set(owned.map((o) => o.titleId));

  const vms: TitleVM[] = titles
    .map((t) => ({
      id: t.id, name: t.name, description: t.description, rarity: t.rarity,
      xpBonusPct: t.xpBonusPct, owned: ownedSet.has(t.id),
    }))
    .sort((a, b) => Number(b.owned) - Number(a.owned));

  return (
    <div className="space-y-6">
      <div>
        <p className="sys-label">Progression</p>
        <h1 className="font-display text-2xl font-bold text-slate-100">Titles</h1>
        <p className="mt-1 text-sm text-slate-500">Earned through achievements and bosses. Equip one — some grant a small XP bonus.</p>
      </div>
      <TitleList titles={vms} equippedId={profile.equippedTitleId} />
    </div>
  );
}
