-- Flashealo · Migración 0017 · Seis plantillas para la página pública del fotógrafo.
-- Qué hace:
--   1) `guardar_mi_plantilla` acepta: editorial, revista, mosaico, portada, collage, muro.
--   2) Las páginas que tenían 'oscura' pasan a 'portada' y las de 'minimal' a 'mosaico'.
-- Se puede ejecutar más de una vez sin problema.

create or replace function public.guardar_mi_plantilla(p_plantilla text) returns void
language plpgsql security definer set search_path to 'public' as $$
declare v_id uuid := public.mi_fotografo_id();
begin
  if v_id is null then raise exception 'No autorizado' using errcode = '42501'; end if;
  if p_plantilla is null or p_plantilla not in ('editorial','revista','mosaico','portada','collage','muro') then
    raise exception 'Plantilla inválida' using errcode = 'P0001';
  end if;
  update public.fotografos set perfil = jsonb_set(coalesce(perfil, '{}'::jsonb), '{plantilla}', to_jsonb(p_plantilla), true) where id = v_id;
end $$;
revoke all on function public.guardar_mi_plantilla(text) from public;
grant execute on function public.guardar_mi_plantilla(text) to authenticated;

update public.fotografos set perfil = jsonb_set(perfil, '{plantilla}', '"portada"') where perfil->>'plantilla' = 'oscura';
update public.fotografos set perfil = jsonb_set(perfil, '{plantilla}', '"mosaico"') where perfil->>'plantilla' = 'minimal';
