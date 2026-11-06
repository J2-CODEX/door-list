-- Two independent cryptographically random UUID v4 values yield 244 random bits.
-- No sequential or registration identifiers appear in the public access code.
create type public.ticket_status as enum ('valid', 'used', 'revoked');
create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null unique references public.registrations(id) on delete restrict,
  code text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
    check (code ~ '^[0-9a-f]{64}$'),
  status public.ticket_status not null default 'valid',
  created_at timestamptz not null default now()
);
alter table public.tickets enable row level security;
revoke all on public.tickets from public, anon, authenticated;

create function public.issue_registration_ticket() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.tickets(registration_id) values (new.id);
  return new;
end $$;
revoke all on function public.issue_registration_ticket() from public, anon, authenticated;
create trigger registration_ticket_issuance after insert on public.registrations
for each row execute function public.issue_registration_ticket();

-- Existing confirmed registrations also receive exactly one ticket.
insert into public.tickets(registration_id) select id from public.registrations;

create or replace function public.register_attendee(p_event_id uuid, p_ticket_type_id uuid, p_name text, p_email text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare ev public.events; ticket public.ticket_types; new_registration_id uuid; normalized_email text := lower(trim(p_email));
begin
  if p_name is null or length(trim(p_name)) not between 1 and 200 or normalized_email is null or length(normalized_email) > 254 or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    return jsonb_build_object('code', 'INVALID_INPUT');
  end if;
  select * into ev from public.events where id = p_event_id for update;
  if not found or ev.status <> 'published' or (ev.starts_at at time zone 'America/Guayaquil')::date < (clock_timestamp() at time zone 'America/Guayaquil')::date then
    return jsonb_build_object('code', 'EVENT_CLOSED');
  end if;
  if exists(select 1 from public.registrations where event_id = p_event_id and email = normalized_email) then
    return jsonb_build_object('code', 'DUPLICATE');
  end if;
  select * into ticket from public.ticket_types where id = p_ticket_type_id and event_id = p_event_id;
  if not found then return jsonb_build_object('code', 'TICKET_UNAVAILABLE'); end if;
  if (select count(*) from public.registrations where ticket_type_id = ticket.id) >= ticket.capacity then
    return jsonb_build_object('code', 'TICKET_UNAVAILABLE');
  end if;
  insert into public.registrations(event_id, ticket_type_id, name, email) values(p_event_id, ticket.id, trim(p_name), normalized_email) returning id into new_registration_id;
  return jsonb_build_object('code', 'SUCCESS', 'id', new_registration_id, 'ticketCode', (select code from public.tickets where registration_id = new_registration_id));
end $$;

-- A full bearer code is the only public lookup key; never expose a list or ID lookup.
create function public.get_public_ticket(p_code text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'code', t.code, 'status', t.status,
    'name', r.name, 'email', r.email,
    'event', jsonb_build_object('title', e.title, 'starts_at', e.starts_at, 'venue', e.venue),
    'ticketType', tt.name
  )
  from public.tickets t
  join public.registrations r on r.id = t.registration_id
  join public.events e on e.id = r.event_id
  join public.ticket_types tt on tt.id = r.ticket_type_id and tt.event_id = r.event_id
  where p_code ~ '^[0-9a-f]{64}$' and t.code = p_code;
$$;
revoke all on function public.get_public_ticket(text) from public;
grant execute on function public.get_public_ticket(text) to anon, authenticated;
