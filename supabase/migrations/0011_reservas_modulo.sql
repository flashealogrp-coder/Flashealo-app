-- Flashealo · Migración 0011 · Las reservas de cada fotógrafo viven en el módulo reservas.flashealo.do/<carpeta>.
-- Qué hace:
--   1) Amplía las carpetas reservadas: ninguna cuenta puede llamarse como una página del módulo de reservas.
--   2) Retira `crear_reserva` (la 0010): las reservas ya no se guardan en esta base sino en la carpeta de datos de cada
--      fotógrafo dentro del módulo, que las mantiene separadas por completo. Menos puertas abiertas al público.
-- Se puede ejecutar más de una vez sin problema.

alter table public.fotografos drop constraint if exists fotografos_slug_reservado;
alter table public.fotografos add constraint fotografos_slug_reservado check (
  slug !~ '^(admin|www|api|g|f|sport|portal|soporte|ayuda|app|cliente|mis-resultados|inicio|login|registro|directorio|reservas|estudio|evento|static|cal|healthz|manifest)$');

drop function if exists public.crear_reserva(text, text, text, text, text, date, text, boolean);
