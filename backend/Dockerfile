# Build context: raiz do monorepo (docker-compose context: .)
# O backend é dono do schema/migrations Prisma (backend/prisma); o frontend não
# usa mais Prisma.
#
# Multi-stage build:
#   deps    → dependências + client Prisma em layer isolada.
#   builder → compila TypeScript POR CIMA da base de deps.
#   runtime → imagem de produção.
#
# APP_BASE_IMAGE: by default it points to the local `deps` stage. In CI we'll
# use the deps-frontend image published in the registry, with cached
# dependencies.

ARG APP_BASE_IMAGE=deps

# ─── Stage 1: deps ────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps

WORKDIR /app

# Instala dependências primeiro (cache layer separada do código)
COPY backend/package*.json ./
RUN npm ci

# Copia o schema Prisma do backend e gera o client
COPY backend/prisma ./prisma
RUN npx prisma generate

# ─── Stage 2: builder ─────────────────────────────────────────────────────────
FROM ${APP_BASE_IMAGE} AS builder

WORKDIR /app

# Copia o código do backend e compila TypeScript.
# (node_modules e prisma/ já vieram da base; o COPY sobrepõe package.json e
# prisma/ com versões idênticas às da imagem de deps e adiciona src/, configs…)
COPY backend/ .
RUN npm run build && npm prune --production

# ─── Stage 3: runtime ─────────────────────────────────────────────────────────
FROM node:22-alpine3.24 AS runtime

WORKDIR /app

# tzdata: sem ele, a variavel TZ e IGNORADA EM SILENCIO no Alpine e o container continua em
# UTC. Foi o que fez o carimbo do WhatsApp marcar 11:23 no que aconteceu as 08:23 — e, pior,
# o dia virar as 21:00 de Brasilia, jogando negocio ganho no fim do mes para o mes seguinte.
RUN apk add --no-cache ffmpeg=8.1.3-r0 tzdata=2026f-r0

# Cria usuário não-root para segurança. UID/GID pinados — o resultado fica
# determinístico entre builds (o k8s usa runAsUser 100) e permite USER numérico
RUN addgroup -S -g 200 appgroup && adduser -S -u 100 -G appgroup appuser

# Copia apenas o necessário do stage de build
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/prisma ./prisma
COPY --from=builder --chown=appuser:appgroup /app/package.json ./package.json

USER 100:200

EXPOSE 3001

# Healthcheck interno
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD ["node", "-e", "require('http').get('http://localhost:' + (process.env.PORT||3010) + '/health', r => r.statusCode === 200 ? process.exit(0) : process.exit(1))"]

CMD ["node", "dist/main.js"]
