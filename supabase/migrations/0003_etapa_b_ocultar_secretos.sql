-- ETAPA B (aplicar tras desplegar el frontend del PR #1): el público no lee claves ni embeddings.
revoke select on public.eventos from anon, authenticated;
grant select (id,nombre,descripcion,logo_url,banner_url,es_gratis,precio_galeria,fecha_evento,estado,created_at,tipo_reconocimiento,slug,portada_url,configuracion_ui,precio_foto,moneda,requiere_pago_para_ver,ubicacion,url_slug,titulo_about,categoria,url_portada,tiene_clave) on public.eventos to anon, authenticated;
revoke select on public.identities from anon, authenticated;
grant select (id,display_name,avatar_url,created_at,evento_id,dorsal,avatar_score) on public.identities to anon, authenticated;
revoke select on public.face_detections from anon, authenticated;
grant select (id,photo_url,identity_id,created_at,evento_id,bbox) on public.face_detections to anon, authenticated;
-- El admin necesita todo: política admin_all + privilegios completos para authenticated.
grant select on public.eventos, public.identities, public.face_detections to authenticated;
