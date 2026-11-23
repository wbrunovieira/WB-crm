#!/usr/bin/env bash
# Deploy hook do certbot — instalar em /etc/letsencrypt/renewal-hooks/deploy/ (modo 700).
#
# Por que: o nginx deste servidor lê CÓPIAS dos certificados em
# /etc/nginx/certs/<domínio>/{fullchain.pem,key.pem}, não os arquivos do
# /etc/letsencrypt/live/. O cron só roda `certbot renew`, então sem este hook o
# nginx seguiria servindo o certificado antigo até alguém copiar à mão.
#
# Age só em domínios que já têm pasta em /etc/nginx/certs (não cria novas), então é
# seguro para todos os domínios do servidor.
set -euo pipefail
dom=$(basename "${RENEWED_LINEAGE:?}")
destino="/etc/nginx/certs/$dom"
[ -d "$destino" ] || exit 0
install -m 644 "$RENEWED_LINEAGE/fullchain.pem" "$destino/fullchain.pem"
install -m 600 "$RENEWED_LINEAGE/privkey.pem"   "$destino/key.pem"
logger -t certbot-deploy "cert de $dom copiado para $destino"
nginx -t >/dev/null 2>&1 && systemctl reload nginx || true
