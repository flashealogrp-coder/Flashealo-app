-- Flashealo · Migración 0009 · Registro de fotógrafos (autoservicio) y datos de contacto.
--   1) Cuando alguien crea una cuenta (página /registro o desde Supabase), se crea su ficha de fotógrafo en estado
--      'pendiente': no puede subir ni ver nada hasta que el superadministrador la apruebe en el panel.
--   2) `alta_fotografo` también sirve para aprobar a alguien que ya se registró (conserva su ficha).
--   3) La carpeta (slug) solo se puede cambiar mientras la cuenta está pendiente: después ya tiene archivos con ese nombre.
-- Se puede ejecutar más de una vez sin problema.

alter table public.fotografos add column if not exists email text;
alter table public.fotografos add column if not exists contacto text;

-- Ficha pendiente automática al crearse un usuario. Nunca debe impedir que el registro se complete.
create or replace function public.crear_fotografo_pendiente() returns trigger
language plpgsql security definer set search_path to 'public','auth' as $$
declare v_nombre text; v_base text; v_slug text; v_i int := 0;
begin
  v_nombre := left(coalesce(nullif(trim(new.raw_user_meta_data->>'nombre'), ''), split_part(coalesce(new.email, 'fotografo'), '@', 1)), 80);
  v_base := lower(regexp_replace(translate(coalesce(nullif(trim(new.raw_user_meta_data->>'slug'), ''), v_nombre),
              'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN'), '[^a-zA-Z0-9]+', '-', 'g'));
  v_base := left(trim(both '-' from v_base), 24);
  if length(v_base) < 3 then v_base := 'foto-' || substr(md5(new.id::text), 1, 6); end if;
  v_slug := v_base;
  loop
    begin
      insert into public.fotografos (user_id, slug, nombre, estado, email, contacto)
      values (new.id, v_slug, v_nombre, 'pendiente', new.email, left(nullif(trim(new.raw_user_meta_data->>'whatsapp'), ''), 40))
      on conflict (user_id) do nothing;
      exit;
    exception when others then
      v_i := v_i + 1;
      exit when v_i > 6;
      v_slug := left(v_base, 24) || '-' || v_i;
    end;
  end loop;
  return new;
exception when others then
  return new;
end $$;

drop trigger if exists trg_fotografo_pendiente on auth.users;
create trigger trg_fotografo_pendiente after insert on auth.users
  for each row execute function public.crear_fotografo_pendiente();

-- La carpeta no cambia una vez aprobada la cuenta.
create or replace function public.bloquear_cambio_slug() returns trigger
language plpgsql as $$
begin
  if new.slug is distinct from old.slug and old.estado <> 'pendiente' then
    raise exception 'La carpeta de una cuenta aprobada no se puede cambiar';
  end if;
  return new;
end $$;
drop trigger if exists trg_bloquear_slug on public.fotografos;
create trigger trg_bloquear_slug before update on public.fotografos for each row execute function public.bloquear_cambio_slug();

-- Alta o aprobación por correo (superadmin, o desde la consola de la base de datos).
create or replace function public.alta_fotografo(p_email text, p_slug text, p_nombre text, p_cuota_gb integer default 50)
returns uuid language plpgsql security definer set search_path to 'public','auth' as $$
declare v_user uuid; v_id uuid; v_estado text; v_cuota bigint;
begin
  if not (public.is_admin() or session_user in ('postgres','supabase_admin')) then raise exception 'Solo el superadministrador puede dar de alta fotógrafos'; end if;
  select id into v_user from auth.users where lower(email) = lower(p_email);
  if v_user is null then raise exception 'No existe un usuario con el correo %', p_email; end if;
  v_cuota := case when p_cuota_gb is null then null else p_cuota_gb::bigint * 1073741824 end;
  select id, estado into v_id, v_estado from public.fotografos where user_id = v_user;
  if v_id is null then
    insert into public.fotografos (user_id, slug, nombre, estado, cuota_bytes, email)
    values (v_user, lower(p_slug), p_nombre, 'activo', v_cuota, lower(p_email)) returning id into v_id;
  elsif v_estado = 'pendiente' then
    update public.fotografos set slug = lower(p_slug), nombre = p_nombre, estado = 'activo', cuota_bytes = v_cuota where id = v_id;
  else
    raise exception 'Ese usuario ya tiene una cuenta de fotógrafo (%)', v_estado;
  end if;
  return v_id;
end $$;

-- Fichas para usuarios que ya existían sin ficha (por ejemplo, cuentas creadas antes de esta migración).
update public.fotografos f set email = u.email from auth.users u where f.user_id = u.id and f.email is null;
