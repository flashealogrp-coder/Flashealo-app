-- Flashealo · Seguridad (RLS, admin, grants, buckets). Estado "etapa A" de flashealo-core.
create table public.admins (user_id uuid primary key references auth.users(id) on delete cascade);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path to 'public','auth' as
$$ select exists (select 1 from public.admins where user_id = auth.uid()) $$;

create or replace function public.verificar_clave_evento(p_evento uuid, p_clave text) returns boolean
language sql stable security definer set search_path to 'public' as
$$ select exists (select 1 from public.eventos where id = p_evento and (password_cliente is null or password_cliente = '' or password_cliente = p_clave)) $$;

do $$ declare t text; begin
  foreach t in array array['admins','carpetas_evento','configuracion_sport','corredores','etiquetas_fotos','eventos','face_detections','fotografias','identities','reservas','ventas'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
  -- admin total sobre todo (excepto admins, sin políticas = solo service_role)
  foreach t in array array['carpetas_evento','configuracion_sport','corredores','etiquetas_fotos','eventos','face_detections','fotografias','identities','reservas','ventas'] loop
    execute format('create policy admin_all on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
  -- lectura pública
  foreach t in array array['carpetas_evento','configuracion_sport','etiquetas_fotos','eventos','face_detections','fotografias','identities'] loop
    execute format('create policy pub_read on public.%I for select to anon, authenticated using (true)', t);
  end loop;
end $$;

create policy pub_insert on public.reservas for insert to anon, authenticated with check (true);

-- Privilegios: anon solo lee (y crea reservas); escritura solo vía admin_all.
revoke all on all tables in schema public from anon, authenticated;
grant select on public.carpetas_evento, public.configuracion_sport, public.etiquetas_fotos,
  public.eventos, public.face_detections, public.fotografias, public.identities to anon, authenticated;
grant insert on public.reservas to anon, authenticated;
grant all on all tables in schema public to authenticated;  -- filtrado por RLS (admin_all)
revoke all on public.admins, public.ventas from anon;
grant usage, select on all sequences in schema public to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.verificar_clave_evento(uuid, text) to anon, authenticated;

-- Buckets (en Supabase autoalojado se crean igual)
insert into storage.buckets (id, name, public) values
  ('assets','assets',true),('fotos','fotos',true),('fotos-pendientes','fotos-pendientes',true),
  ('public-assets','public-assets',true),('private-vault','private-vault',false)
on conflict (id) do nothing;

create policy "Permitir lectura de assets" on storage.objects for select to public using (bucket_id = 'assets');
create policy admin_storage_write on storage.objects for all to authenticated using (public.is_admin()) with check (public.is_admin());
