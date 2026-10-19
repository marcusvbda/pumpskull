-- Pumpskull initial schema. Apply in the Supabase SQL editor.
-- Public tables: browsers READ with the anon key (RLS select allowed), never write.
-- Private tables: no policies at all, only the service-role key (server actions) can touch them.
-- All rows live at most 24 h (see the cleanup function at the bottom).

create extension if not exists pgcrypto;

-- ---------- public tables ----------

create table public.rooms (
  pin text primary key check (pin ~ '^[0-9]{4}$'),
  status text not null default 'lobby' check (status in ('lobby','playing','finished')),
  host_id uuid,
  settings jsonb not null default '{"time_minutes":4,"difficulty":"easy","rounds":2}',
  current_play int not null default 0,
  phase text not null default 'lobby' check (phase in
    ('lobby','countdown','playing','reveal','culture','culture_feedback','scoreboard','finished')),
  phase_started_at timestamptz not null default now(),
  play_started_at timestamptz,
  spirit_meter numeric not null default 0,
  created_at timestamptz not null default now()
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  room_pin text not null references public.rooms(pin) on delete cascade,
  nickname text not null check (char_length(nickname) between 2 and 12),
  avatar int not null check (avatar between 1 and 50),
  team smallint not null check (team in (1,2)),
  joined_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
create unique index players_room_nickname_uq on public.players (room_pin, lower(nickname));
create index players_room_idx on public.players (room_pin);

alter table public.rooms add constraint rooms_host_fk
  foreign key (host_id) references public.players(id) on delete set null;

-- One row per play. Pairs hold player ids; this does NOT reveal the target layout.
create table public.plays (
  room_pin text not null references public.rooms(pin) on delete cascade,
  idx int not null,
  scene text not null check (scene in ('altar','house')),
  background_id text not null,
  describer_team smallint not null check (describer_team in (1,2)),
  pairs jsonb not null default '[]',      -- [{describer_id, builder_id}]
  waiting jsonb not null default '[]',    -- [player_id]
  primary key (room_pin, idx)
);

-- Written at reveal time: per pair, per item scores and target positions.
create table public.play_results (
  room_pin text not null references public.rooms(pin) on delete cascade,
  play_idx int not null,
  results jsonb not null,                 -- [{builder_id, items:[{item_id, target:{x,y}, placed:{x,y}|null, score}], total}]
  spirit_gain numeric not null default 0,
  primary key (room_pin, play_idx)
);

-- The question WITHOUT the correct answer.
create table public.question_public (
  room_pin text not null references public.rooms(pin) on delete cascade,
  play_idx int not null,
  question_id int not null,
  question text not null,
  options jsonb not null,                 -- 4 strings
  primary key (room_pin, play_idx)
);

-- Inserted only when the phase moves to culture_feedback.
create table public.question_reveal (
  room_pin text not null references public.rooms(pin) on delete cascade,
  play_idx int not null,
  correct int not null check (correct between 0 and 3),
  fact text not null,
  primary key (room_pin, play_idx)
);

-- Team averages after each play.
create table public.team_scores (
  room_pin text not null references public.rooms(pin) on delete cascade,
  play_idx int not null,
  team smallint not null check (team in (1,2)),
  avg_points numeric not null,
  avg_ms numeric not null,
  primary key (room_pin, play_idx, team)
);

-- ---------- private tables (no RLS policies = service role only) ----------

create table public.player_tokens (
  player_id uuid primary key references public.players(id) on delete cascade,
  token text not null
);

-- Seed and target layout. Only describers may receive this, through a server action.
create table public.play_targets (
  room_pin text not null,
  play_idx int not null,
  seed text not null,
  targets jsonb not null,                 -- [{item_id, slot_id, x, y}]
  decoys jsonb not null default '[]',
  primary key (room_pin, play_idx),
  foreign key (room_pin) references public.rooms(pin) on delete cascade
);

create table public.placements (
  room_pin text not null references public.rooms(pin) on delete cascade,
  play_idx int not null,
  builder_id uuid not null references public.players(id) on delete cascade,
  items jsonb not null default '[]',      -- [{item_id, x, y}]
  finished boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (room_pin, play_idx, builder_id)
);

create table public.answers (
  room_pin text not null references public.rooms(pin) on delete cascade,
  play_idx int not null,
  player_id uuid not null references public.players(id) on delete cascade,
  option int not null check (option between 0 and 3),
  ms int not null,
  points numeric not null default 0,
  primary key (room_pin, play_idx, player_id)
);

create table public.questions_used (
  room_pin text not null references public.rooms(pin) on delete cascade,
  question_id int not null,
  primary key (room_pin, question_id)
);

-- ---------- row level security ----------

alter table public.rooms enable row level security;
alter table public.players enable row level security;
alter table public.plays enable row level security;
alter table public.play_results enable row level security;
alter table public.question_public enable row level security;
alter table public.question_reveal enable row level security;
alter table public.team_scores enable row level security;
alter table public.player_tokens enable row level security;
alter table public.play_targets enable row level security;
alter table public.placements enable row level security;
alter table public.answers enable row level security;
alter table public.questions_used enable row level security;

create policy "read rooms" on public.rooms for select using (true);
create policy "read players" on public.players for select using (true);
create policy "read plays" on public.plays for select using (true);
create policy "read play_results" on public.play_results for select using (true);
create policy "read question_public" on public.question_public for select using (true);
create policy "read question_reveal" on public.question_reveal for select using (true);
create policy "read team_scores" on public.team_scores for select using (true);
-- No policies on the private tables: anon and authenticated roles get nothing.

-- ---------- realtime ----------

alter publication supabase_realtime add table
  public.rooms, public.players, public.plays, public.play_results,
  public.question_public, public.question_reveal, public.team_scores;

-- ---------- cleanup (rooms older than 24 h; children cascade) ----------

create or replace function public.delete_old_rooms() returns void
language sql security definer as $$
  delete from public.rooms where created_at < now() - interval '24 hours';
$$;
revoke all on function public.delete_old_rooms() from public, anon, authenticated;
-- Schedule it (Dashboard > Database > Cron, or if pg_cron is enabled):
-- select cron.schedule('delete-old-rooms', '0 * * * *', 'select public.delete_old_rooms()');
