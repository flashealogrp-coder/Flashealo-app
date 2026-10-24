-- Flashealo · Migración 0004
-- 1) Rol mínimo "derivadas" para el servicio que genera versiones web con marca de agua:
--    solo puede leer fotografías y actualizar url_watermark, ancho y alto.
-- 2) Suscripción en tiempo real de fotografías (el panel admin la usa para ver aparecer las miniaturas).
-- 3) Índice para la cola de fotos pendientes de procesar.

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'derivadas') then
    create role derivadas nologin noinherit;
  end if;
end $$;

grant usage on schema public to derivadas;
grant select (id, evento_id, url_original, url_watermark, created_at) on public.fotografias to derivadas;
grant update (url_watermark, ancho, alto) on public.fotografias to derivadas;

drop policy if exists derivadas_select on public.fotografias;
drop policy if exists derivadas_update on public.fotografias;
create policy derivadas_select on public.fotografias for select to derivadas using (true);
create policy derivadas_update on public.fotografias for update to derivadas using (true) with check (true);

-- PostgREST entra como "authenticator" y cambia de rol según el JWT.
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'authenticator') then
    grant derivadas to authenticator;
  end if;
end $$;

create index if not exists idx_fotografias_pendientes on public.fotografias (created_at) where url_watermark is null;

do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'fotografias')
  then
    alter publication supabase_realtime add table public.fotografias;
  end if;
end $$;
