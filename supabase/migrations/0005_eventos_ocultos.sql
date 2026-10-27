-- Flashealo · Eventos ocultos (borradores).
-- Un evento con estado 'oculto' deja de ser visible para el público (web y API). El administrador lo sigue viendo.
-- Se puede ejecutar más de una vez sin problema.

drop policy if exists pub_read on public.eventos;
create policy pub_read on public.eventos for select to anon, authenticated
  using (coalesce(estado, 'activo') <> 'oculto' or public.is_admin());

-- Las tablas de cada evento solo se leen si el evento es visible (la subconsulta ya respeta la política anterior).
do $$ declare t text; begin
  foreach t in array array['carpetas_evento','etiquetas_fotos','face_detections','fotografias','identities'] loop
    execute format('drop policy if exists pub_read on public.%I', t);
    execute format(
      'create policy pub_read on public.%I for select to anon, authenticated using (exists (select 1 from public.eventos e where e.id::text = %I.evento_id::text))',
      t, t);
  end loop;
end $$;

-- La búsqueda por rostro corre con permisos del sistema: debe ignorar los eventos ocultos.
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
  ORDER BY e.fecha_evento DESC, similitud DESC;
END;
$function$;
