-- ════════════════════════════════════════════════════════════════
-- SOLO OS — 0010 Level table population + new-user bootstrap
-- ════════════════════════════════════════════════════════════════

-- Populate the 100-level XP table using the tuned curve:
--   xp_required(L) = round(10 * L^1.55) + 10 * L      (L = 1..99)
-- Total lifetime XP to reach L100 ≈ 537,000, which is ~1.5 years at a strong
-- sustained pace (~1000 XP/day) and ~2.5 years at a moderate pace (~600/day).
-- (Kept in exact sync with src/game-engine/level-engine.ts.)
do $$
declare
  l int;
  req bigint;
  cum bigint := 0;
  r rank_name;
begin
  delete from player_levels;
  for l in 1..100 loop
    if l = 100 then
      req := 0; -- max level, no further requirement
    else
      req := round(10 * power(l, 1.55)) + 10 * l;
    end if;

    r := case
      when l <= 10 then 'INITIATE'
      when l <= 20 then 'AWAKENED'
      when l <= 35 then 'VANGUARD'
      when l <= 50 then 'ASCENDANT'
      when l <= 65 then 'ELITE'
      when l <= 80 then 'APEX'
      when l <= 90 then 'TRANSCENDENT'
      when l <= 99 then 'PARAGON'
      else 'SOVEREIGN'
    end::rank_name;

    insert into player_levels(level, xp_required, cumulative_xp, rank)
    values (l, req, cum, r);

    cum := cum + req;
  end loop;
end $$;

-- ── Derive level & rank from lifetime xp (authoritative) ─────────
create or replace function soloos_level_from_xp(p_xp bigint)
returns table(level int, rank rank_name)
language sql stable as $$
  select pl.level, pl.rank
  from player_levels pl
  where pl.cumulative_xp <= p_xp
  order by pl.level desc
  limit 1;
$$;

-- ── New user bootstrap: create all baseline rows ─────────────────
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  a attribute_code;
  s streak_code;
  h shadow_habit_code;
begin
  insert into profiles(id, email) values (new.id, new.email)
    on conflict (id) do nothing;

  insert into player_profiles(user_id, display_name)
    values (new.id, coalesce(new.raw_user_meta_data->>'display_name', 'PLAYER'))
    on conflict (user_id) do nothing;

  insert into user_settings(user_id) values (new.id)
    on conflict (user_id) do nothing;

  -- 8 attributes
  foreach a in array enum_range(null::attribute_code) loop
    insert into attributes(user_id, code) values (new.id, a)
      on conflict (user_id, code) do nothing;
  end loop;

  -- 8 streaks
  foreach s in array enum_range(null::streak_code) loop
    insert into streaks(user_id, code) values (new.id, s)
      on conflict (user_id, code) do nothing;
  end loop;

  -- 7 shadow habits (porn/masturbation flagged sensitive)
  foreach h in array enum_range(null::shadow_habit_code) loop
    insert into shadow_habits(user_id, code, sensitive)
      values (new.id, h, h in ('PORNOGRAPHY','MASTURBATION'))
      on conflict (user_id, code) do nothing;
  end loop;

  -- default notification channels
  insert into notification_preferences(user_id, channel, schedule) values
    (new.id,'DAILY_MISSIONS','05:00'),
    (new.id,'STREAK_WARNINGS',null),
    (new.id,'FOCUS',null),
    (new.id,'RECOVERY',null),
    (new.id,'SYSTEM_EVENTS',null)
    on conflict (user_id, channel) do nothing;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
