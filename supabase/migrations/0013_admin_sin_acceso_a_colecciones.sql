-- Flashealo · Migración 0013 · El superadministrador NO accede a las colecciones de los fotógrafos.
-- Antes: is_admin() pasaba todas las políticas. Ahora cada colección (y sus fotos, sets, rostros, reservas y archivos de
-- almacenamiento) solo la ve y la modifica su dueño. El superadmin sigue gestionando cuentas (aprobar, suspender, cuota),
-- y conserva lo suyo porque su cuenta es el fotógrafo "flashealo". Se puede ejecutar más de una vez.

-- 1) ¿Es la colección de quien llama? (sin atajo para el superadmin)
create or replace function public.es_dueno_evento(p_evento text) returns boolean
language sql stable security definer set search_path to 'public','auth' as
$$ select exists (
     select 1 from public.eventos e
     where e.id::text = p_evento and e.fotografo_id is not null and e.fotografo_id = public.mi_fotografo_id()) $$;

-- 2) Colecciones y reservas: solo el dueño
drop policy if exists dueno_all on public.eventos;
create policy dueno_all on public.eventos for all to authenticated
  using (fotografo_id is not null and fotografo_id = public.mi_fotografo_id())
  with check (fotografo_id is not null and fotografo_id = public.mi_fotografo_id());

drop policy if exists dueno_all on public.reservas;
create policy dueno_all on public.reservas for all to authenticated
  using (fotografo_id is not null and fotografo_id = public.mi_fotografo_id())
  with check (fotografo_id is not null and fotografo_id = public.mi_fotografo_id());

-- (carpetas_evento, fotografias, identities, etc. usan es_dueno_evento: quedan solo para el dueño sin más cambios.)

-- 3) Archivos de almacenamiento: el superadmin escribe solo fuera de las carpetas de otros fotógrafos
create or replace function public.ruta_de_otro_fotografo(p_bucket text, p_nombre text) returns boolean
language sql stable security definer set search_path to 'public','auth','storage' as
$$ select
     (p_bucket = 'assets' and (storage.foldername(p_nombre))[1] in ('portadas','logos')
        and exists (select 1 from public.fotografos f where f.slug = (storage.foldername(p_nombre))[2] and f.user_id is distinct from auth.uid()))
  or (p_bucket = 'fotos' and (storage.foldername(p_nombre))[1] = 'avatares'
        and exists (select 1 from public.eventos e where e.id::text = (storage.foldername(p_nombre))[2]
                    and e.fotografo_id is distinct from public.mi_fotografo_id())) $$;

drop policy if exists admin_storage_write on storage.objects;
create policy admin_storage_write on storage.objects for all to authenticated
  using (public.is_admin() and not public.ruta_de_otro_fotografo(bucket_id, name))
  with check (public.is_admin() and not public.ruta_de_otro_fotografo(bucket_id, name));

-- 4) Para el NAS: ¿esta carpeta pertenece a otro fotógrafo? (el servidor la usa para no dejar al superadmin entrar en ella)
create or replace function public.carpeta_ajena(p_segmento text) returns boolean
language sql stable security definer set search_path to 'public','auth' as
$$ select exists (select 1 from public.fotografos f where f.slug = lower(p_segmento) and f.user_id is distinct from auth.uid()) $$;

-- 5) El panel de fotógrafos muestra cuántas colecciones tiene cada uno (solo el número, nunca su contenido)
create or replace function public.colecciones_por_fotografo() returns table(fotografo_id uuid, total bigint)
language plpgsql stable security definer set search_path to 'public','auth' as $$
begin
  if not public.is_admin() then return; end if;
  return query select e.fotografo_id, count(*) from public.eventos e where e.fotografo_id is not null group by e.fotografo_id;
end $$;

revoke execute on function public.ruta_de_otro_fotografo(text, text), public.carpeta_ajena(text), public.colecciones_por_fotografo() from public, anon;
grant execute on function public.ruta_de_otro_fotografo(text, text), public.carpeta_ajena(text), public.colecciones_por_fotografo() to authenticated;
