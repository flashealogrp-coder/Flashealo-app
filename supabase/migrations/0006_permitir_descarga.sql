-- Flashealo · Interruptor por evento para que el cliente descargue las fotos en tamaño real.
-- Por defecto está apagado. Se puede ejecutar más de una vez sin problema.
alter table public.eventos add column if not exists permitir_descarga boolean not null default false;
-- El público necesita leer esta columna para mostrar (u ocultar) el botón de descarga.
grant select (permitir_descarga) on public.eventos to anon, authenticated;
