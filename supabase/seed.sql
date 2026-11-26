-- Development fixtures only. Apply after all migrations, as the postgres role.
-- Cloud reload: npx supabase db query --remote=YOUR_PROJECT_REF --file supabase/seed.sql
-- Cloud images: npx supabase seed buckets --remote=YOUR_PROJECT_REF
-- No DDL, trigger disabling, deletes, or writes to storage.objects belong here.
begin;

do $$
declare
  seed_owner_id uuid;
  local_today date := (transaction_timestamp() at time zone 'America/Guayaquil')::date;
  week_end date := local_today + (7 - extract(isodow from local_today)::integer);
  month_end date := (date_trunc('month', local_today) + interval '1 month - 1 day')::date;
begin
  -- Reuse the existing Auth account without writing passwords, identities, or sessions.
  -- Resolve before any mutations and fail atomically if the account is missing/ambiguous.
  begin
    select id into strict seed_owner_id
    from auth.users
    where lower(trim(email)) = 'jotajota18@hotmail.com' and deleted_at is null
    for key share;
  exception
    when no_data_found then
      raise exception 'Crea o recupera jotajota18@hotmail.com en Supabase Auth antes de cargar la semilla.';
    when too_many_rows then
      raise exception 'Hay varias cuentas para jotajota18@hotmail.com. Revisa Supabase Auth antes de cargar la semilla.';
  end;

  -- Dates are recalculated on each load. Sunday / month-end can coincide with today.
  -- Local wall-clock times are converted explicitly, regardless of the SQL session timezone.
  insert into public.events (id, owner_id, title, description, starts_at, venue, status, capacity)
  values
    ('d0010000-0000-4000-8000-000000000001', seed_owner_id,
      'Encuentro de comunidades creativas',
      'Una tarde para compartir proyectos, conocer personas y crear nuevas colaboraciones. Incluye conversaciones breves y un espacio abierto de networking.',
      (local_today + time '19:00') at time zone 'America/Guayaquil',
      'Casa de encuentros · Guayaquil', 'published', 80),
    ('d0010000-0000-4000-8000-000000000002', seed_owner_id,
      'Música en el patio',
      'Bandas independientes y sesiones acústicas al aire libre. Una noche de música en vivo para descubrir nuevas propuestas locales.',
      (week_end + time '18:00') at time zone 'America/Guayaquil',
      'Patio cultural Las Peñas · Guayaquil', 'published', 120),
    ('d0010000-0000-4000-8000-000000000003', seed_owner_id,
      'Laboratorio de tecnología abierta',
      'Trae tu portátil y construye un pequeño proyecto junto a la comunidad. Habrá demostraciones, mentorías y tiempo para resolver dudas en equipo.',
      (local_today + ((month_end - local_today) / 2) + time '17:30') at time zone 'America/Guayaquil',
      'Espacio coworking Centro · Quito', 'published', 40),
    ('d0010000-0000-4000-8000-000000000004', seed_owner_id,
      'Sabores de nuestra tierra',
      'Un encuentro gastronómico con cocina de temporada, productores locales y una degustación guiada de recetas ecuatorianas.',
      (month_end + time '20:00') at time zone 'America/Guayaquil',
      'Mercado del Río · Guayaquil', 'published', 60),
    ('d0010000-0000-4000-8000-000000000005', seed_owner_id,
      'Taller de arte y color',
      'Explora composición y pintura en una sesión práctica para principiantes. Los materiales están incluidos y te llevarás tu propia obra al terminar.',
      (date_trunc('month', local_today)::date + interval '1 month 9 days 16 hours') at time zone 'America/Guayaquil',
      'Taller colectivo Barranco · Cuenca', 'published', 24),
    ('d0010000-0000-4000-8000-000000000006', seed_owner_id,
      'Caminata por el bosque',
      'Recorre senderos con guías de naturaleza y aprende a reconocer la biodiversidad del bosque. Ruta de dificultad baja con pausas para observar y fotografiar.',
      (date_trunc('month', local_today)::date + interval '2 months 19 days 8 hours') at time zone 'America/Guayaquil',
      'Punto de encuentro: entrada del bosque protector · Mindo', 'published', 30),
    ('d0010000-0000-4000-8000-000000000007', seed_owner_id,
      'Noche de jazz íntimo',
      'Un concierto de jazz en pequeño formato con músicos locales. Todas las plazas están reservadas: este evento de ejemplo permite comprobar el estado de entradas agotadas.',
      (local_today + 14 + time '19:00') at time zone 'America/Guayaquil',
      'Centro Cultural · Guayaquil', 'published', 10)
  on conflict (id) do update set
    owner_id = excluded.owner_id, title = excluded.title, description = excluded.description,
    starts_at = excluded.starts_at, venue = excluded.venue,
    status = excluded.status, capacity = excluded.capacity;

  insert into public.ticket_types (id, event_id, name, capacity)
  values
    ('d0020000-0000-4000-8000-000000000011', 'd0010000-0000-4000-8000-000000000001', 'General', 77),
    ('d0020000-0000-4000-8000-000000000012', 'd0010000-0000-4000-8000-000000000001', 'Mesa con ponentes', 3),
    ('d0020000-0000-4000-8000-000000000021', 'd0010000-0000-4000-8000-000000000002', 'General', 100),
    ('d0020000-0000-4000-8000-000000000022', 'd0010000-0000-4000-8000-000000000002', 'Primera fila', 20),
    ('d0020000-0000-4000-8000-000000000031', 'd0010000-0000-4000-8000-000000000003', 'Participante', 30),
    ('d0020000-0000-4000-8000-000000000032', 'd0010000-0000-4000-8000-000000000003', 'Mentoría', 10),
    ('d0020000-0000-4000-8000-000000000041', 'd0010000-0000-4000-8000-000000000004', 'Degustación', 45),
    ('d0020000-0000-4000-8000-000000000042', 'd0010000-0000-4000-8000-000000000004', 'Mesa del chef', 15),
    ('d0020000-0000-4000-8000-000000000051', 'd0010000-0000-4000-8000-000000000005', 'Taller individual', 16),
    ('d0020000-0000-4000-8000-000000000052', 'd0010000-0000-4000-8000-000000000005', 'Comunidad estudiantil', 8),
    ('d0020000-0000-4000-8000-000000000061', 'd0010000-0000-4000-8000-000000000006', 'Caminata guiada', 24),
    ('d0020000-0000-4000-8000-000000000062', 'd0010000-0000-4000-8000-000000000006', 'Ruta con fotografía', 6),
    ('d0020000-0000-4000-8000-000000000071', 'd0010000-0000-4000-8000-000000000007', 'General', 8),
    ('d0020000-0000-4000-8000-000000000072', 'd0010000-0000-4000-8000-000000000007', 'Primera fila', 2)
  on conflict (id) do update set name = excluded.name, capacity = excluded.capacity;

  -- Occupancy is derived from registrations, never from a fake sold-out flag.
  -- The existing AFTER INSERT trigger issues one Ticket per new Registration.
  -- DO NOTHING preserves existing ticket codes and check-ins on repeated loads.
  insert into public.registrations (id, event_id, ticket_type_id, name, email)
  values
    ('d0030000-0000-4000-8000-000000000001', 'd0010000-0000-4000-8000-000000000001', 'd0020000-0000-4000-8000-000000000012', 'Ana Torres', 'ana.torres@example.test'),
    ('d0030000-0000-4000-8000-000000000002', 'd0010000-0000-4000-8000-000000000001', 'd0020000-0000-4000-8000-000000000012', 'Diego Mora', 'diego.mora@example.test'),
    ('d0030000-0000-4000-8000-000000000003', 'd0010000-0000-4000-8000-000000000001', 'd0020000-0000-4000-8000-000000000012', 'Lucía Vega', 'lucia.vega@example.test'),
    ('d0030000-0000-4000-8000-000000000004', 'd0010000-0000-4000-8000-000000000001', 'd0020000-0000-4000-8000-000000000011', 'Mateo Ruiz', 'mateo.ruiz@example.test'),
    ('d0030000-0000-4000-8000-000000000005', 'd0010000-0000-4000-8000-000000000002', 'd0020000-0000-4000-8000-000000000021', 'Sofía Ríos', 'sofia.rios@example.test'),
    ('d0030000-0000-4000-8000-000000000006', 'd0010000-0000-4000-8000-000000000002', 'd0020000-0000-4000-8000-000000000022', 'Andrés Paz', 'andres.paz@example.test'),
    ('d0030000-0000-4000-8000-000000000007', 'd0010000-0000-4000-8000-000000000003', 'd0020000-0000-4000-8000-000000000031', 'Valeria León', 'valeria.leon@example.test'),
    ('d0030000-0000-4000-8000-000000000008', 'd0010000-0000-4000-8000-000000000004', 'd0020000-0000-4000-8000-000000000041', 'Camila Solís', 'camila.solis@example.test'),
    ('d0030000-0000-4000-8000-000000000009', 'd0010000-0000-4000-8000-000000000005', 'd0020000-0000-4000-8000-000000000051', 'Nicolás Lara', 'nicolas.lara@example.test'),
    ('d0030000-0000-4000-8000-000000000010', 'd0010000-0000-4000-8000-000000000006', 'd0020000-0000-4000-8000-000000000061', 'Elena Cruz', 'elena.cruz@example.test'),
    ('d0030000-0000-4000-8000-000000000011', 'd0010000-0000-4000-8000-000000000007', 'd0020000-0000-4000-8000-000000000071', 'Paula Ortiz', 'paula.ortiz@example.test'),
    ('d0030000-0000-4000-8000-000000000012', 'd0010000-0000-4000-8000-000000000007', 'd0020000-0000-4000-8000-000000000071', 'Gabriel Castro', 'gabriel.castro@example.test'),
    ('d0030000-0000-4000-8000-000000000013', 'd0010000-0000-4000-8000-000000000007', 'd0020000-0000-4000-8000-000000000071', 'Daniela Paz', 'daniela.paz@example.test'),
    ('d0030000-0000-4000-8000-000000000014', 'd0010000-0000-4000-8000-000000000007', 'd0020000-0000-4000-8000-000000000071', 'Emilio Vera', 'emilio.vera@example.test'),
    ('d0030000-0000-4000-8000-000000000015', 'd0010000-0000-4000-8000-000000000007', 'd0020000-0000-4000-8000-000000000071', 'Mariana Gil', 'mariana.gil@example.test'),
    ('d0030000-0000-4000-8000-000000000016', 'd0010000-0000-4000-8000-000000000007', 'd0020000-0000-4000-8000-000000000071', 'Javier Luna', 'javier.luna@example.test'),
    ('d0030000-0000-4000-8000-000000000017', 'd0010000-0000-4000-8000-000000000007', 'd0020000-0000-4000-8000-000000000071', 'Carolina Mena', 'carolina.mena@example.test'),
    ('d0030000-0000-4000-8000-000000000018', 'd0010000-0000-4000-8000-000000000007', 'd0020000-0000-4000-8000-000000000071', 'Tomás Silva', 'tomas.silva@example.test'),
    ('d0030000-0000-4000-8000-000000000019', 'd0010000-0000-4000-8000-000000000007', 'd0020000-0000-4000-8000-000000000072', 'Isabel Ponce', 'isabel.ponce@example.test'),
    ('d0030000-0000-4000-8000-000000000020', 'd0010000-0000-4000-8000-000000000007', 'd0020000-0000-4000-8000-000000000072', 'Sebastián Lara', 'sebastian.lara@example.test')
  on conflict do nothing;

  -- Upload the actual bytes through Storage with `npx supabase seed buckets --remote=YOUR_PROJECT_REF`.
  -- Fixed IDs match supabase/seed-assets/event-covers/<eventId>/<imageId>.webp.
  -- Preserve covers subsequently edited through the organizer UI.
  insert into public.event_covers (
    event_id, revision, image_id, object_path, alt_text, width, height, content_type
  )
  select event_id::uuid, image_id::uuid, image_id::uuid,
    event_id || '/' || image_id || '.webp', alt_text, 1280, 720, 'image/webp'
  from (values
    ('d0010000-0000-4000-8000-000000000001', 'd0040000-0000-4000-8000-000000000001', 'Un espacio preparado para un encuentro de comunidad'),
    ('d0010000-0000-4000-8000-000000000002', 'd0040000-0000-4000-8000-000000000002', 'Luces de escenario durante un concierto en vivo'),
    ('d0010000-0000-4000-8000-000000000003', 'd0040000-0000-4000-8000-000000000003', 'Personas colaborando alrededor de una mesa de trabajo'),
    ('d0010000-0000-4000-8000-000000000004', 'd0040000-0000-4000-8000-000000000004', 'Platos preparados para una experiencia gastronómica'),
    ('d0010000-0000-4000-8000-000000000005', 'd0040000-0000-4000-8000-000000000005', 'Materiales de pintura para un taller de arte'),
    ('d0010000-0000-4000-8000-000000000006', 'd0040000-0000-4000-8000-000000000006', 'Árboles y vegetación de un bosque iluminado por el sol'),
    ('d0010000-0000-4000-8000-000000000007', 'd0040000-0000-4000-8000-000000000007', 'Público y luces de escenario durante un concierto')
  ) as covers(event_id, image_id, alt_text)
  on conflict (event_id) do nothing;
end $$;

commit;
