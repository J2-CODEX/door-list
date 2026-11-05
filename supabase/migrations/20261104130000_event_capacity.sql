-- Preserve existing ticket allocations when adding a limit to existing events.
alter table public.events add column capacity integer;
update public.events e set capacity = greatest(100, coalesce((select sum(t.capacity) from public.ticket_types t where t.event_id = e.id), 0));
alter table public.events alter column capacity set not null;
alter table public.events add constraint events_capacity_positive check (capacity > 0);

create function public.check_ticket_capacity() returns trigger
language plpgsql set search_path = public as $$
declare event_limit integer; allocated bigint;
begin
  -- Serialize changes to ticket allocations for the same event.
  select capacity into event_limit from public.events where id = new.event_id for update;
  select coalesce(sum(capacity), 0) into allocated from public.ticket_types
    where event_id = new.event_id and id <> new.id;
  if allocated + new.capacity > event_limit then
    raise exception 'La suma de aforos de las entradas supera el límite del evento' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger ticket_capacity_check before insert or update of capacity, event_id on public.ticket_types
  for each row execute function public.check_ticket_capacity();

create function public.check_event_capacity() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.capacity < (select coalesce(sum(capacity), 0) from public.ticket_types where event_id = new.id) then
    raise exception 'El límite no puede ser menor que el aforo asignado a las entradas' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger event_capacity_check before update of capacity on public.events
  for each row execute function public.check_event_capacity();
