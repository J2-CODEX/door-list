-- Run only with explicit database approval. Every fixture and status change is rolled back.
begin;
do $$
declare
  owner_uuid uuid;
  event_uuid uuid;
  type_uuid uuid;
  first_result jsonb;
  second_result jsonb;
  response jsonb;
  first_registration uuid;
begin
  select id into owner_uuid from auth.users limit 1;
  if owner_uuid is null then raise exception 'Test requires an existing organizer'; end if;
  insert into public.events(owner_id,title,description,starts_at,venue,status,capacity)
    values(owner_uuid,'Temporary ticket verification','Rolled back after verification',now()+interval '2 days','Test venue','published',2)
    returning id into event_uuid;
  insert into public.ticket_types(event_id,name,capacity) values(event_uuid,'Test',2) returning id into type_uuid;
  first_result := public.register_attendee(event_uuid,type_uuid,'Test One','ticket-one@example.com');
  second_result := public.register_attendee(event_uuid,type_uuid,'Test Two','ticket-two@example.com');
  if first_result->>'code' <> 'SUCCESS' or second_result->>'code' <> 'SUCCESS' then raise exception 'Issuance failed'; end if;
  if first_result->>'ticketCode' !~ '^[0-9a-f]{64}$' or second_result->>'ticketCode' !~ '^[0-9a-f]{64}$' then raise exception 'Invalid generated codes'; end if;
  if first_result->>'ticketCode' = second_result->>'ticketCode' then raise exception 'Repeated code'; end if;
  first_registration := (first_result->>'id')::uuid;
  if (select count(*) from public.tickets where registration_id = first_registration) <> 1 then raise exception 'Expected exactly one ticket'; end if;
  response := public.register_attendee(event_uuid,type_uuid,'Test One','TICKET-ONE@example.com');
  if response->>'code' <> 'DUPLICATE' or response ? 'ticketCode' then raise exception 'Duplicate leaked a code'; end if;
  response := public.register_attendee(event_uuid,type_uuid,'Test Three','ticket-three@example.com');
  if response->>'code' <> 'TICKET_UNAVAILABLE' or response ? 'ticketCode' then raise exception 'Sold out issued ticket'; end if;
  response := public.get_public_ticket(first_result->>'ticketCode');
  if response->>'email' <> 'ticket-one@example.com' or response->>'status' <> 'valid' then raise exception 'Ticket lookup failed'; end if;
  if public.get_public_ticket('1') is not null or public.get_public_ticket(repeat('0',64)) is not null then raise exception 'Invalid lookup must not return data'; end if;
  update public.tickets set status='used' where registration_id=first_registration;
  if public.get_public_ticket(first_result->>'ticketCode')->>'status' <> 'used' then raise exception 'Used status is stale'; end if;
  update public.tickets set status='revoked' where registration_id=first_registration;
  if public.get_public_ticket(first_result->>'ticketCode')->>'status' <> 'revoked' then raise exception 'Revoked status is stale'; end if;
  begin
    insert into public.tickets(registration_id) values(first_registration);
    raise exception 'Duplicate registration ticket was allowed';
  exception when unique_violation then null;
  end;
  begin
    update public.tickets set code=first_result->>'ticketCode' where registration_id=(second_result->>'id')::uuid;
    raise exception 'Duplicate code was allowed';
  exception when unique_violation then null;
  end;
  begin
    update public.tickets set status='unknown' where registration_id=first_registration;
    raise exception 'Invalid status was allowed';
  exception when invalid_text_representation then null;
  end;
  if has_table_privilege('anon','public.tickets','SELECT') or has_table_privilege('authenticated','public.tickets','SELECT')
    or has_table_privilege('anon','public.tickets','INSERT') or has_table_privilege('authenticated','public.tickets','UPDATE') then
    raise exception 'Ticket table is exposed';
  end if;
  if not has_function_privilege('anon','public.get_public_ticket(text)','EXECUTE') then raise exception 'Public lookup is not available'; end if;
end $$;
select 'Ticket issuance, uniqueness, statuses and privileges passed; fixtures rolled back' as verification;
rollback;
