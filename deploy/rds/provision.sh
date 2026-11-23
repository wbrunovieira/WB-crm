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
REPO=https://github.com/wbrunovieira/WB-crm.git

say() { printf '\n\033[1;34m==> %s\033[0m\n' "$1"; }

say "1/8  Banco $DB (database separado no crm_postgres)"
if docker exec crm_postgres psql -U "${POSTGRES_USER:-crm_user}" -lqt | cut -d\| -f1 | grep -qw "$DB"; then
  echo "    já existe — mantendo"
else
  docker exec crm_postgres createdb -U "${POSTGRES_USER:-crm_user}" "$DB"
  echo "    criado"
fi

say "2/8  Código em $DIR"
if [ -d "$DIR/.git" ]; then
  git -C "$DIR" fetch origin main && git -C "$DIR" reset --hard origin/main
  echo "    atualizado"
else
  git clone "$REPO" "$DIR"
  echo "    clonado"
fi

say "3/8  Envs (precisam existir — ver env.*.example)"
for f in "$DIR/.env" "$DIR/backend/.env"; do
  [ -f "$f" ] || { echo "    FALTA $f — copie do example e preencha os segredos"; exit 1; }
done
grep -q '^NEXT_PUBLIC_BRAND=rds' "$DIR/.env" || { echo "    .env sem NEXT_PUBLIC_BRAND=rds"; exit 1; }
# Precisam estar no .env da RAIZ: é de lá que o compose interpola. Se faltarem, ele
# subiria o container como "wb-crm-backend" na 3010 e colidiria com a instância da WB.
for v in "BACKEND_CONTAINER=$CONTAINER" "BACKEND_PORT=3011"; do
  grep -q "^$v\$" "$DIR/.env" || { echo "    .env da raiz sem $v (o compose interpola de lá, não do backend/.env)"; exit 1; }
done
echo "    ok"

say "4/8  Schema no $DB"
# As 45 migrations são todas incrementais: a base histórica do projeto veio de um
# db push, então NÃO existe migração inicial que crie as tabelas — num banco vazio,
# `migrate deploy` morre em "relation leads does not exist". O CI faz o mesmo que
# aqui para o banco de teste efêmero (ver ci.yml).
#
# Banco novo  -> db push materializa o schema atual e as migrations são marcadas
#                como aplicadas, para os deploys seguintes aplicarem só as novas.
# Banco já com tabelas -> migrate deploy normal.
cd "$DIR"
# _prisma_migrations não conta: ela sozinha ainda é um banco vazio (e uma tentativa
# anterior que falhou deixa justamente ela, com o registro do erro).
TABELAS=$(docker exec crm_postgres psql -U "${POSTGRES_USER:-crm_user}" -d "$DB" -tAc \
  "select count(*) from information_schema.tables where table_schema='public' and table_name <> '_prisma_migrations'" | tr -d ' ')
if [ "${TABELAS:-0}" -eq 0 ]; then
  echo "    banco vazio — db push + baseline das migrations"
  # Zera histórico de tentativa anterior, senão o Prisma recusa por migração falhada (P3009).
  docker exec crm_postgres psql -U "${POSTGRES_USER:-crm_user}" -d "$DB" -qc \
    "drop table if exists _prisma_migrations" >/dev/null
  docker compose --profile backend run --rm backend npx prisma db push --skip-generate
  docker compose --profile backend run --rm backend sh -c '
    for d in prisma/migrations/*/; do
      m=$(basename "$d")
      npx prisma migrate resolve --applied "$m" >/dev/null 2>&1 || true
    done'
  echo "    baseline aplicado"
else
  echo "    banco com $TABELAS tabelas — migrate deploy"
  docker compose --profile backend run --rm backend npx prisma migrate deploy
fi
docker compose --profile backend run --rm backend npx prisma migrate status 2>&1 | tail -3 | sed 's/^/    /'

say "5/8  Backend ($CONTAINER :3011)"
cd "$DIR" && docker compose --profile backend up -d --build backend
docker ps --filter "name=$CONTAINER" --format '    {{.Names}} {{.Status}}'

say "6/8  Frontend (build com BRAND=rds + PM2 $PM2_APP :3005)"
cd "$DIR" && npm ci --production=false && npm run build
# A porta vai explícita no comando: `next start` NÃO lê PORT do .env, então sem isso
# ele cai no default 3000 — a porta da WB — e morre com EADDRINUSE.
if pm2 describe "$PM2_APP" >/dev/null 2>&1; then
  pm2 restart "$PM2_APP" --update-env
else
  cd "$DIR" && pm2 start npm --name "$PM2_APP" -- start -- -p 3005
  pm2 save
fi

say "7/8  Certificados TLS dos 2 subdomínios (DNS-01 na Cloudflare)"
# HTTP-01 não funciona aqui: o firewall só aceita IPs da Cloudflare e a borda força
# HTTPS, então o desafio não chega num domínio que ainda não tem cert. DNS-01 resolve.
install -m 700 "$DIR/deploy/rds/cf-dns-hook.sh" /usr/local/bin/cf-dns-hook.sh
for d in crm-rds crm-rds-api; do
  dom="$d.wbdigitalsolutions.com"
  if [ -f "/etc/letsencrypt/live/$dom/fullchain.pem" ]; then
    echo "    $dom — cert já existe"
  else
    certbot certonly --manual --preferred-challenges dns \
      --manual-auth-hook    "/usr/local/bin/cf-dns-hook.sh auth" \
      --manual-cleanup-hook "/usr/local/bin/cf-dns-hook.sh cleanup" \
      --manual-public-ip-logging-ok \
      -d "$dom" --cert-name "$dom" --non-interactive --agree-tos
    echo "    $dom — emitido"
  fi
  # O nginx lê cópias deste layout; o deploy hook as atualiza nas renovações.
  install -d -m 755 "/etc/nginx/certs/$dom"
  install -m 644 "/etc/letsencrypt/live/$dom/fullchain.pem" "/etc/nginx/certs/$dom/fullchain.pem"
  install -m 600 "/etc/letsencrypt/live/$dom/privkey.pem"   "/etc/nginx/certs/$dom/key.pem"
done

say "8/8  Nginx"
for d in crm-rds crm-rds-api; do
  cp "$DIR/deploy/rds/nginx-$d.conf" "/etc/nginx/sites-available/$d.wbdigitalsolutions.com.conf"
  ln -sf "/etc/nginx/sites-available/$d.wbdigitalsolutions.com.conf" "/etc/nginx/sites-enabled/"
done
nginx -t && systemctl reload nginx

say "Pronto. Falta criar o admin RDS (ver README)."
