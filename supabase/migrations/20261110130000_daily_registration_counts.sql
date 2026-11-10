alter table public.events add column published_at timestamptz;

-- Publication was not tracked previously. Leave historical timestamps unknown.
-- The trigger captures the first publication going forward and preserves it on edits.
create function public.track_event_publication() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.published_at := case when new.status = 'published' then statement_timestamp() else null end;
  else
    new.published_at := old.published_at;
    if old.published_at is null and old.status = 'draft' and new.status = 'published' then
      -- Existing registrations prove a historical publication whose date is unknown.
      if not exists (select 1 from public.registrations where event_id = old.id) then
        new.published_at := statement_timestamp();
      end if;
    end if;
  end if;
  return new;
end $$;

create trigger events_track_publication
before insert or update on public.events
for each row execute function public.track_event_publication();
revoke all on function public.track_event_publication() from public, anon, authenticated;

create function public.get_event_registration_counts(p_event_id uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'eventId', e.id,
    'publishedAt', e.published_at,
    'firstRegistrationAt', (select min(r.created_at) from public.registrations r where r.event_id = e.id),
    'days', coalesce((
      select jsonb_agg(jsonb_build_object('date', d.registration_date, 'count', d.registration_count) order by d.registration_date)
      from (
        select (r.created_at at time zone 'America/Guayaquil')::date as registration_date, count(*) as registration_count
        from public.registrations r
        where r.event_id = e.id and r.created_at <= statement_timestamp()
        group by (r.created_at at time zone 'America/Guayaquil')::date
      ) d
    ), '[]'::jsonb)
  )
  from public.events e
  where e.id = p_event_id and e.owner_id = (select auth.uid());
$$;

-- Keep existing RLS policies on events and registrations. Only owners get a result.
revoke all on function public.get_event_registration_counts(uuid) from public, anon;
grant execute on function public.get_event_registration_counts(uuid) to authenticated;
