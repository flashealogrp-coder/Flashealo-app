-- Flashealo · Migración 0010 · Reservas por fotógrafo.
-- Qué hace:
--   1) Cada reserva pertenece a un fotógrafo (`reservas.fotografo_id`) y tiene estado (nueva/confirmada/cancelada).
--      Las reservas que ya existen se asignan a la cuenta `flashealo`.
--   2) Cada fotógrafo ve y gestiona SOLO sus reservas; el superadmin ve todas.
--   3) El público ya no inserta directo en la tabla: crea la reserva con `crear_reserva(slug, …)`,
--      que valida al fotógrafo, limita abusos y devuelve solo el número de reserva.
--   4) Página pública de cada fotógrafo (`/f/<slug>`): `perfil_publico(slug)` entrega solo lo que él decidió mostrar
--      (nombre, bio, WhatsApp, Instagram, servicios y precios, si recibe reservas).
--   5) `guardar_mi_perfil` lo edita desde el panel, con límites de tamaño.
-- Se puede ejecutar más de una vez sin problema.

-- ───────── 1) Columnas ─────────
alter table public.fotografos add column if not exists perfil jsonb not null default '{}'::jsonb;
alter table public.reservas add column if not exists fotografo_id uuid references public.fotografos(id) on delete restrict;
alter table public.reservas add column if not exists estado text not null default 'nueva';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'reservas_estado_valido') then
    alter table public.reservas add constraint reservas_estado_valido check (estado in ('nueva','confirmada','cancelada'));
  end if;
end $$;
create index if not exists idx_reservas_fotografo on public.reservas (fotografo_id, created_at desc);

update public.reservas set fotografo_id = (select id from public.fotografos where slug = 'flashealo') where fotografo_id is null;

-- Perfil inicial de la cuenta de la empresa (solo si todavía está vacío).
update public.fotografos set perfil = jsonb_build_object(
  'bio', 'Fotografía de eventos y sesiones en República Dominicana.',
  'whatsapp', '18292856200',
  'instagram', 'flashealo.studio',
  'reservas_abiertas', true,
  'servicios', jsonb_build_array(
    jsonb_build_object('nombre','Cumpleaños y eventos','precio','RD$8,000','detalle','por 5 horas'),
    jsonb_build_object('nombre','Sesión a domicilio','precio','RD$5,000','detalle','por 1 hora')))
where slug = 'flashealo' and perfil = '{}'::jsonb;

-- ───────── 2) Seguridad ─────────
drop policy if exists pub_insert on public.reservas;
drop policy if exists admin_all on public.reservas;
drop policy if exists dueno_all on public.reservas;
create policy dueno_all on public.reservas for all to authenticated
  using (public.is_admin() or (fotografo_id is not null and fotografo_id = public.mi_fotografo_id()))
  with check (public.is_admin() or (fotografo_id is not null and fotografo_id = public.mi_fotografo_id()));
revoke all on public.reservas from anon;
grant select, insert, update, delete on public.reservas to authenticated;

-- ───────── 3) Página pública ─────────
create or replace function public.perfil_publico(p_slug text) returns jsonb
language sql stable security definer set search_path to 'public' as
$$ select jsonb_build_object(
     'slug', f.slug,
     'nombre', f.nombre,
     'bio', coalesce(f.perfil->>'bio', ''),
     'whatsapp', coalesce(f.perfil->>'whatsapp', ''),
     'instagram', coalesce(f.perfil->>'instagram', ''),
     'servicios', coalesce(f.perfil->'servicios', '[]'::jsonb),
     'reservas_abiertas', coalesce((f.perfil->>'reservas_abiertas')::boolean, true))
   from public.fotografos f
   where f.slug = lower(p_slug) and f.estado = 'activo' $$;
revoke all on function public.perfil_publico(text) from public;
grant execute on function public.perfil_publico(text) to anon, authenticated;

create or replace function public.crear_reserva(
  p_slug text, p_nombre text, p_correo text, p_telefono text, p_servicio text,
  p_fecha date, p_mensaje text, p_whatsapp boolean default true) returns bigint
language plpgsql security definer set search_path to 'public' as $$
declare f public.fotografos; v_id bigint;
begin
  select * into f from public.fotografos where slug = lower(p_slug) and estado = 'activo';
  if not found then raise exception 'Este fotógrafo no recibe reservas' using errcode = 'P0001'; end if;
  if coalesce((f.perfil->>'reservas_abiertas')::boolean, true) = false then
    raise exception 'Las reservas están cerradas por ahora' using errcode = 'P0001';
  end if;
  if length(btrim(coalesce(p_nombre,''))) < 2 or length(p_nombre) > 120
     or length(coalesce(p_correo,'')) > 200 or length(coalesce(p_telefono,'')) > 40
     or length(coalesce(p_servicio,'')) > 120 or length(coalesce(p_mensaje,'')) > 2000
     or (btrim(coalesce(p_correo,'')) = '' and btrim(coalesce(p_telefono,'')) = '') then
    raise exception 'Datos inválidos' using errcode = 'P0001';
  end if;
  -- freno básico contra abuso: máximo 5 solicitudes por hora con el mismo contacto hacia el mismo fotógrafo
  if (select count(*) from public.reservas r
        where r.fotografo_id = f.id and r.created_at > now() - interval '1 hour'
          and (r.correo is not distinct from nullif(btrim(p_correo),'') or r.telefono is not distinct from nullif(btrim(p_telefono),''))) >= 5 then
    raise exception 'Demasiadas solicitudes. Inténtalo más tarde' using errcode = 'P0001';
  end if;
  insert into public.reservas (fotografo_id, nombre, correo, telefono, servicio, fecha, mensaje, contactar_whatsapp)
  values (f.id, btrim(p_nombre), nullif(btrim(p_correo),''), nullif(btrim(p_telefono),''), nullif(btrim(p_servicio),''), p_fecha, nullif(btrim(p_mensaje),''), coalesce(p_whatsapp, true))
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.crear_reserva(text,text,text,text,text,date,text,boolean) from public;
grant execute on function public.crear_reserva(text,text,text,text,text,date,text,boolean) to anon, authenticated;

-- ───────── 4) Editar mi página (solo el fotógrafo activo, sobre su propia cuenta) ─────────
create or replace function public.guardar_mi_perfil(p_nombre text, p_perfil jsonb) returns void
language plpgsql security definer set search_path to 'public' as $$
declare v_id uuid := public.mi_fotografo_id(); v_serv jsonb := '[]'::jsonb; s jsonb;
begin
  if v_id is null then raise exception 'No autorizado' using errcode = '42501'; end if;
  if jsonb_typeof(coalesce(p_perfil,'null'::jsonb)) <> 'object' then raise exception 'Perfil inválido'; end if;
  if jsonb_typeof(coalesce(p_perfil->'servicios','[]'::jsonb)) <> 'array' then raise exception 'Servicios inválidos'; end if;
  for s in select * from jsonb_array_elements(coalesce(p_perfil->'servicios','[]'::jsonb)) limit 12 loop
    if length(btrim(coalesce(s->>'nombre',''))) > 0 then
      v_serv := v_serv || jsonb_build_array(jsonb_build_object(
        'nombre', left(btrim(s->>'nombre'), 60),
        'precio', left(btrim(coalesce(s->>'precio','')), 40),
        'detalle', left(btrim(coalesce(s->>'detalle','')), 80)));
    end if;
  end loop;
  update public.fotografos set
    nombre = case when length(btrim(coalesce(p_nombre,''))) >= 2 then left(btrim(p_nombre), 80) else nombre end,
    perfil = jsonb_build_object(
      'bio', left(btrim(coalesce(p_perfil->>'bio','')), 600),
      'whatsapp', left(regexp_replace(coalesce(p_perfil->>'whatsapp',''), '[^0-9]', '', 'g'), 20),
      'instagram', left(regexp_replace(coalesce(p_perfil->>'instagram',''), '[^A-Za-z0-9._]', '', 'g'), 40),
      'reservas_abiertas', coalesce((p_perfil->>'reservas_abiertas')::boolean, true),
      'servicios', v_serv)
  where id = v_id;
end $$;
revoke all on function public.guardar_mi_perfil(text,jsonb) from public;
grant execute on function public.guardar_mi_perfil(text,jsonb) to authenticated;
