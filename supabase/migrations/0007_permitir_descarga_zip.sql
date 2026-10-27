-- Flashealo · Segundo interruptor por evento: descargar TODA la colección en un zip (independiente de la descarga foto por foto).
-- Por defecto apagado. Se puede ejecutar más de una vez sin problema.
alter table public.eventos add column if not exists permitir_descarga_zip boolean not null default false;
grant select (permitir_descarga_zip) on public.eventos to anon, authenticated;
