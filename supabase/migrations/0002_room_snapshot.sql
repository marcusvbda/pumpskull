-- Public state of one room in a single request, used by subscribeRoom (initial load, refetch after a
-- realtime event, and the polling fallback). SECURITY INVOKER: it runs with the caller's rights, so the
-- anon key still sees only the public tables. Private tables are never touched here.
-- Apply after 0001_init.sql in the Supabase SQL editor.

create or replace function public.room_snapshot(p_pin text) returns jsonb
language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'room', to_jsonb(r),
    'players', coalesce((select jsonb_agg(to_jsonb(p) order by p.joined_at, p.id)
                         from public.players p where p.room_pin = r.pin), '[]'::jsonb),
    'plays', coalesce((select jsonb_agg(to_jsonb(x) order by x.idx)
                       from public.plays x where x.room_pin = r.pin), '[]'::jsonb),
    'playResults', coalesce((select jsonb_agg(to_jsonb(x) order by x.play_idx)
                             from public.play_results x where x.room_pin = r.pin), '[]'::jsonb),
    'questionPublic', coalesce((select jsonb_agg(to_jsonb(x) order by x.play_idx)
                                from public.question_public x where x.room_pin = r.pin), '[]'::jsonb),
    'questionReveal', coalesce((select jsonb_agg(to_jsonb(x) order by x.play_idx)
                                from public.question_reveal x where x.room_pin = r.pin), '[]'::jsonb),
    'teamScores', coalesce((select jsonb_agg(to_jsonb(x) order by x.play_idx, x.team)
                            from public.team_scores x where x.room_pin = r.pin), '[]'::jsonb),
    'serverTime', now()
  )
  from public.rooms r
  where r.pin = p_pin;
$$;

revoke all on function public.room_snapshot(text) from public;
grant execute on function public.room_snapshot(text) to anon, authenticated;
