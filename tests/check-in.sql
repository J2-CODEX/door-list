-- Requires explicit approval to access a database. All fixtures are rolled back.
begin;
do $$
declare
  owner_uuid uuid;
  event_uuid uuid;
  other_event_uuid uuid;
  type_uuid uuid;
  issued jsonb;
  revoked jsonb;
  result jsonb;
  first_time timestamptz;
begin
  select id into owner_uuid from auth.users limit 1;
  if owner_uuid is null then raise exception 'An existing organizer is required'; end if;
  insert into public.events(owner_id,title,description,starts_at,venue,status,capacity)
    values(owner_uuid,'Check-in fixture','Rolled back',now()+interval '2 days','Fixture','published',3) returning id into event_uuid;
  insert into public.events(owner_id,title,description,starts_at,venue,status,capacity)
    values(owner_uuid,'Other event fixture','Rolled back',now()+interval '2 days','Fixture','published',3) returning id into other_event_uuid;
  insert into public.ticket_types(event_id,name,capacity) values(event_uuid,'General',3) returning id into type_uuid;
  issued := public.register_attendee(event_uuid,type_uuid,'Check-in fixture','check-in@example.com');
  revoked := public.register_attendee(event_uuid,type_uuid,'Revoked fixture','revoked@example.com');
  update public.tickets set status = 'revoked' where code = revoked->>'ticketCode';

  perform set_config('request.jwt.claim.sub', '', true);
  if public.check_in_ticket(event_uuid,issued->>'ticketCode')->>'status' <> 'forbidden' then raise exception 'Anonymous scan admitted'; end if;
  perform set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
  if public.check_in_ticket(event_uuid,issued->>'ticketCode')->>'status' <> 'forbidden' then raise exception 'Non-owner scan admitted'; end if;
  perform set_config('request.jwt.claim.sub', owner_uuid::text, true);
  if public.check_in_ticket(other_event_uuid,issued->>'ticketCode')->>'status' <> 'notFound' then raise exception 'Wrong event admitted'; end if;
  if public.check_in_ticket(event_uuid,repeat('0',64))->>'status' <> 'notFound' then raise exception 'Unknown code admitted'; end if;
  if public.check_in_ticket(event_uuid,revoked->>'ticketCode')->>'status' <> 'notFound' then raise exception 'Revoked code admitted'; end if;
  if public.check_in_ticket(event_uuid,'invalid')->>'status' <> 'notFound' then raise exception 'Malformed code admitted'; end if;

  result := public.check_in_ticket(event_uuid,issued->>'ticketCode');
  if result->>'status' <> 'valid' or result->>'name' <> 'Check-in fixture' or result->>'ticketType' <> 'General' then raise exception 'Valid admission failed'; end if;
  first_time := (result->>'checkedInAt')::timestamptz;
  if first_time is null then raise exception 'Missing check-in time'; end if;
  if not exists(select 1 from public.tickets where code = issued->>'ticketCode' and status = 'used' and checked_in_at = first_time and checked_in_by = owner_uuid) then raise exception 'Check-in not persisted'; end if;
  if public.check_in_ticket(event_uuid,issued->>'ticketCode')->>'status' <> 'used' then raise exception 'Repeated admission allowed'; end if;
  if (select checked_in_at from public.tickets where code = issued->>'ticketCode') <> first_time then raise exception 'Repeated scan changed first check-in'; end if;
  if public.get_public_ticket(issued->>'ticketCode')->>'status' <> 'used' then raise exception 'Public ticket state is stale'; end if;
  if has_function_privilege('anon','public.check_in_ticket(uuid,text)','execute') then raise exception 'Anonymous RPC grant'; end if;
  if has_column_privilege('authenticated','public.tickets','checked_in_at','update') then raise exception 'Direct check-in update allowed'; end if;
end $$;
rollback;
