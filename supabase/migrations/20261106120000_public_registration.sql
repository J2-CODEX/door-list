create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  ticket_type_id uuid not null,
  name text not null check (length(trim(name)) between 1 and 200),
  email text not null check (length(email) <= 254 and email = lower(trim(email)) and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  created_at timestamptz not null default now(),
  unique (event_id, email)
);
alter table public.ticket_types add constraint ticket_types_event_id_id_unique unique (event_id, id);
alter table public.registrations add constraint registrations_ticket_event_fk foreign key (event_id, ticket_type_id) references public.ticket_types(event_id, id) on delete restrict;
create index registrations_ticket_idx on public.registrations(ticket_type_id);
alter table public.registrations enable row level security;
revoke all on public.registrations from anon, authenticated;
grant select on public.registrations to authenticated;
create policy registrations_owner_select on public.registrations for select to authenticated using (exists (select 1 from public.events e where e.id = event_id and e.owner_id = (select auth.uid())));

create function public.get_public_registration_event(p_event_id uuid) returns jsonb
language sql security definer set search_path = '' as $$
  select jsonb_build_object('id', e.id, 'title', e.title, 'description', e.description, 'starts_at', e.starts_at, 'venue', e.venue, 'tickets', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'available', greatest(0, t.capacity - (select count(*) from public.registrations r where r.ticket_type_id = t.id))) order by t.created_at, t.id) from public.ticket_types t where t.event_id = e.id), '[]'::jsonb))
  from public.events e where e.id = p_event_id and e.status = 'published' and (e.starts_at at time zone 'America/Guayaquil')::date >= (statement_timestamp() at time zone 'America/Guayaquil')::date;
$$;

create function public.register_attendee(p_event_id uuid, p_ticket_type_id uuid, p_name text, p_email text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare ev public.events; ticket public.ticket_types; registration_id uuid; normalized_email text := lower(trim(p_email));
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
  insert into public.registrations(event_id, ticket_type_id, name, email) values(p_event_id, ticket.id, trim(p_name), normalized_email) returning id into registration_id;
  return jsonb_build_object('code', 'SUCCESS', 'id', registration_id);
end $$;
revoke all on function public.get_public_registration_event(uuid) from public;
revoke all on function public.register_attendee(uuid, uuid, text, text) from public;
grant execute on function public.get_public_registration_event(uuid), public.register_attendee(uuid, uuid, text, text) to anon, authenticated;

-- The allocation trigger already serializes ticket edits with registration on the event row.
create or replace function public.check_ticket_capacity() returns trigger
language plpgsql security definer set search_path = '' as $$
declare event_limit integer; allocated bigint;
begin
  select capacity into event_limit from public.events where id = new.event_id for update;
  if tg_op = 'UPDATE' and new.event_id <> old.event_id and exists(select 1 from public.registrations where ticket_type_id = old.id) then
    raise exception 'No se puede mover una entrada con registros' using errcode = '23514';
  end if;
  if new.capacity < (select count(*) from public.registrations where ticket_type_id = new.id) then
    raise exception 'El aforo no puede ser menor que los registros existentes' using errcode = '23514';
  end if;
  select coalesce(sum(capacity), 0) into allocated from public.ticket_types where event_id = new.event_id and id <> new.id;
  if allocated + new.capacity > event_limit then
    raise exception 'La suma de aforos de las entradas supera el límite del evento' using errcode = '23514';
  end if;
  return new;
end $$;
