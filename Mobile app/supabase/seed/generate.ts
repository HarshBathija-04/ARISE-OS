// Generates supabase/seed/0103_achievements.sql from the canonical TS catalog.
// Run: node --experimental-strip-types supabase/seed/generate.ts
// (Node 22.6+ / 24 strips TS types natively.)
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { ALL_ACHIEVEMENTS } from '../../src/constants/achievements.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

const esc = (s: unknown) => String(s).replace(/'/g, "''");
const rows = ALL_ACHIEVEMENTS.map((a, i) => {
  const title = a.unlocksTitleKey ? `'${esc(a.unlocksTitleKey)}'` : 'null';
  return `  ('${esc(a.key)}','${esc(a.name)}','${esc(a.description)}','${a.rarity}','${esc(a.metric)}',${a.threshold},${title},${a.coinReward},${i + 1})`;
});

const sql = `-- ════════════════════════════════════════════════════════════════
-- SOLO OS — SEED: Achievements (${ALL_ACHIEVEMENTS.length} definitions)
-- AUTO-GENERATED from src/constants/achievements.ts by generate.ts.
-- Do not edit by hand.
-- ════════════════════════════════════════════════════════════════

insert into achievements (key, name, description, rarity, metric, threshold, unlocks_title_key, coin_reward, sort_order) values
${rows.join(',\n')}
on conflict (key) do update set
  name=excluded.name, description=excluded.description, rarity=excluded.rarity,
  metric=excluded.metric, threshold=excluded.threshold,
  unlocks_title_key=excluded.unlocks_title_key, coin_reward=excluded.coin_reward,
  sort_order=excluded.sort_order;
`;

writeFileSync(join(__dirname, '0103_achievements.sql'), sql);
console.log(`Generated 0103_achievements.sql with ${ALL_ACHIEVEMENTS.length} achievements.`);
