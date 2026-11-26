-- Explicit database authorization required. Fixtures and mutations roll back.
-- Run with ON_ERROR_STOP when using psql; no real Storage objects are created.
begin;

do $$
declare
  v_owner uuid := gen_random_uuid();
  v_other uuid := gen_random_uuid();
  v_event uuid;
  v_private uuid;
  v_type uuid;
  v_result jsonb;
  v_claim jsonb;
  v_upload uuid;
  v_token uuid;
  v_revision uuid;
  v_next_revision uuid;
  v_image uuid;
  v_original jsonb;
  v_function regprocedure;
  v_role text;
begin
  insert into auth.users(id, aud, role, email) values
    (v_owner, 'authenticated', 'authenticated', v_owner::text || '@cover-test.invalid'),
    (v_other, 'authenticated', 'authenticated', v_other::text || '@cover-test.invalid');
  insert into public.events(owner_id, title, description, starts_at, venue, status, capacity)
    values(v_owner, 'Cover fixture', 'Rolled back', now() + interval '2 days', 'Test', 'published', 10)
    returning id into v_event;
  insert into public.events(owner_id, title, description, starts_at, venue, status, capacity)
    values(v_owner, 'Private cover fixture', 'Rolled back', now() + interval '2 days', 'Test', 'draft', 10)
    returning id into v_private;
  insert into public.ticket_types(event_id, name, capacity) values(v_event, 'General', 10) returning id into v_type;
  perform set_config('covers_test.owner_id', v_owner::text, true);
  perform set_config('covers_test.other_id', v_other::text, true);
  perform set_config('covers_test.event_id', v_event::text, true);
  perform set_config('covers_test.private_id', v_private::text, true);

  if not (select relrowsecurity from pg_class where oid = 'public.event_covers'::regclass)
    or not (select relrowsecurity from pg_class where oid = 'public.event_cover_uploads'::regclass) then
    raise exception 'RLS is required';
  end if;
  foreach v_role in array array['anon', 'authenticated'] loop
    if has_column_privilege(v_role, 'public.event_covers', 'object_path', 'select')
      or has_column_privilege(v_role, 'public.event_cover_uploads', 'staging_path', 'select')
      or has_column_privilege(v_role, 'public.event_cover_uploads', 'claim_token', 'select')
      or has_column_privilege(v_role, 'public.event_cover_uploads', 'candidate_path', 'select')
      or has_table_privilege(v_role, 'public.event_covers', 'insert,update,delete,truncate')
      or has_table_privilege(v_role, 'public.event_cover_uploads', 'insert,update,delete,truncate') then
      raise exception 'Excess cover privileges for %', v_role;
    end if;
  end loop;
  for v_function in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('get_event_cover_state', 'start_event_cover_upload',
      'claim_event_cover_upload', 'commit_event_cover_upload', 'finish_event_cover_upload',
      'update_event_cover_alt_text', 'delete_event_cover', 'expire_event_cover_uploads',
      'is_event_cover_cleanup_candidate', 'purge_event_cover_uploads')
  loop
    if has_function_privilege('anon', v_function, 'execute')
      or has_function_privilege('authenticated', v_function, 'execute')
      or not has_function_privilege('service_role', v_function, 'execute') then
      raise exception 'Invalid RPC grants for %', v_function;
    end if;
  end loop;
  if (select count(*) from storage.buckets where id in ('event-cover-staging', 'event-covers') and not public) <> 2
    or not exists(select 1 from storage.buckets where id = 'event-cover-staging' and file_size_limit = 5242880
      and allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'])
    or not exists(select 1 from storage.buckets where id = 'event-covers' and file_size_limit = 33554432
      and allowed_mime_types = array['image/webp']) then raise exception 'Invalid private buckets'; end if;

  if public.start_event_cover_upload(v_event, v_other, null, 'image/png', 100)->>'code' is distinct from 'NOT_FOUND'
    or public.start_event_cover_upload(v_event, v_owner, null, 'image/gif', 100)->>'code' is distinct from 'INVALID_INPUT'
    or public.start_event_cover_upload(v_event, v_owner, null, 'image/png', 5242881)->>'code' is distinct from 'INVALID_INPUT' then
    raise exception 'Ownership or input checks failed';
  end if;
  v_result := public.start_event_cover_upload(v_event, v_owner, null, 'image/png', 5242880);
  if v_result->>'code' is distinct from 'SUCCESS' then raise exception 'Start failed'; end if;
  v_upload := (v_result->'upload'->>'id')::uuid;
  perform set_config('covers_test.upload_id', v_upload::text, true);
  v_claim := public.claim_event_cover_upload(v_event, v_owner, v_upload);
  v_token := (v_claim->'upload'->>'claim_token')::uuid;
  if v_claim->>'code' is distinct from 'SUCCESS' or v_token is null
    or public.claim_event_cover_upload(v_event, v_owner, v_upload)->>'code' is distinct from 'BUSY' then
    raise exception 'Claim did not exclude another worker';
  end if;
  v_result := public.commit_event_cover_upload(v_event, v_owner, v_upload, v_token, 1200, 800, '  Cover description  ', true);
  if v_result->>'code' is distinct from 'SUCCESS'
    or v_result->'state'->'cover'->>'altText' is distinct from 'Cover description' then raise exception 'Commit failed'; end if;
  v_revision := (v_result->>'committedRevision')::uuid;
  v_image := (v_result->'state'->'cover'->>'imageId')::uuid;
  if v_revision is null or v_image is null then raise exception 'Missing committed state'; end if;
  if public.commit_event_cover_upload(v_event, v_owner, v_upload, v_token, 1200, 800)->>'committedRevision'
    is distinct from v_revision::text then raise exception 'Commit not idempotent'; end if;
  if public.start_event_cover_upload(v_event, v_owner, null, 'image/png', 100)->>'code' is distinct from 'CONFLICT' then
    raise exception 'Stale revision accepted';
  end if;

  v_original := public.get_public_registration_event(v_event);
  if v_original->'ticketTypes'->0->>'available' is distinct from '10'
    or v_original->'cover'->>'imageId' is distinct from v_image::text
    or v_original::text like '%object_path%' then raise exception 'Public projection failed'; end if;
  perform public.register_attendee(v_event, v_type, 'Fixture', 'cover-registration@cover-test.invalid');
  if public.get_public_registration_event(v_event)->'ticketTypes'->0->>'available' is distinct from '9' then
    raise exception 'Registration availability changed';
  end if;

  -- A later description edit must not change the durable result of the upload.
  v_result := public.update_event_cover_alt_text(v_event, v_owner, v_revision, E' \t\n ');
  v_next_revision := (v_result->'state'->>'coverRevision')::uuid;
  if v_result->>'code' is distinct from 'SUCCESS' or v_next_revision is null or v_next_revision = v_revision
    or v_result->'state'->'cover'->'altText' is distinct from 'null'::jsonb
    or v_result->'state'->'cover'->>'imageId' is distinct from v_image::text then raise exception 'Description update failed'; end if;
  v_result := public.commit_event_cover_upload(v_event, v_owner, v_upload, v_token, 1200, 800);
  if v_result->>'committedRevision' is distinct from v_revision::text
    or v_result->'state'->>'coverRevision' is distinct from v_next_revision::text then
    raise exception 'Durable result confused with current state';
  end if;
  v_revision := v_next_revision;

  -- Two operations based on one revision: only the first can publish.
  v_result := public.start_event_cover_upload(v_event, v_owner, v_revision, 'image/jpeg', 100);
  v_upload := (v_result->'upload'->>'id')::uuid;
  v_claim := public.claim_event_cover_upload(v_event, v_owner, v_upload);
  v_token := (v_claim->'upload'->>'claim_token')::uuid;
  perform public.update_event_cover_alt_text(v_event, v_owner, v_revision, 'Concurrent edit');
  if public.commit_event_cover_upload(v_event, v_owner, v_upload, v_token, 600, 600)->>'code' is distinct from 'CONFLICT'
    or public.get_event_cover_state(v_event)->'cover'->>'imageId' is distinct from v_image::text then
    raise exception 'Revision race overwrote the cover';
  end if;
  v_revision := (public.get_event_cover_state(v_event)->>'coverRevision')::uuid;

  -- Lease invalidation fences the old worker; a retry uses a different object.
  v_result := public.start_event_cover_upload(v_event, v_owner, v_revision, 'image/webp', 100);
  v_upload := (v_result->'upload'->>'id')::uuid;
  v_claim := public.claim_event_cover_upload(v_event, v_owner, v_upload);
  v_token := (v_claim->'upload'->>'claim_token')::uuid;
  update public.event_cover_uploads set claim_expires_at = clock_timestamp() - interval '1 second' where id = v_upload;
  perform public.expire_event_cover_uploads(v_event);
  if public.commit_event_cover_upload(v_event, v_owner, v_upload, v_token, 600, 600)->>'code' is distinct from 'CONFLICT' then
    raise exception 'Invalidated worker committed';
  end if;
  v_result := public.claim_event_cover_upload(v_event, v_owner, v_upload);
  if v_result->>'code' is distinct from 'SUCCESS'
    or v_result->'upload'->>'candidate_path' is not distinct from v_claim->'upload'->>'candidate_path' then
    raise exception 'Retry reused the old candidate';
  end if;
  v_token := (v_result->'upload'->>'claim_token')::uuid;
  if public.finish_event_cover_upload(v_event, v_owner, v_upload, v_token, 'rejected')->>'code' is distinct from 'SUCCESS'
    or public.claim_event_cover_upload(v_event, v_owner, v_upload)->>'code' is distinct from 'REJECTED' then
    raise exception 'Rejected operation was reopened';
  end if;
  if public.get_event_cover_state(v_event)->'cover'->>'imageId' is distinct from v_image::text then
    raise exception 'Failure changed the previous cover';
  end if;

  -- Deletion keeps a tombstone, so stale initially-empty forms cannot win.
  if public.delete_event_cover(v_event, v_owner, null)->>'code' is distinct from 'CONFLICT' then
    raise exception 'Stale deletion accepted';
  end if;
  v_result := public.delete_event_cover(v_event, v_owner, v_revision);
  v_revision := (v_result->'state'->>'coverRevision')::uuid;
  if v_result->>'code' is distinct from 'SUCCESS' or v_revision is null
    or v_result->'state'->'cover' is distinct from 'null'::jsonb then raise exception 'Tombstone missing'; end if;
  if public.delete_event_cover(v_event, v_owner, v_revision)->'state'->>'coverRevision' is distinct from v_revision::text then
    raise exception 'Empty deletion was not stable';
  end if;

  -- Populate public and private metadata for the role checks below.
  foreach v_event in array array[v_event, v_private] loop
    v_revision := (public.get_event_cover_state(v_event)->>'coverRevision')::uuid;
    v_result := public.start_event_cover_upload(v_event, v_owner, v_revision, 'image/png', 100);
    v_upload := (v_result->'upload'->>'id')::uuid;
    v_claim := public.claim_event_cover_upload(v_event, v_owner, v_upload);
    v_result := public.commit_event_cover_upload(v_event, v_owner, v_upload,
      (v_claim->'upload'->>'claim_token')::uuid, 600, 600);
    if v_result->>'code' is distinct from 'SUCCESS' then raise exception 'Fixture cover failed'; end if;
  end loop;
  if public.get_event_cover_state(v_private)->'cover'->'imageUrl' is distinct from 'null'::jsonb
    or public.get_public_registration_event(v_private) is not null then raise exception 'Private event exposed'; end if;
  if public.purge_event_cover_uploads(v_private) <> 0 then raise exception 'Recent result purged'; end if;
  if public.is_event_cover_cleanup_candidate('event-covers', v_private::text || '/' || gen_random_uuid()::text || '.webp')
    or public.is_event_cover_cleanup_candidate('other-bucket', 'invalid') then raise exception 'Unknown cleanup candidate allowed'; end if;

  -- The service role can read paths and invoke RPCs, but cannot write tables.
  if not has_table_privilege('service_role', 'public.event_covers', 'select')
    or has_table_privilege('service_role', 'public.event_covers', 'insert,update,delete') then
    raise exception 'Invalid administrative adapter grants';
  end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('covers_test.owner_id'), true);
select set_config('request.jwt.claims', json_build_object('sub', current_setting('covers_test.owner_id'), 'role', 'authenticated')::text, true);
do $$
begin
  if (select count(image_id) from public.event_covers where event_id in
    (current_setting('covers_test.event_id')::uuid, current_setting('covers_test.private_id')::uuid)) <> 2 then
    raise exception 'Owner cannot read both covers';
  end if;
  if not exists (select 1 from public.event_cover_uploads where id = current_setting('covers_test.upload_id')::uuid) then
    raise exception 'Owner cannot recover upload result';
  end if;
  begin
    perform object_path from public.event_covers;
    raise exception 'Owner can read internal paths';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.event_covers where event_id = current_setting('covers_test.event_id')::uuid;
    raise exception 'Direct deletion permitted';
  exception when insufficient_privilege then null;
  end;
end $$;

-- A different authenticated user has no editing permission (including door UI).
select set_config('request.jwt.claim.sub', current_setting('covers_test.other_id'), true);
select set_config('request.jwt.claims', json_build_object('sub', current_setting('covers_test.other_id'), 'role', 'authenticated')::text, true);
do $$
begin
  if exists(select 1 from public.event_covers where event_id = current_setting('covers_test.private_id')::uuid)
    or exists(select 1 from public.event_cover_uploads where event_id = current_setting('covers_test.event_id')::uuid) then
    raise exception 'Other user can read private cover or operation';
  end if;
  begin
    perform public.delete_event_cover(current_setting('covers_test.event_id')::uuid, current_setting('covers_test.owner_id')::uuid, null);
    raise exception 'Other user can invoke administrative RPC';
  exception when insufficient_privilege then null;
  end;
  if exists(select 1 from storage.objects where bucket_id in ('event-cover-staging', 'event-covers')) then
    raise exception 'Browser can read cover objects';
  end if;
end $$;
reset role;

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
begin
  if not exists(select 1 from public.event_covers where event_id = current_setting('covers_test.event_id')::uuid)
    or exists(select 1 from public.event_covers where event_id = current_setting('covers_test.private_id')::uuid) then
    raise exception 'Public metadata visibility failed';
  end if;
  begin
    perform id from public.event_cover_uploads;
    raise exception 'Anonymous operation read permitted';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
rollback;
