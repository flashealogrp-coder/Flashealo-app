-- Flashealo · Migración 0008 · Portal de fotógrafos (cada fotógrafo en su "isla").
-- Qué hace:
--   1) Tabla `fotografos` (cuenta, estado, cuota, carpeta propia) y `eventos.fotografo_id` (dueño de cada colección).
--   2) Seguridad por dueño: un fotógrafo solo ve y modifica SUS colecciones (fotos, sets, rostros, avatares, portadas).
--      El superadministrador (tabla `admins`) conserva acceso total.
--   3) Quien está autenticado ya NO lee filas públicas de otros: el público (anon) lee lo público; el fotógrafo lee lo suyo.
--      (Así nadie ve contraseñas ni huellas faciales de colecciones ajenas.)
--   4) Funciones de alta/estado de fotógrafos y de contexto (`mi_contexto`) para el panel y el NAS.
--   5) La búsqueda de rostro entre todas las colecciones ya no incluye colecciones con contraseña ni de cuentas suspendidas.
-- Se puede ejecutar más de una vez sin problema.

-- ───────── 1) Fotógrafos ─────────
create table if not exists public.fotografos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  slug text not null unique,
  nombre text not null,
  estado text not null default 'pendiente' check (estado in ('pendiente','activo','suspendido')),
  plan text not null default 'beta',
  cuota_bytes bigint,                       -- null = sin límite
  creado_en timestamptz not null default now(),
  constraint fotografos_slug_valido check (slug ~ '^[a-z0-9][a-z0-9-]{2,30}$'),
  constraint fotografos_slug_reservado check (slug !~ '^(admin|www|api|g|sport|portal|soporte|ayuda|app|cliente|mis-resultados|inicio|login|registro|directorio)$')
);
alter table public.fotografos enable row level security;

alter table public.eventos add column if not exists fotografo_id uuid references public.fotografos(id) on delete restrict;
create index if not exists idx_eventos_fotografo on public.eventos (fotografo_id);

-- ───────── 2) Funciones de contexto (corren con permisos del sistema) ─────────
create or replace function public.mi_fotografo_id() returns uuid
language sql stable security definer set search_path to 'public','auth' as
$$ select id from public.fotografos where user_id = auth.uid() and estado = 'activo' $$;

create or replace function public.mi_slug() returns text
language sql stable security definer set search_path to 'public','auth' as
$$ select slug from public.fotografos where user_id = auth.uid() and estado = 'activo' $$;

-- ¿Es la colección de quien llama (o es superadmin)?  p_evento llega como texto porque algunas tablas guardan evento_id como texto.
create or replace function public.es_dueno_evento(p_evento text) returns boolean
language sql stable security definer set search_path to 'public','auth' as
$$ select public.is_admin() or exists (
     select 1 from public.eventos e
     where e.id::text = p_evento and e.fotografo_id is not null and e.fotografo_id = public.mi_fotografo_id()) $$;

create or replace function public.fotografo_suspendido(p_id uuid) returns boolean
language sql stable security definer set search_path to 'public' as
$$ select exists (select 1 from public.fotografos where id = p_id and estado = 'suspendido') $$;

-- Datos de la sesión actual para el panel y el NAS.
create or replace function public.mi_contexto() returns jsonb
language sql stable security definer set search_path to 'public','auth' as
$$ select jsonb_build_object(
     'es_admin', public.is_admin(),
     'fotografo_id', f.id, 'slug', f.slug, 'nombre', f.nombre, 'estado', f.estado,
     'plan', f.plan, 'cuota_bytes', f.cuota_bytes)
   from (select 1) x left join public.fotografos f on f.user_id = auth.uid() $$;

-- Alta de un fotógrafo ya registrado en el sistema de usuarios (solo superadmin).
create or replace function public.alta_fotografo(p_email text, p_slug text, p_nombre text, p_cuota_gb integer default 50)
returns uuid language plpgsql security definer set search_path to 'public','auth' as $$
declare v_user uuid; v_id uuid;
begin
  if not (public.is_admin() or session_user in ('postgres','supabase_admin')) then raise exception 'Solo el superadministrador puede dar de alta fotógrafos'; end if;
  select id into v_user from auth.users where lower(email) = lower(p_email);
  if v_user is null then raise exception 'No existe un usuario con el correo %', p_email; end if;
  insert into public.fotografos (user_id, slug, nombre, estado, cuota_bytes)
  values (v_user, lower(p_slug), p_nombre, 'activo', case when p_cuota_gb is null then null else p_cuota_gb::bigint * 1073741824 end)
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.cambiar_estado_fotografo(p_id uuid, p_estado text) returns void
language plpgsql security definer set search_path to 'public' as $$
begin
  if not (public.is_admin() or session_user in ('postgres','supabase_admin')) then raise exception 'Solo el superadministrador'; end if;
  update public.fotografos set estado = p_estado where id = p_id;
end $$;

create or replace function public.cambiar_cuota_fotografo(p_id uuid, p_cuota_gb integer) returns void
language plpgsql security definer set search_path to 'public' as $$
begin
  if not (public.is_admin() or session_user in ('postgres','supabase_admin')) then raise exception 'Solo el superadministrador'; end if;
  update public.fotografos set cuota_bytes = case when p_cuota_gb is null then null else p_cuota_gb::bigint * 1073741824 end where id = p_id;
end $$;

revoke execute on function public.mi_fotografo_id(), public.mi_slug(), public.es_dueno_evento(text), public.mi_contexto(),
  public.alta_fotografo(text,text,text,integer), public.cambiar_estado_fotografo(uuid,text), public.cambiar_cuota_fotografo(uuid,integer) from public, anon;
grant execute on function public.mi_fotografo_id(), public.mi_slug(), public.es_dueno_evento(text), public.mi_contexto(),
  public.alta_fotografo(text,text,text,integer), public.cambiar_estado_fotografo(uuid,text), public.cambiar_cuota_fotografo(uuid,integer) to authenticated;
grant execute on function public.fotografo_suspendido(uuid) to anon, authenticated;

-- Cuenta del dueño actual: queda como fotógrafo "flashealo" (sin límite) y se le asignan todas las colecciones existentes.
insert into public.fotografos (user_id, slug, nombre, estado, plan, cuota_bytes)
select user_id, 'flashealo', 'Flashealo', 'activo', 'propio', null from public.admins order by user_id limit 1
on conflict do nothing;
update public.eventos set fotografo_id = (select id from public.fotografos where slug = 'flashealo') where fotografo_id is null;

-- Toda colección nueva queda a nombre de quien la crea.
alter table public.eventos alter column fotografo_id set default public.mi_fotografo_id();

-- Dos fotógrafos no pueden usar el mismo enlace público.
do $$ begin
  create unique index if not exists uq_eventos_url_slug on public.eventos (lower(url_slug)) where url_slug is not null and url_slug <> '';
exception when others then raise notice 'No se creó el índice único de url_slug (hay enlaces repetidos): %', sqlerrm;
end $$;

-- ───────── 3) Políticas ─────────
-- fotografos: cada quien ve su cuenta; el superadmin ve y gestiona todas.
drop policy if exists fotografos_admin on public.fotografos;
drop policy if exists fotografos_propio on public.fotografos;
create policy fotografos_admin on public.fotografos for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy fotografos_propio on public.fotografos for select to authenticated using (user_id = auth.uid());
revoke all on public.fotografos from anon;
grant select on public.fotografos to authenticated;
grant insert, update, delete on public.fotografos to authenticated;   -- filtrado por la política (solo superadmin)

-- eventos
drop policy if exists admin_all on public.eventos;
drop policy if exists pub_read on public.eventos;
drop policy if exists dueno_all on public.eventos;
create policy pub_read on public.eventos for select to anon
  using (coalesce(estado, 'activo') <> 'oculto' and not public.fotografo_suspendido(fotografo_id));
create policy dueno_all on public.eventos for all to authenticated
  using (public.is_admin() or (fotografo_id is not null and fotografo_id = public.mi_fotografo_id()))
  with check (public.is_admin() or (fotografo_id is not null and fotografo_id = public.mi_fotografo_id()));

-- tablas que cuelgan de una colección
do $$ declare t text; begin
  foreach t in array array['carpetas_evento','configuracion_sport','corredores','etiquetas_fotos','face_detections','fotografias','identities'] loop
    execute format('drop policy if exists admin_all on public.%I', t);
    execute format('drop policy if exists pub_read on public.%I', t);
    execute format('drop policy if exists dueno_all on public.%I', t);
    execute format('create policy dueno_all on public.%I for all to authenticated using (public.es_dueno_evento(evento_id::text)) with check (public.es_dueno_evento(evento_id::text))', t);
  end loop;
  -- lectura pública (solo anon): únicamente de colecciones visibles
  foreach t in array array['carpetas_evento','configuracion_sport','etiquetas_fotos','face_detections','fotografias','identities'] loop
    execute format('create policy pub_read on public.%I for select to anon using (exists (select 1 from public.eventos e where e.id::text = %I.evento_id::text))', t, t);
  end loop;
end $$;
-- reservas y ventas siguen siendo solo del superadmin (política admin_all de la migración 0002).

-- ───────── 4) Funciones que exponían datos de otras colecciones ─────────
-- El buscador interno de candidatos solo trabaja sobre colecciones propias.
drop function if exists public.sugerir_candidatos(extensions.vector, integer);
create or replace function public.sugerir_candidatos(huella_dudosa extensions.vector, limite_resultados integer, id_evento text)
returns table(id_identidad uuid, nombre_jugador text, avatar text, porcentaje_similitud double precision)
language plpgsql security definer set search_path to 'public','extensions' as $function$
BEGIN
  IF NOT public.es_dueno_evento(id_evento) THEN RETURN; END IF;
  RETURN QUERY
  SELECT i.id AS id_identidad, i.display_name AS nombre_jugador, i.avatar_url AS avatar,
         1.0 - (i.embedding_promedio <=> huella_dudosa) AS porcentaje_similitud
  FROM identities i
  WHERE i.evento_id::text = id_evento AND i.embedding_promedio IS NOT NULL
  ORDER BY i.embedding_promedio <=> huella_dudosa ASC
  LIMIT limite_resultados;
END;
$function$;
revoke execute on function public.sugerir_candidatos(extensions.vector, integer, text) from public, anon;
grant execute on function public.sugerir_candidatos(extensions.vector, integer, text) to authenticated;

-- Búsqueda de rostro entre colecciones: solo visibles, sin contraseña y de cuentas activas.
create or replace function public.buscar_mis_fotos_global(vector_busqueda extensions.vector, umbral double precision)
returns table(photo_url text, similitud double precision, evento_id uuid, nombre_evento text, fecha_evento date)
language plpgsql security definer set search_path to 'public','extensions' as $function$
BEGIN
  RETURN QUERY
  SELECT fd.photo_url, (1 - (fd.embedding <=> vector_busqueda))::double precision AS similitud,
         fd.evento_id::uuid, e.nombre AS nombre_evento, e.fecha_evento
  FROM face_detections fd
  JOIN eventos e ON fd.evento_id::uuid = e.id
  WHERE 1 - (fd.embedding <=> vector_busqueda) > umbral
    AND coalesce(e.estado, 'activo') <> 'oculto'
    AND (e.password_cliente IS NULL OR e.password_cliente = '')
    AND NOT public.fotografo_suspendido(e.fotografo_id)
  ORDER BY e.fecha_evento DESC, similitud DESC;
END;
$function$;

-- ───────── 5) Almacenamiento (portadas, logos, rostros) ─────────
-- Cada fotógrafo escribe solo en su carpeta: assets/portadas/<su-slug>/…, assets/logos/<su-slug>/… y fotos/avatares/<su-colección>/…
drop policy if exists fotografo_storage_write on storage.objects;
create policy fotografo_storage_write on storage.objects for all to authenticated
  using (
    (bucket_id = 'assets' and (storage.foldername(name))[1] in ('portadas','logos') and (storage.foldername(name))[2] = public.mi_slug())
    or (bucket_id = 'fotos' and (storage.foldername(name))[1] = 'avatares' and public.es_dueno_evento((storage.foldername(name))[2]))
  )
  with check (
    (bucket_id = 'assets' and (storage.foldername(name))[1] in ('portadas','logos') and (storage.foldername(name))[2] = public.mi_slug())
    or (bucket_id = 'fotos' and (storage.foldername(name))[1] = 'avatares' and public.es_dueno_evento((storage.foldername(name))[2]))
  );
