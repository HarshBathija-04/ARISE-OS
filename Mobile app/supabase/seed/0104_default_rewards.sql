-- ════════════════════════════════════════════════════════════════
-- SOLO OS — SEED: Default reward vault for a player.
-- Applied per-user. Replace :user_id or run via app on first launch.
-- The app also creates these client-side on first sync if absent.
-- ════════════════════════════════════════════════════════════════

-- Usage (SQL editor): set the target user id first.
-- \set user_id 'YOUR-AUTH-UID'

insert into rewards (user_id, name, description, coin_cost, cooldown_hours, is_custom)
select u, name, descr, cost, cd, false
from (values
  ('1 HOUR GUILT-FREE GAMING', 'One hour of gaming with zero guilt.', 150, 20),
  ('MOVIE NIGHT', 'A full movie, earned.', 300, 72),
  ('FAVOURITE FOOD', 'Order or make your favourite meal.', 250, 48),
  ('REST EVENING', 'A full evening of guilt-free rest.', 200, 72),
  ('BUY A SMALL GAMING ITEM', 'A small in-game or physical gaming item.', 800, 168),
  ('BUY A GAME', 'A full game purchase.', 3000, 720)
) as r(name, descr, cost, cd)
cross join (select :'user_id'::uuid as u) usr
on conflict do nothing;
