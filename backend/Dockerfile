# Build context: raiz do monorepo (docker-compose context: .)
# Isso permite acessar tanto ./backend quanto ./prisma (schema compartilhado)

# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Instala dependências primeiro (cache layer separada do código)
COPY backend/package*.json ./
RUN npm ci

# Copia o schema Prisma da raiz do monorepo e gera o client
COPY prisma ./prisma
RUN npx prisma generate

# Copia o código do backend e compila TypeScript
COPY backend/ .
RUN NODE_OPTIONS="--max-old-space-size=2048" npm run build

# Remove devDependencies para o próximo stage
RUN npm prune --production

# ─── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /app

# Cria usuário não-root para segurança
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copia apenas o necessário do stage de build
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/prisma ./prisma
COPY --from=builder --chown=appuser:appgroup /app/package.json ./package.json

USER appuser

EXPOSE 3001

# Healthcheck interno
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT||3010) + '/health', r => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

CMD ["node", "dist/src/main.js"]
