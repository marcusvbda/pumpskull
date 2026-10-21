-- Culture Check feedback (spec screen 11): both teams see how each team answered, once the phase moves to feedback.
-- The row is written by the server only at that moment (spec section 9), so it is safe in a public table.
-- Apply after 0003_one_phone_per_team.sql in the Supabase SQL editor.

alter table public.question_reveal
  add column answers jsonb not null default '[]';   -- [{team, option|null, ms, points}] one entry per team

comment on column public.question_reveal.answers is 'Per team: chosen option (null = no answer), answer time in ms, points earned.';
