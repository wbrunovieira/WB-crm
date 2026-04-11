#!/bin/bash
# Configura cron para poll de e-mails Gmail a cada 5 minutos
# Executar no servidor: bash deploy/scripts/setup-gmail-cron.sh

INTERNAL_KEY="${INTERNAL_API_KEY:-}"
CRM_URL="https://crm.wbdigitalsolutions.com"
LOG_FILE="/var/log/gmail-poll.log"

if [ -z "$INTERNAL_KEY" ]; then
  echo "AVISO: INTERNAL_API_KEY não definida. Lendo de /opt/wb-crm/.env.production..."
  INTERNAL_KEY=$(grep INTERNAL_API_KEY /opt/wb-crm/.env.production 2>/dev/null | cut -d= -f2 | tr -d '"')
fi

if [ -z "$INTERNAL_KEY" ]; then
  echo "ERRO: INTERNAL_API_KEY não encontrada. Configure a variável de ambiente."
  exit 1
fi

CRON_CMD="*/5 * * * * curl -s -X GET '${CRM_URL}/api/google/gmail-poll' -H 'x-internal-api-key: ${INTERNAL_KEY}' >> ${LOG_FILE} 2>&1"

# Remove entrada anterior se existir
(crontab -l 2>/dev/null | grep -v "gmail-poll" | crontab -) 2>/dev/null || true

# Adiciona nova entrada
(crontab -l 2>/dev/null; echo "$CRON_CMD") | crontab -

echo "Cron de Gmail poll configurado:"
crontab -l | grep gmail-poll
echo ""
echo "Logs em: $LOG_FILE"
