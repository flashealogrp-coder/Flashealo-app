-- Flashealo · Migración 0016 · Foto de portada (la que va detrás del nombre) de la página pública.
-- Qué hace:
--   1) `guardar_mi_portada(text)`: el fotógrafo activo elige una foto de SU portafolio (o '' para quitarla).
--   2) `perfil_publico` devuelve `portada`.
--   3) `guardar_mi_perfil` conserva la portada al guardar el resto del perfil.
-- Se puede ejecutar más de una vez sin problema.

create or replace function public.guardar_mi_portada(p_ruta text) returns void
language plpgsql security definer set search_path to 'public' as $$
declare v_id uuid := public.mi_fotografo_id();
begin
  if v_id is null then raise exception 'No autorizado' using errcode = '42501'; end if;
  p_ruta := coalesce(btrim(p_ruta), '');
  if p_ruta <> '' and not exists (
    select 1 from public.fotografos f, jsonb_array_elements_text(coalesce(f.perfil->'portafolio','[]'::jsonb)) r(v)
    where f.id = v_id and r.v = p_ruta) then
    raise exception 'La portada debe ser una foto de tu portafolio' using errcode = 'P0001';
  end if;
  update public.fotografos set perfil = jsonb_set(coalesce(perfil, '{}'::jsonb), '{portada}', to_jsonb(p_ruta), true) where id = v_id;
end $$;
revoke all on function public.guardar_mi_portada(text) from public;
grant execute on function public.guardar_mi_portada(text) to authenticated;

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
      'portafolio', coalesce(perfil->'portafolio', '[]'::jsonb),
      'plantilla', coalesce(perfil->'plantilla', '"editorial"'::jsonb),
      'portada', coalesce(perfil->'portada', '""'::jsonb))
  where id = v_id;
end $$;
revoke all on function public.guardar_mi_perfil(text,jsonb) from public;
grant execute on function public.guardar_mi_perfil(text,jsonb) to authenticated;

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
     'plantilla', coalesce(nullif(f.perfil->>'plantilla', ''), 'editorial'),
     'portada', coalesce(f.perfil->>'portada', ''),
     'reservas_abiertas', coalesce((f.perfil->>'reservas_abiertas')::boolean, true))
   from public.fotografos f
   where f.slug = lower(p_slug) and f.estado = 'activo' $$;
revoke all on function public.perfil_publico(text) from public;
grant execute on function public.perfil_publico(text) to anon, authenticated;
