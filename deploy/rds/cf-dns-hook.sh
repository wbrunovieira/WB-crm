#!/usr/bin/env bash
# Hook de DNS-01 para o certbot usando a API da Cloudflare.
#
# Por que existe: as portas 80/443 do servidor só aceitam IPs da Cloudflare, e a
# Cloudflare força HTTPS na borda — então o desafio HTTP-01 não chega num domínio
# que ainda não tem certificado (ovo-e-galinha; a renovação funciona porque o cert
# antigo ainda serve o desafio). DNS-01 não depende de porta nem de HTTPS.
#
# Por que não o plugin dns-cloudflare: o do servidor é 0.39 (certbot 0.40), que só
# aceita a Global API Key legada; a credencial guardada é um API token moderno.
# Atualizar o pacote arriscaria a renovação de ~20 certificados em produção.
#
# Uso (o certbot chama com CERTBOT_DOMAIN / CERTBOT_VALIDATION no ambiente):
#   certbot certonly --manual --preferred-challenges dns \
#     --manual-auth-hook    "/usr/local/bin/cf-dns-hook.sh auth" \
#     --manual-cleanup-hook "/usr/local/bin/cf-dns-hook.sh cleanup" -d <dominio>
set -euo pipefail

CRED=/root/.secrets/certbot-cloudflare.ini
API=https://api.cloudflare.com/client/v4
ESTADO_DIR=/run/cf-dns-hook
PROPAGACAO=${CF_DNS_PROPAGATION:-30}

TOKEN=$(grep -E '^[[:space:]]*dns_cloudflare_api_token' "$CRED" | cut -d= -f2- | tr -d ' \r\n')
[ -n "$TOKEN" ] || { echo "sem token em $CRED" >&2; exit 1; }

cf() { # cf <metodo> <caminho> [corpo]
  local m=$1 p=$2 b=${3:-}
  if [ -n "$b" ]; then
    curl -sS -X "$m" "$API$p" -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" --data "$b"
  else
    curl -sS -X "$m" "$API$p" -H "Authorization: Bearer $TOKEN"
  fi
}

jq_campo() { python3 -c "import sys,json;d=json.load(sys.stdin);print($1)"; }

# A zona é o domínio registrável (dois últimos rótulos): sub.exemplo.com -> exemplo.com
zona_do_dominio() {
  echo "$1" | awk -F. '{ if (NF>=2) print $(NF-1)"."$NF; else print $0 }'
}

DOMINIO=${CERTBOT_DOMAIN:?CERTBOT_DOMAIN ausente}
REGISTRO="_acme-challenge.${DOMINIO}"
ZONA=$(zona_do_dominio "$DOMINIO")
ZONE_ID=$(cf GET "/zones?name=$ZONA" | jq_campo 'd["result"][0]["id"]')
[ -n "$ZONE_ID" ] || { echo "zona $ZONA não encontrada" >&2; exit 1; }

mkdir -p "$ESTADO_DIR"
ESTADO="$ESTADO_DIR/$DOMINIO"

case "${1:-auth}" in
  auth)
    VALOR=${CERTBOT_VALIDATION:?CERTBOT_VALIDATION ausente}
    ID=$(cf POST "/zones/$ZONE_ID/dns_records" \
      "{\"type\":\"TXT\",\"name\":\"$REGISTRO\",\"content\":\"$VALOR\",\"ttl\":60}" \
      | jq_campo 'd["result"]["id"] if d.get("success") else ""')
    [ -n "$ID" ] || { echo "falhou criar TXT $REGISTRO" >&2; exit 1; }
    echo "$ID" >> "$ESTADO"
    echo "TXT $REGISTRO criado ($ID); aguardando ${PROPAGACAO}s"
    sleep "$PROPAGACAO"
    ;;
  cleanup)
    # Remove todo TXT de desafio deste domínio, inclusive sobras de execuções anteriores.
    if [ -f "$ESTADO" ]; then
      while read -r id; do [ -n "$id" ] && cf DELETE "/zones/$ZONE_ID/dns_records/$id" >/dev/null || true; done < "$ESTADO"
      rm -f "$ESTADO"
    fi
    for id in $(cf GET "/zones/$ZONE_ID/dns_records?type=TXT&name=$REGISTRO" \
                  | jq_campo '" ".join(r["id"] for r in d.get("result",[]))'); do
      cf DELETE "/zones/$ZONE_ID/dns_records/$id" >/dev/null || true
    done
    echo "TXT $REGISTRO limpo"
    ;;
  *) echo "uso: $0 auth|cleanup" >&2; exit 2 ;;
esac
