-- Optional event covers. Only the server may publish validated image bytes.
-- Apply before deploying the cover API. Existing events need no backfill.
create table public.event_covers (
  event_id uuid primary key references public.events(id) on delete cascade,
  revision uuid not null default gen_random_uuid(),
  image_id uuid unique,
  object_path text unique,
  alt_text text check (alt_text is null or alt_text ~ '[^[:space:]]'),
  width integer check (width > 0),
  height integer check (height > 0),
  content_type text check (content_type = 'image/webp'),
  updated_at timestamptz not null default now(),
  constraint event_covers_image_integrity check (
    (image_id is null and object_path is null and alt_text is null
      and width is null and height is null and content_type is null)
    or (image_id is not null and object_path is not null and width is not null
      and height is not null and content_type is not null
      and object_path = event_id::text || '/' || image_id::text || '.webp')
  )
);

create table public.event_cover_uploads (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  expected_revision uuid,
  staging_path text not null unique,
  declared_content_type text not null check (declared_content_type in ('image/jpeg', 'image/png', 'image/webp')),
  declared_byte_length integer not null check (declared_byte_length between 1 and 5242880),
  status text not null default 'pending' check (status in ('pending', 'processing', 'committed', 'rejected', 'expired')),
  claim_token uuid,
  claim_expires_at timestamptz,
  candidate_image_id uuid unique,
  candidate_path text unique,
  committed_revision uuid,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  finished_at timestamptz,
  constraint event_cover_uploads_staging_path check (
    staging_path ~ ('^' || event_id::text || '/' || id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
  ),
  constraint event_cover_uploads_expiration check (expires_at = created_at + interval '30 minutes'),
  constraint event_cover_uploads_claim_integrity check (
    (status = 'processing' and claim_token is not null and claim_expires_at is not null
      and candidate_image_id is not null and candidate_path is not null
      and claim_expires_at <= expires_at
      and candidate_path = event_id::text || '/' || candidate_image_id::text || '.webp')
    or (status <> 'processing' and claim_token is null and claim_expires_at is null
      and candidate_image_id is null and candidate_path is null)
  ),
  constraint event_cover_uploads_result_integrity check (
    (status = 'committed' and committed_revision is not null)
    or (status <> 'committed' and committed_revision is null)
  ),
  constraint event_cover_uploads_terminal_integrity check (
    (status in ('committed', 'rejected', 'expired') and finished_at is not null)
    or (status in ('pending', 'processing') and finished_at is null)
  )
);
create index event_cover_uploads_event_created_idx on public.event_cover_uploads(event_id, created_at);
create index event_cover_uploads_status_expires_idx on public.event_cover_uploads(status, expires_at);

alter table public.event_covers enable row level security;
alter table public.event_cover_uploads enable row level security;
revoke all on public.event_covers, public.event_cover_uploads from public, anon, authenticated, service_role;
grant select (event_id, revision, image_id, alt_text, width, height, content_type, updated_at)
  on public.event_covers to anon, authenticated;
grant select (id, event_id, owner_id, expected_revision, declared_content_type, declared_byte_length,
  status, committed_revision, created_at, expires_at, finished_at)
  on public.event_cover_uploads to authenticated;
-- The administrative adapter needs paths for Storage; all mutations use RPCs.
grant select on public.event_covers, public.event_cover_uploads to service_role;

create policy event_covers_select on public.event_covers for select to anon, authenticated
using (exists (select 1 from public.events e where e.id = event_id
  and (e.status = 'published' or e.owner_id = (select auth.uid()))));
create policy event_cover_uploads_owner_select on public.event_cover_uploads for select to authenticated
using (owner_id = (select auth.uid()) and exists (
  select 1 from public.events e where e.id = event_id and e.owner_id = (select auth.uid())
));

-- Remote resets can retain Storage buckets. Reconcile their configuration
-- without deleting the buckets or their objects when migrations are replayed.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types) values
  ('event-cover-staging', 'event-cover-staging', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('event-covers', 'event-covers', false, 33554432, array['image/webp'])
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
-- Restrictive policies also fence off any pre-existing broad permissive policy.
-- Signed uploads bypass object policies after the server issues a scoped token.
drop policy if exists event_cover_objects_server_only on storage.objects;
create policy event_cover_objects_server_only on storage.objects as restrictive
for all to anon, authenticated
using (bucket_id not in ('event-cover-staging', 'event-covers'))
with check (bucket_id not in ('event-cover-staging', 'event-covers'));
drop policy if exists event_cover_buckets_server_only on storage.buckets;
create policy event_cover_buckets_server_only on storage.buckets as restrictive
for all to anon, authenticated
using (id not in ('event-cover-staging', 'event-covers'))
with check (id not in ('event-cover-staging', 'event-covers'));

-- Internal projection: paths and claim credentials never enter application state.
create function public.get_event_cover_state(p_event_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('coverRevision', c.revision, 'cover', case when c.image_id is null then null
    else jsonb_build_object('imageId', c.image_id, 'altText', c.alt_text,
      'width', c.width, 'height', c.height, 'contentType', c.content_type,
      'imageUrl', case when e.status = 'published'
        then '/api/eventos/' || e.id::text || '/portada/' || c.image_id::text else null end) end)
  from public.events e left join public.event_covers c on c.event_id = e.id where e.id = p_event_id;
$$;

-- All mutators acquire the event lock before an upload lock. The owner parameter
-- must come from a verified user token; these RPCs are service-role-only.
create function public.start_event_cover_upload(
  p_event_id uuid, p_owner_id uuid, p_expected_revision uuid,
  p_declared_content_type text, p_declared_byte_length integer
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_revision uuid;
  v_upload public.event_cover_uploads;
  v_id uuid := gen_random_uuid();
  v_now timestamptz;
begin
  perform 1 from public.events where id = p_event_id and owner_id = p_owner_id for update;
  if not found then return jsonb_build_object('code', 'NOT_FOUND'); end if;
  if p_declared_content_type is null or p_declared_content_type not in ('image/jpeg', 'image/png', 'image/webp')
    or p_declared_byte_length is null or p_declared_byte_length not between 1 and 5242880 then
    return jsonb_build_object('code', 'INVALID_INPUT');
  end if;
  select revision into v_revision from public.event_covers where event_id = p_event_id;
  if v_revision is distinct from p_expected_revision then return jsonb_build_object('code', 'CONFLICT'); end if;
  v_now := clock_timestamp();
  insert into public.event_cover_uploads(id, event_id, owner_id, expected_revision,
    staging_path, declared_content_type, declared_byte_length, created_at, expires_at)
  values(v_id, p_event_id, p_owner_id, p_expected_revision,
    p_event_id::text || '/' || v_id::text || '/' || gen_random_uuid()::text,
    p_declared_content_type, p_declared_byte_length, v_now, v_now + interval '30 minutes')
  returning * into v_upload;
  return jsonb_build_object('code', 'SUCCESS', 'upload', to_jsonb(v_upload));
end $$;

create function public.claim_event_cover_upload(p_event_id uuid, p_owner_id uuid, p_upload_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_upload public.event_cover_uploads;
  v_revision uuid;
  v_image_id uuid := gen_random_uuid();
  v_now timestamptz;
begin
  perform 1 from public.events where id = p_event_id and owner_id = p_owner_id for update;
  if not found then return jsonb_build_object('code', 'NOT_FOUND'); end if;
  select * into v_upload from public.event_cover_uploads
    where id = p_upload_id and event_id = p_event_id and owner_id = p_owner_id for update;
  if not found then return jsonb_build_object('code', 'NOT_FOUND'); end if;
  if v_upload.status = 'committed' then
    return jsonb_build_object('code', 'COMMITTED', 'committedRevision', v_upload.committed_revision,
      'state', public.get_event_cover_state(p_event_id));
  end if;
  if v_upload.status in ('rejected', 'expired') then
    return jsonb_build_object('code', upper(v_upload.status));
  end if;
  v_now := clock_timestamp();
  if v_upload.expires_at <= v_now then
    update public.event_cover_uploads set status = 'expired', finished_at = v_now,
      claim_token = null, claim_expires_at = null, candidate_image_id = null, candidate_path = null
    where id = p_upload_id;
    return jsonb_build_object('code', 'EXPIRED');
  end if;
  select revision into v_revision from public.event_covers where event_id = p_event_id;
  if v_revision is distinct from v_upload.expected_revision then return jsonb_build_object('code', 'CONFLICT'); end if;
  if v_upload.status = 'processing' and v_upload.claim_expires_at > v_now then
    return jsonb_build_object('code', 'BUSY');
  end if;
  update public.event_cover_uploads set status = 'processing', claim_token = gen_random_uuid(),
    claim_expires_at = least(v_now + interval '5 minutes', expires_at),
    candidate_image_id = v_image_id, candidate_path = p_event_id::text || '/' || v_image_id::text || '.webp'
    where id = p_upload_id returning * into v_upload;
  return jsonb_build_object('code', 'SUCCESS', 'upload', to_jsonb(v_upload));
end $$;

create function public.commit_event_cover_upload(
  p_event_id uuid, p_owner_id uuid, p_upload_id uuid, p_claim_token uuid,
  p_width integer, p_height integer, p_alt_text text default null, p_replace_alt_text boolean default false
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_upload public.event_cover_uploads;
  v_cover public.event_covers;
  v_revision uuid := gen_random_uuid();
  v_alt_text text;
  v_now timestamptz;
begin
  perform 1 from public.events where id = p_event_id and owner_id = p_owner_id for update;
  if not found then return jsonb_build_object('code', 'NOT_FOUND'); end if;
  select * into v_upload from public.event_cover_uploads
    where id = p_upload_id and event_id = p_event_id and owner_id = p_owner_id for update;
  if not found then return jsonb_build_object('code', 'NOT_FOUND'); end if;
  if v_upload.status = 'committed' then
    return jsonb_build_object('code', 'SUCCESS', 'committedRevision', v_upload.committed_revision,
      'state', public.get_event_cover_state(p_event_id));
  end if;
  if v_upload.status in ('rejected', 'expired') then return jsonb_build_object('code', upper(v_upload.status)); end if;
  v_now := clock_timestamp();
  if v_upload.expires_at <= v_now then
    update public.event_cover_uploads set status = 'expired', finished_at = v_now,
      claim_token = null, claim_expires_at = null, candidate_image_id = null, candidate_path = null
    where id = p_upload_id;
    return jsonb_build_object('code', 'EXPIRED');
  end if;
  if v_upload.status <> 'processing' or p_claim_token is null
    or v_upload.claim_token is distinct from p_claim_token or v_upload.claim_expires_at <= v_now then
    return jsonb_build_object('code', 'CONFLICT');
  end if;
  select * into v_cover from public.event_covers where event_id = p_event_id;
  if v_cover.revision is distinct from v_upload.expected_revision then return jsonb_build_object('code', 'CONFLICT'); end if;
  if p_width is null or p_height is null or p_width <= 0 or p_height <= 0 then
    return jsonb_build_object('code', 'INVALID_INPUT');
  end if;
  v_alt_text := case when p_replace_alt_text then
    nullif(regexp_replace(p_alt_text, '^[[:space:]]+|[[:space:]]+$', '', 'g'), '') else v_cover.alt_text end;
  insert into public.event_covers(event_id, revision, image_id, object_path, alt_text, width, height, content_type, updated_at)
    values(p_event_id, v_revision, v_upload.candidate_image_id, v_upload.candidate_path,
      v_alt_text, p_width, p_height, 'image/webp', v_now)
    on conflict (event_id) do update set revision = excluded.revision, image_id = excluded.image_id,
      object_path = excluded.object_path, alt_text = excluded.alt_text, width = excluded.width,
      height = excluded.height, content_type = excluded.content_type, updated_at = excluded.updated_at;
  update public.event_cover_uploads set status = 'committed', committed_revision = v_revision,
    finished_at = v_now, claim_token = null, claim_expires_at = null, candidate_image_id = null, candidate_path = null
    where id = p_upload_id;
  return jsonb_build_object('code', 'SUCCESS', 'committedRevision', v_revision,
    'state', public.get_event_cover_state(p_event_id));
end $$;

-- Release a transient failure for an explicit retry, or mark invalid bytes rejected.
create function public.finish_event_cover_upload(
  p_event_id uuid, p_owner_id uuid, p_upload_id uuid, p_claim_token uuid, p_status text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_upload public.event_cover_uploads; v_now timestamptz; v_status text;
begin
  perform 1 from public.events where id = p_event_id and owner_id = p_owner_id for update;
  if not found then return jsonb_build_object('code', 'NOT_FOUND'); end if;
  select * into v_upload from public.event_cover_uploads
    where id = p_upload_id and event_id = p_event_id and owner_id = p_owner_id for update;
  if not found then return jsonb_build_object('code', 'NOT_FOUND'); end if;
  if p_status is null or p_status not in ('pending', 'rejected') then return jsonb_build_object('code', 'INVALID_INPUT'); end if;
  v_now := clock_timestamp();
  if v_upload.status <> 'processing' or p_claim_token is null
    or v_upload.claim_token is distinct from p_claim_token or v_upload.claim_expires_at <= v_now then
    return jsonb_build_object('code', 'CONFLICT');
  end if;
  v_status := case when v_upload.expires_at <= v_now then 'expired' else p_status end;
  update public.event_cover_uploads set status = v_status,
    finished_at = case when v_status in ('expired', 'rejected') then v_now else null end,
    claim_token = null, claim_expires_at = null, candidate_image_id = null, candidate_path = null
    where id = p_upload_id;
  return jsonb_build_object('code', 'SUCCESS', 'status', v_status);
end $$;

create function public.update_event_cover_alt_text(
  p_event_id uuid, p_owner_id uuid, p_expected_revision uuid, p_alt_text text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_cover public.event_covers;
begin
  perform 1 from public.events where id = p_event_id and owner_id = p_owner_id for update;
  if not found then return jsonb_build_object('code', 'NOT_FOUND'); end if;
  select * into v_cover from public.event_covers where event_id = p_event_id;
  if v_cover.image_id is null or v_cover.revision is distinct from p_expected_revision then
    return jsonb_build_object('code', 'CONFLICT');
  end if;
  update public.event_covers set alt_text = nullif(regexp_replace(p_alt_text, '^[[:space:]]+|[[:space:]]+$', '', 'g'), ''),
    revision = gen_random_uuid(), updated_at = clock_timestamp() where event_id = p_event_id;
  return jsonb_build_object('code', 'SUCCESS', 'state', public.get_event_cover_state(p_event_id));
end $$;

create function public.delete_event_cover(p_event_id uuid, p_owner_id uuid, p_expected_revision uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_cover public.event_covers;
begin
  perform 1 from public.events where id = p_event_id and owner_id = p_owner_id for update;
  if not found then return jsonb_build_object('code', 'NOT_FOUND'); end if;
  select * into v_cover from public.event_covers where event_id = p_event_id;
  if v_cover.revision is distinct from p_expected_revision then return jsonb_build_object('code', 'CONFLICT'); end if;
  if v_cover.image_id is not null then
    update public.event_covers set revision = gen_random_uuid(), image_id = null, object_path = null,
      alt_text = null, width = null, height = null, content_type = null, updated_at = clock_timestamp()
      where event_id = p_event_id;
  end if;
  return jsonb_build_object('code', 'SUCCESS', 'state', public.get_event_cover_state(p_event_id));
end $$;

-- Cleanup fences out expired workers under the same event -> upload lock order.
create function public.expire_event_cover_uploads(p_event_id uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare v_count integer; v_now timestamptz;
begin
  perform 1 from public.events where id = p_event_id for update;
  if not found then return 0; end if;
  v_now := clock_timestamp();
  update public.event_cover_uploads set
    status = case when expires_at <= v_now then 'expired' else 'pending' end,
    finished_at = case when expires_at <= v_now then v_now else null end,
    claim_token = null, claim_expires_at = null, candidate_image_id = null, candidate_path = null
  where event_id = p_event_id and (status in ('pending', 'processing') and expires_at <= v_now
    or status = 'processing' and claim_expires_at <= v_now);
  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- Call for each object listed by the Storage API, then remove through that API.
-- No SQL deletion of storage.objects. The object's real creation time is checked
-- here; an expired candidate can never be reused by another processing attempt.
create function public.is_event_cover_cleanup_candidate(p_bucket_id text, p_object_path text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_event_id uuid; v_created_at timestamptz;
begin
  if p_bucket_id is null or p_bucket_id not in ('event-cover-staging', 'event-covers')
    or p_object_path is null then return false; end if;
  begin
    v_event_id := split_part(p_object_path, '/', 1)::uuid;
  exception when invalid_text_representation then return false;
  end;
  perform 1 from public.events where id = v_event_id for update;
  perform public.expire_event_cover_uploads(v_event_id);
  select created_at into v_created_at from storage.objects where bucket_id = p_bucket_id and name = p_object_path;
  if v_created_at is null or v_created_at >= clock_timestamp() - interval '3 hours' then return false; end if;
  if p_bucket_id = 'event-covers' and exists (
    select 1 from public.event_covers where object_path = p_object_path
  ) then return false; end if;
  if exists (select 1 from public.event_cover_uploads where event_id = v_event_id
    and status in ('pending', 'processing')
    and (p_bucket_id = 'event-cover-staging' and staging_path = p_object_path
      or p_bucket_id = 'event-covers' and candidate_path = p_object_path)) then return false; end if;
  return true;
end $$;

-- Invoke after the object sweep. Retain terminal results for reconciliation.
create function public.purge_event_cover_uploads(p_event_id uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  perform 1 from public.events where id = p_event_id for update;
  if not found then return 0; end if;
  delete from public.event_cover_uploads u where u.event_id = p_event_id
    and u.status in ('committed', 'rejected', 'expired')
    and u.finished_at < clock_timestamp() - interval '24 hours'
    and not exists (select 1 from storage.objects o where o.bucket_id = 'event-cover-staging' and o.name = u.staging_path);
  get diagnostics v_count = row_count;
  return v_count;
end $$;

revoke all on function public.get_event_cover_state(uuid),
  public.start_event_cover_upload(uuid, uuid, uuid, text, integer),
  public.claim_event_cover_upload(uuid, uuid, uuid),
  public.commit_event_cover_upload(uuid, uuid, uuid, uuid, integer, integer, text, boolean),
  public.finish_event_cover_upload(uuid, uuid, uuid, uuid, text),
  public.update_event_cover_alt_text(uuid, uuid, uuid, text), public.delete_event_cover(uuid, uuid, uuid),
  public.expire_event_cover_uploads(uuid), public.is_event_cover_cleanup_candidate(text, text),
  public.purge_event_cover_uploads(uuid) from public, anon, authenticated;
grant execute on function public.get_event_cover_state(uuid),
  public.start_event_cover_upload(uuid, uuid, uuid, text, integer),
  public.claim_event_cover_upload(uuid, uuid, uuid),
  public.commit_event_cover_upload(uuid, uuid, uuid, uuid, integer, integer, text, boolean),
  public.finish_event_cover_upload(uuid, uuid, uuid, uuid, text),
  public.update_event_cover_alt_text(uuid, uuid, uuid, text), public.delete_event_cover(uuid, uuid, uuid),
  public.expire_event_cover_uploads(uuid), public.is_event_cover_cleanup_candidate(text, text),
  public.purge_event_cover_uploads(uuid) to service_role;

-- Preserve the existing registration fields, visibility, dates and availability.
create or replace function public.get_public_registration_event(p_event_id uuid) returns jsonb
language sql security definer set search_path = '' as $$
  select jsonb_build_object('id', e.id, 'title', e.title, 'description', e.description,
    'starts_at', e.starts_at, 'venue', e.venue,
    'ticketTypes', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name,
      'available', greatest(0, t.capacity - (select count(*) from public.registrations r where r.ticket_type_id = t.id)))
      order by t.created_at, t.id) from public.ticket_types t where t.event_id = e.id), '[]'::jsonb),
    'coverRevision', c.revision, 'cover', case when c.image_id is null then null
      else jsonb_build_object('imageId', c.image_id, 'altText', c.alt_text, 'width', c.width, 'height', c.height,
        'contentType', c.content_type, 'imageUrl', '/api/eventos/' || e.id::text || '/portada/' || c.image_id::text) end)
  from public.events e left join public.event_covers c on c.event_id = e.id
  where e.id = p_event_id and e.status = 'published'
    and (e.starts_at at time zone 'America/Guayaquil')::date >= (statement_timestamp() at time zone 'America/Guayaquil')::date;
$$;
