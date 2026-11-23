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
