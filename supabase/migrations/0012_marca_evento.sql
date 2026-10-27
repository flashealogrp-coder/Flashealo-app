-- Flashealo · Migración 0012 · Marca de cada colección (lo que ve el cliente final).
-- Las colecciones de un fotógrafo se muestran con SU nombre, sin la marca de Flashealo.
-- Solo devuelve nombre y carpeta de un fotógrafo activo dueño de esa colección. Se puede ejecutar más de una vez.

create or replace function public.marca_evento(p_evento text) returns jsonb
language sql stable security definer set search_path to 'public' as $$
  select jsonb_build_object('nombre', f.nombre, 'slug', f.slug, 'empresa', f.slug = 'flashealo')
  from public.eventos e join public.fotografos f on f.id = e.fotografo_id
  where e.id::text = p_evento and f.estado = 'activo'
  limit 1 $$;

revoke execute on function public.marca_evento(text) from public;
grant execute on function public.marca_evento(text) to anon, authenticated;
