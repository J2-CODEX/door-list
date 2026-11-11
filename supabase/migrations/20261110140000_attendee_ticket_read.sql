-- Grant only the columns needed for the owner's attendee export and sales counts.
-- Existing table grants, RLS, and public single-ticket lookups are unchanged.
grant select (registration_id, code, status) on public.tickets to authenticated;

create policy tickets_owner_select on public.tickets
for select to authenticated
using (exists (
  select 1 from public.registrations r
  join public.events e on e.id = r.event_id
  where r.id = tickets.registration_id and e.owner_id = (select auth.uid())
));

-- Rollback in a new versioned migration, after removing application consumers:
-- drop policy tickets_owner_select on public.tickets;
-- revoke select (registration_id, code, status) on public.tickets from authenticated;
