# Frontend (Next.js) — build context: monorepo root (dedicated ignore file in
# frontend/Dockerfile.dockerignore).
#
# Multi-stage build:
#   deps    → node_modules in an isolated layer (in CI: deps-frontend image
#             with a content tag — package-lock/Dockerfile — rebuilt only when
#             they change)
#   builder → next build on top of the deps base
#   runtime → production image (next start)
#   test    → deps + Playwright chromium (in CI: test-frontend image used by
#             the e2e-frontend job — ~300MB of browser no longer downloaded
#             in every pipeline)
#
# FRONTEND_BASE_IMAGE/TEST_BASE_IMAGE: by default they point to the local
# `deps` stage. In CI we'll use the deps-backend image published in the
# registry, with cached dependencies.
#
# Note: node:22 (Debian) and not alpine because Playwright does not publish
# musl builds — chromium does not run on Alpine.

ARG FRONTEND_BASE_IMAGE=deps
ARG TEST_BASE_IMAGE=deps

# ─── Stage 1: deps ────────────────────────────────────────────────────────────
FROM node:22 AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci

# ─── Stage 2: builder ─────────────────────────────────────────────────────────
FROM ${FRONTEND_BASE_IMAGE} AS builder

WORKDIR /app

COPY . .

# Dummy env (same variables as the CI / GitHub workflow): `next build`
# evaluates these variables while pre-rendering. NOTE: NEXT_PUBLIC_* values
# are INLINED as string literals into the bundles at build time — that is why
# NEXT_PUBLIC_BACKEND_URL uses a MAGIC VALUE (UUID): the runtime prepare.sh
# (copied in below) replaces it with the real env var when the container
# first starts, making the image runtime-configurable for any deploy.
ARG NEXTAUTH_SECRET=ci-dummy-nextauth-secret
ARG NEXTAUTH_URL=http://localhost:3000
ARG BACKEND_URL=http://localhost:3010
ARG NEXT_PUBLIC_BACKEND_URL=https://f5ec0edd-1434-4065-8985-ea01b832bc2c
ARG WEBHOOK_SECRET=ci-dummy-webhook-secret
RUN npm run build

# ─── Stage 3: runtime ─────────────────────────────────────────────────────────
FROM node:22 AS runtime

WORKDIR /app

ENV NODE_ENV=production

# --chown=node:node: prepare.sh rewrites /app/.next on first start and
# `next start` keeps its cache in .next/cache — both must belong to the user
# running the container (node, UID 1000 — k8s requires runAsNonRoot).
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/next.config.js ./next.config.js

# Init that injects the real NEXT_PUBLIC_BACKEND_URL into the bundles before
# start (replaces the build-time magic value in every file of /app/.next).
COPY --chown=node:node frontend/prepare.sh /usr/local/bin/prepare.sh
RUN chmod +x /usr/local/bin/prepare.sh

# Numeric UID/GID of the `node` user (hadolint DL3066: names may not be
# resolvable by the host/runtime; matches runAsUser 1000 in k8s).
USER 1000:1000

EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/prepare.sh"]
CMD ["npm", "start"]

# ─── Stage 4: test (e2e) ──────────────────────────────────────────────────────
FROM ${TEST_BASE_IMAGE} AS test

# Playwright browsers for the version pinned in the base package-lock.
# --with-deps installs the (Debian) system libraries chromium needs.
RUN npx playwright install --with-deps chromium
