#!/usr/bin/env bash
# Uso: sudo bash instalar_web.sh   (después de instalar Supabase)
set -euo pipefail
D=/volume2/docker/flashealo-web; S=/volume2/docker/flashealo-supabase
[ -d "$D" ] && { echo "STOP: $D ya existe"; exit 1; }
mkdir -p "$D" /volume1/flashealo-fotos && cd "$D"
git clone --depth 1 -b claude/esquema-nas https://github.com/flashealogrp-coder/Flashealo-app app
cp app/nas/docker-compose.yaml .
cat > .env <<ENV
MINIO_USER=flashealo
MINIO_PASSWORD=$(openssl rand -hex 20)
SITE_URL=https://www.flashealo.do
API_URL=https://api.flashealo.do
CDN_URL=https://cdn.flashealo.do
S3_URL=https://s3.flashealo.do
ANON_KEY=$(grep ^ANON_KEY= $S/.env | cut -d= -f2)
ENV
chmod 600 .env
sudo docker network inspect flashealo_net >/dev/null
sudo docker compose up -d --build
# bucket público de lectura
sleep 8
sudo docker run --rm --network flashealo_net --entrypoint sh minio/mc -c "mc alias set l http://flashealo-minio:9000 flashealo $(grep ^MINIO_PASSWORD .env|cut -d= -f2) && mc mb -p l/flashealo-fotos && mc anonymous set download l/flashealo-fotos"
sudo docker ps --filter name=flashealo
