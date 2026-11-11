-- Run only against an isolated database, after applying the migration and with
-- explicit database approval. Fixtures, auth users and all changes roll back.
\set ON_ERROR_STOP on
begin;

do $$
declare
  owner_id uuid := gen_random_uuid();
  other_id uuid := gen_random_uuid();
  owner_event_id uuid;
  other_event_id uuid;
  owner_type_id uuid;
  other_type_id uuid;
begin
  insert into auth.users(id, aud, role, email) values
    (owner_id, 'authenticated', 'authenticated', owner_id::text || '@attendees-test.invalid'),
    (other_id, 'authenticated', 'authenticated', other_id::text || '@attendees-test.invalid');
  insert into public.events(owner_id, title, description, starts_at, venue, status, capacity)
    values(owner_id, 'Owner fixture', 'RLS test', now() + interval '2 days', 'Test', 'published', 10)
    returning id into owner_event_id;
  insert into public.events(owner_id, title, description, starts_at, venue, status, capacity)
    values(other_id, 'Other fixture', 'RLS test', now() + interval '2 days', 'Test', 'published', 10)
    returning id into other_event_id;
  insert into public.ticket_types(event_id, name, capacity) values(owner_event_id, 'General', 10) returning id into owner_type_id;
  insert into public.ticket_types(event_id, name, capacity) values(other_event_id, 'General', 10) returning id into other_type_id;
  -- The existing issuance trigger creates exactly one ticket per registration.
  insert into public.registrations(event_id, ticket_type_id, name, email) values
    (owner_event_id, owner_type_id, 'Owner attendee', 'owner@attendees-test.invalid'),
    (other_event_id, other_type_id, 'Other attendee', 'other@attendees-test.invalid');
  perform set_config('attendees_test.owner_id', owner_id::text, true);
  perform set_config('attendees_test.other_id', other_id::text, true);
  perform set_config('attendees_test.owner_event_id', owner_event_id::text, true);
  perform set_config('attendees_test.other_event_id', other_event_id::text, true);
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('attendees_test.owner_id'), true);
select set_config('request.jwt.claims', json_build_object('sub', current_setting('attendees_test.owner_id'), 'role', 'authenticated')::text, true);

do $$
begin
  if (select count(code) from public.tickets) <> 1 then raise exception 'Owner must see exactly her own ticket'; end if;
  if (select count(r.id) from public.registrations r where r.event_id = current_setting('attendees_test.other_event_id')::uuid) <> 0 then
    raise exception 'Another event exposed attendee details';
  end if;
  if (select count(t.code) from public.tickets t join public.registrations r on r.id = t.registration_id
      where r.event_id = current_setting('attendees_test.owner_event_id')::uuid and t.status in ('valid', 'used')) <> 1 then
    raise exception 'Owner cannot read export columns';
  end if;
  if (select count(t.code) from public.tickets t join public.registrations r on r.id = t.registration_id
      where r.event_id = current_setting('attendees_test.other_event_id')::uuid) <> 0 then
    raise exception 'Another event exposed ticket codes';
  end if;
  if has_column_privilege('authenticated', 'public.tickets', 'id', 'select')
    or has_column_privilege('authenticated', 'public.tickets', 'created_at', 'select')
    or has_table_privilege('authenticated', 'public.tickets', 'insert,update,delete') then
    raise exception 'Grant exceeds the required read-only export columns';
  end if;
end $$;

select set_config('request.jwt.claim.sub', current_setting('attendees_test.other_id'), true);
select set_config('request.jwt.claims', json_build_object('sub', current_setting('attendees_test.other_id'), 'role', 'authenticated')::text, true);
do $$
begin
  if (select count(code) from public.tickets) <> 1 then raise exception 'Second owner must see exactly her own ticket'; end if;
  if (select count(t.code) from public.tickets t join public.registrations r on r.id = t.registration_id
      where r.event_id = current_setting('attendees_test.owner_event_id')::uuid) <> 0 then
    raise exception 'Second owner can read first owner ticket codes';
  end if;
end $$;

reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
begin
  begin
    perform code from public.tickets;
    raise exception 'Anonymous access to ticket codes was allowed';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform email from public.registrations;
    raise exception 'Anonymous access to attendee emails was allowed';
  exception when insufficient_privilege then
    null;
  end;
end $$;
reset role;
rollback;
