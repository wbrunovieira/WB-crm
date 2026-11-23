#!/usr/bin/env bash
# Provisiona a instância RDS Transportes no servidor de produção.
#
# Idempotente: cada passo verifica antes de agir, então rodar de novo é seguro.
# NÃO toca nada do WB — diretório, banco, container, porta e subdomínios são próprios.
#
# Uso (como root, no servidor):   bash provision.sh
set -euo pipefail

DIR=/opt/wb-crm-rds
DB=crm_rds
CONTAINER=wb-crm-backend-rds
PM2_APP=wb-crm-rds
REPO=git@github.com:wbrunovieira/WB-crm.git

say() { printf '\n\033[1;34m==> %s\033[0m\n' "$1"; }

say "1/7  Banco $DB (database separado no crm_postgres)"
if docker exec crm_postgres psql -U "${POSTGRES_USER:-crm_user}" -lqt | cut -d\| -f1 | grep -qw "$DB"; then
  echo "    já existe — mantendo"
else
  docker exec crm_postgres createdb -U "${POSTGRES_USER:-crm_user}" "$DB"
  echo "    criado"
fi

say "2/7  Código em $DIR"
if [ -d "$DIR/.git" ]; then
  git -C "$DIR" fetch origin main && git -C "$DIR" reset --hard origin/main
  echo "    atualizado"
else
  git clone "$REPO" "$DIR"
  echo "    clonado"
fi

say "3/7  Envs (precisam existir — ver env.*.example)"
for f in "$DIR/.env" "$DIR/backend/.env"; do
  [ -f "$f" ] || { echo "    FALTA $f — copie do example e preencha os segredos"; exit 1; }
done
grep -q '^NEXT_PUBLIC_BRAND=rds' "$DIR/.env" || { echo "    .env sem NEXT_PUBLIC_BRAND=rds"; exit 1; }
echo "    ok"

say "4/7  Migrations no $DB"
cd "$DIR" && docker compose --profile backend run --rm backend npx prisma migrate deploy

say "5/7  Backend ($CONTAINER :3011)"
cd "$DIR" && docker compose --profile backend up -d --build backend
docker ps --filter "name=$CONTAINER" --format '    {{.Names}} {{.Status}}'

say "6/7  Frontend (build com BRAND=rds + PM2 $PM2_APP :3001)"
cd "$DIR" && npm ci --production=false && npm run build
if pm2 describe "$PM2_APP" >/dev/null 2>&1; then
  pm2 restart "$PM2_APP"
else
  cd "$DIR" && pm2 start npm --name "$PM2_APP" -- start
  pm2 save
fi

say "7/7  Nginx (os certs dos 2 subdomínios precisam existir em /etc/nginx/certs/)"
for d in crm-rds crm-rds-api; do
  cp "$DIR/deploy/rds/nginx-$d.conf" "/etc/nginx/sites-available/$d.wbdigitalsolutions.com.conf"
  ln -sf "/etc/nginx/sites-available/$d.wbdigitalsolutions.com.conf" "/etc/nginx/sites-enabled/"
done
nginx -t && systemctl reload nginx

say "Pronto. Falta criar o admin RDS (ver README) e apontar o DNS dos 2 subdomínios."
