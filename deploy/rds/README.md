# Instância RDS Transportes

Segunda instância do CRM, para o negócio de frete. **Banco separado, deploy separado,
mesmo código** — a separação é física: um problema (ou um backup) de um negócio não
toca o outro.

| | WB Digital Solutions (consultoria) | RDS Transportes (frete) |
|---|---|---|
| frontend | crm.wbdigitalsolutions.com → PM2 `wb-crm` :3000 | crm-rds.wbdigitalsolutions.com → PM2 `wb-crm-rds` :3001 |
| API | crm-api.wbdigitalsolutions.com → :3010 | crm-rds-api.wbdigitalsolutions.com → :3011 |
| container | `wb-crm-backend` | `wb-crm-backend-rds` |
| banco | `crm_db` | `crm_rds` (mesmo Postgres, database separado) |
| diretório | /opt/wb-crm | /opt/wb-crm-rds |
| tema | roxo (`NEXT_PUBLIC_BRAND=wb`) | azul+laranja (`NEXT_PUBLIC_BRAND=rds`) |

**Subdomínios de 1 nível de propósito.** O TLS da Cloudflare cobre só um nível —
foi o que obrigou a migração de `api.crm.` para `crm-api.` antes. `rds.crm.` teria o
mesmo problema de certificado.

**Segredos próprios.** `JWT_SECRET` e `NEXTAUTH_SECRET` da RDS são diferentes dos do WB:
um token de uma instância não pode valer na outra.

## Provisionar (roda no servidor, uma vez)

Ver `provision.sh`. Em resumo: cria o database, clona o código, instala, builda com
`NEXT_PUBLIC_BRAND=rds`, aplica as migrations, cria o admin, sobe o backend e o PM2,
e publica os dois subdomínios no nginx com SSL.

## Certificados TLS

Emitidos por **DNS-01 na Cloudflare**, não HTTP-01. Motivo: as portas 80/443 do servidor
só aceitam IPs da Cloudflare e a borda força HTTPS, então o desafio HTTP-01 nunca chega
num domínio que **ainda não tem** certificado (renovação funciona porque o cert antigo
serve o desafio; emissão nova, não). DNS-01 não depende de porta nem de HTTPS.

O plugin `dns-cloudflare` do servidor é 0.39 (certbot 0.40) e só aceita a Global API Key
legada, enquanto a credencial guardada em `/root/.secrets/certbot-cloudflare.ini` é um API
token moderno. Atualizar o pacote arriscaria a renovação de ~20 certificados em produção,
então o DNS-01 é feito por `cf-dns-hook.sh`, que chama a API da Cloudflare direto.

- `cf-dns-hook.sh` → `/usr/local/bin/` (cria/remove o TXT `_acme-challenge`). O
  `provision.sh` instala e emite; os hooks ficam gravados na conf de renovação, então
  `certbot renew` (cron de segunda, 2h) renova sozinho.
- `certbot-deploy-hook.sh` → `/etc/letsencrypt/renewal-hooks/deploy/10-copiar-para-nginx.sh`.
  Copia o cert renovado para `/etc/nginx/certs/<domínio>/` e recarrega o nginx. Sem ele o
  nginx serviria o certificado velho após a renovação — lacuna que valia para **todos** os
  domínios do servidor, não só a RDS.
