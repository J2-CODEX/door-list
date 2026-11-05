create type public.event_status as enum ('draft', 'published');

create table public.events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
  title text not null check (title ~ '[^[:space:]]'),
  description text not null check (description ~ '[^[:space:]]'),
  starts_at timestamptz not null,
  venue text not null check (venue ~ '[^[:space:]]'),
  status public.event_status not null default 'draft',
  created_at timestamptz not null default now()
);

create table public.ticket_types (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null check (name ~ '[^[:space:]]'),
  capacity integer not null check (capacity > 0),
  created_at timestamptz not null default now()
);

create index events_owner_id_idx on public.events (owner_id);
create index events_published_starts_at_idx on public.events (starts_at) where status = 'published';
create index ticket_types_event_id_idx on public.ticket_types (event_id);

alter table public.events enable row level security;
alter table public.ticket_types enable row level security;

grant select on public.events, public.ticket_types to anon, authenticated;
grant insert, update, delete on public.events, public.ticket_types to authenticated;

create policy events_select on public.events for select to anon, authenticated
  using (status = 'published' or owner_id = (select auth.uid()));
create policy events_insert on public.events for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy events_update on public.events for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy events_delete on public.events for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy ticket_types_select on public.ticket_types for select to anon, authenticated
  using (exists (
    select 1 from public.events e where e.id = ticket_types.event_id
      and (e.status = 'published' or e.owner_id = (select auth.uid()))
  ));
create policy ticket_types_insert on public.ticket_types for insert to authenticated
  with check (exists (
    select 1 from public.events e where e.id = ticket_types.event_id and e.owner_id = (select auth.uid())
  ));
create policy ticket_types_update on public.ticket_types for update to authenticated
  using (exists (
    select 1 from public.events e where e.id = ticket_types.event_id and e.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.events e where e.id = ticket_types.event_id and e.owner_id = (select auth.uid())
  ));
create policy ticket_types_delete on public.ticket_types for delete to authenticated
  using (exists (
    select 1 from public.events e where e.id = ticket_types.event_id and e.owner_id = (select auth.uid())
  ));
