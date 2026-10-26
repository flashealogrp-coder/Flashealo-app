# Flashealo web + servicios del NAS (misma imagen: `web` y `derivadas`).
# Contexto de construcción: la raíz del repositorio (donde está package.json).
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_FOTOS_DOMINIO
ARG VITE_IA_ENDPOINT
ARG VITE_IA_PUBLICA
RUN test -n "$VITE_SUPABASE_URL" && test -n "$VITE_SUPABASE_ANON_KEY" && npm run build

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY nas/package.json ./package.json
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY nas/server.mjs ./server.mjs
COPY nas/lib ./lib
COPY nas/derivadas ./derivadas
# Los archivos pueden llegar con permisos restrictivos (UGOS/ACL): dejarlos legibles para el usuario `node`.
RUN chmod -R a+rX /app
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:${PORT:-3000}/healthz || exit 1
CMD ["node", "server.mjs"]
