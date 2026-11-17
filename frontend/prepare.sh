#!/bin/bash
# prepares the container for execution

set -e

# Valor mágico inlinado pelo `next build` (ARG NEXT_PUBLIC_BACKEND_URL do
# Dockerfile): um UUID que jamais colide com uma URL real. Valores NEXT_PUBLIC_*
# são gravados como string literal nos bundles no build time; este script os
# reescreve com o valor da env var no primeiro start do container — a mesma
# imagem serve qualquer deploy, sem rebuild.
MAGIC_BACKEND_URL=https://f5ec0edd-1434-4065-8985-ea01b832bc2c

if test -z "$NEXT_PUBLIC_BACKEND_URL"; then
  echo "[INIT] NEXT_PUBLIC_BACKEND_URL not set — defaulting to http://localhost:3010 (local testing only)"
  NEXT_PUBLIC_BACKEND_URL=http://localhost:3010
fi

if test "$NEXT_PUBLIC_BACKEND_URL" != "$MAGIC_BACKEND_URL"; then
  # injeta a NEXT_PUBLIC_BACKEND_URL, escapando backslashes e & para o sed
  # (https://stackoverflow.com/a/42356201); o delimitador | dispensa escapar /
  BACKEND_URL_ESCAPED=${NEXT_PUBLIC_BACKEND_URL//\\/\\\\}
  BACKEND_URL_ESCAPED=${BACKEND_URL_ESCAPED//&/\\&}
  echo "[INIT] injecting NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL into built assets"
  # chunks do cliente (.next/static) + bundles do servidor (.next/server):
  # o find cobre ambos; se a string mágica já foi substituída, é no-op
  find /app/.next -type f -exec sed -i "s|$MAGIC_BACKEND_URL|$BACKEND_URL_ESCAPED|g" {} +
fi

echo "[INIT] Done. Starting Node.js..."

# executa o CMD original (este script é o ENTRYPOINT do container)
exec "$@"
