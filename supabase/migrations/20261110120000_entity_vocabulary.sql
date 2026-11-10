-- Existing tables already have the required names. Preserve their RLS and grants.
alter index public.registrations_ticket_idx rename to registrations_ticket_type_idx;
alter table public.registrations rename constraint registrations_ticket_event_fk to registrations_ticket_type_event_fk;
alter function public.check_ticket_capacity() rename to check_ticket_type_capacity;
alter trigger ticket_capacity_check on public.ticket_types rename to ticket_type_capacity_check;

create or replace function public.get_public_registration_event(p_event_id uuid) returns jsonb
language sql security definer set search_path = '' as $$
  select jsonb_build_object('id', e.id, 'title', e.title, 'description', e.description, 'starts_at', e.starts_at, 'venue', e.venue, 'ticketTypes', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'available', greatest(0, t.capacity - (select count(*) from public.registrations r where r.ticket_type_id = t.id))) order by t.created_at, t.id) from public.ticket_types t where t.event_id = e.id), '[]'::jsonb))
  from public.events e where e.id = p_event_id and e.status = 'published' and (e.starts_at at time zone 'America/Guayaquil')::date >= (statement_timestamp() at time zone 'America/Guayaquil')::date;
$$;

create or replace function public.register_attendee(p_event_id uuid, p_ticket_type_id uuid, p_name text, p_email text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare ev public.events; ticket_type public.ticket_types; new_registration_id uuid; normalized_email text := lower(trim(p_email));
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
  select * into ticket_type from public.ticket_types where id = p_ticket_type_id and event_id = p_event_id;
  if not found then return jsonb_build_object('code', 'TICKET_UNAVAILABLE'); end if;
  if (select count(*) from public.registrations where ticket_type_id = ticket_type.id) >= ticket_type.capacity then
    return jsonb_build_object('code', 'TICKET_UNAVAILABLE');
  end if;
  insert into public.registrations(event_id, ticket_type_id, name, email) values(p_event_id, ticket_type.id, trim(p_name), normalized_email) returning id into new_registration_id;
  return jsonb_build_object('code', 'SUCCESS', 'id', new_registration_id, 'ticketCode', (select code from public.tickets where registration_id = new_registration_id));
end $$;

