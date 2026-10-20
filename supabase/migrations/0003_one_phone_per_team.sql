-- One phone per team (spec v1, 2026-10-20). A room holds exactly 2 phones: one row in players per phone.
-- No nickname, no avatar, no pairs, no waiting players. Culture Check team scores are sums, not averages.
-- Apply after 0002_room_snapshot.sql in the Supabase SQL editor. Rooms live 24 h, so old rows do not matter:
-- the first statement clears them so the new constraints apply cleanly.

delete from public.rooms;

-- ---------- players: one row per phone ----------

drop index if exists public.players_room_nickname_uq;
alter table public.players drop column nickname;
alter table public.players drop column avatar;

-- At most one phone per team in a room. This is what really stops a third phone, even if two join at once.
create unique index players_room_team_uq on public.players (room_pin, team);

-- ---------- plays: the describing team is enough ----------

alter table public.plays drop column pairs;
alter table public.plays drop column waiting;

-- ---------- team_scores: sum of points and total answer time per team ----------

alter table public.team_scores rename column avg_points to points;
alter table public.team_scores rename column avg_ms to total_ms;
comment on table public.team_scores is 'Culture Check total per team after each play (sum of points, total answer time).';
comment on table public.play_results is 'Written at reveal time: per item scores and target positions of the one build of the play.';
