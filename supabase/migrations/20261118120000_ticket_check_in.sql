-- RLS remains enabled. Only this authenticated, owner-scoped function can check in.
alter table public.tickets
  add column checked_in_at timestamptz,
  add column checked_in_by uuid references auth.users(id) on delete set null;
grant select (checked_in_at) on public.tickets to authenticated;

create function public.check_in_ticket(p_event_id uuid, p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  scanned_ticket public.tickets;
  attendee_name text;
  type_name text;
  check_in_time timestamptz;
begin
  if auth.uid() is null or not exists (
    select 1 from public.events e
    where e.id = p_event_id and e.owner_id = auth.uid() and e.status = 'published'
  ) then
    return jsonb_build_object('status', 'forbidden');
  end if;
  if p_code is null or p_code !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('status', 'notFound');
  end if;
  -- Serialize scans across devices; the second scan observes 'used'.
  select t.* into scanned_ticket from public.tickets t
  join public.registrations r on r.id = t.registration_id
  where t.code = p_code and r.event_id = p_event_id for update of t;
  if not found or scanned_ticket.status = 'revoked' then
    return jsonb_build_object('status', 'notFound');
  end if;
  if scanned_ticket.status = 'used' then return jsonb_build_object('status', 'used'); end if;
  check_in_time := clock_timestamp();
  update public.tickets set status = 'used', checked_in_at = check_in_time, checked_in_by = auth.uid()
  where id = scanned_ticket.id;
  select r.name, tt.name into attendee_name, type_name from public.registrations r
  join public.ticket_types tt on tt.id = r.ticket_type_id and tt.event_id = r.event_id
  where r.id = scanned_ticket.registration_id;
  return jsonb_build_object('status', 'valid', 'name', attendee_name, 'ticketType', type_name, 'checkedInAt', check_in_time);
end $$;
revoke all on function public.check_in_ticket(uuid, text) from public, anon, authenticated;
grant execute on function public.check_in_ticket(uuid, text) to authenticated;
