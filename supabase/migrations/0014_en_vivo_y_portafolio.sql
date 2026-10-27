-- Flashealo · Migración 0014 · Galería en vivo y portafolio público.
-- Qué hace:
--   1) `eventos.en_vivo`: interruptor por colección. Con él encendido, la galería del cliente recibe las fotos nuevas
--      sola (y solo muestra las que ya tienen versión web lista).
--   2) Portafolio del fotógrafo (hasta 12 fotos elegidas por él) en `fotografos.perfil->'portafolio'`.
--      `guardar_mi_portafolio` valida que cada foto sea de una colección suya sin contraseña.
--   3) `perfil_publico` entrega también el portafolio (las reservas ya la usan; las claves nuevas no las rompen).
-- Se puede ejecutar más de una vez sin problema.

-- ───────── 1) En vivo ─────────
alter table public.eventos add column if not exists en_vivo boolean not null default false;
grant select (en_vivo) on public.eventos to anon, authenticated;

-- ───────── 2) Portafolio ─────────
create or replace function public.guardar_mi_portafolio(p_rutas text[]) returns void
language plpgsql security definer set search_path to 'public' as $$
declare v_id uuid := public.mi_fotografo_id(); v_lista jsonb := '[]'::jsonb; r text; v_vistas text[] := '{}';
begin
  if v_id is null then raise exception 'No autorizado' using errcode = '42501'; end if;
  foreach r in array coalesce(p_rutas, '{}') loop
    r := btrim(r);
    continue when r = '' or r = any (v_vistas);
    if length(r) > 400 then raise exception 'Ruta inválida' using errcode = 'P0001'; end if;
    if not exists (
      select 1 from public.fotografias fo join public.eventos e on e.id = fo.evento_id
      where fo.url_original = r and e.fotografo_id = v_id and not e.tiene_clave
    ) then
      raise exception 'Solo puedes elegir fotos de tus colecciones sin contraseña' using errcode = 'P0001';
    end if;
    v_vistas := v_vistas || r;
    v_lista := v_lista || to_jsonb(r);
    exit when jsonb_array_length(v_lista) >= 12;
  end loop;
  update public.fotografos set perfil = jsonb_set(coalesce(perfil, '{}'::jsonb), '{portafolio}', v_lista, true) where id = v_id;
end $$;
revoke all on function public.guardar_mi_portafolio(text[]) from public;
grant execute on function public.guardar_mi_portafolio(text[]) to authenticated;

-- guardar_mi_perfil reescribe el perfil entero: conserva el portafolio que ya había.
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
      'servicios', v_serv,
      'portafolio', coalesce(perfil->'portafolio', '[]'::jsonb))
  where id = v_id;
end $$;
revoke all on function public.guardar_mi_perfil(text,jsonb) from public;
grant execute on function public.guardar_mi_perfil(text,jsonb) to authenticated;

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
     'portafolio', coalesce(f.perfil->'portafolio', '[]'::jsonb),
     'reservas_abiertas', coalesce((f.perfil->>'reservas_abiertas')::boolean, true))
   from public.fotografos f
   where f.slug = lower(p_slug) and f.estado = 'activo' $$;
revoke all on function public.perfil_publico(text) from public;
grant execute on function public.perfil_publico(text) to anon, authenticated;
