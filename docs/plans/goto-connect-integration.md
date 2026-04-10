# Plano de Integração — GoTo Connect VoIP

## Visão Geral

Integração do GoTo Connect ao WB-CRM para:
1. **Click-to-call**: clicar em qualquer número de telefone no CRM abre o GoTo e disca automaticamente
2. **Registro automático de ligações**: cada chamada concluída gera uma Atividade do tipo `call` no CRM vinculada ao Lead, Contato ou Partner correspondente

## Premissas

- API GoTo Connect **gratuita** com assinatura de ligações ativa
- Autenticação via **OAuth 2.0 Authorization Code** (conta corporativa única)
- Matching de número: o sistema busca Contact → Lead → Partner pelo número discado ou recebido
- Backend implementado em **TDD** (testes escritos antes do código de produção)
- Cada fase termina com **commit + push + deploy + teste em produção**
- Sync via polling a cada 15 min: `https://crm.wbdigitalsolutions.com/api/goto/sync`

## Referências da API GoTo

| Recurso | URL |
|---|---|
| Developer Portal | https://developer.goto.com/ |
| Base API | `https://api.goto.com/` |
| Auth URL | `https://authentication.logmeininc.com/oauth/authorize` |
| Token URL | `https://authentication.logmeininc.com/oauth/token` |
| Rate limit | 10 req/segundo |

**Scopes OAuth configurados:**
- `call-events.v1.notifications.manage`
- `call-events.v1.events.read`
- `cr.v1.read`

**Credenciais produção:**
- `Client ID`: `GOTO_CLIENT_ID_REDACTED`
- `Account Key`: `GOTO_ACCOUNT_KEY_REDACTED`
- OAuth Client redirect URI: `http://localhost:3000/api/goto/callback` (token obtido localmente e salvo no servidor)

---

## Fase 1 — Click-to-Call com `tel:` Links ✅ CONCLUÍDA

**Objetivo**: Qualquer número de telefone no CRM vira um link clicável. O GoTo (configurado como app padrão no macOS) abre e disca.

### O que foi implementado

- Componente `PhoneLink` em `/src/components/ui/phone-link.tsx`
  - Renderiza `<a href="tel:{número}">{número}</a>` com ícone de telefone
  - Sanitiza número para E.164 no `href`, exibe texto original
- Aplicado em: Lead, Contact, Organization, Partner (cards e páginas de detalhe)

### Testes

```
tests/unit/components/phone-link.test.tsx — 13 testes passando
```

### Observação de produção

GoTo precisa estar configurado como app padrão de chamadas no macOS. Sem essa configuração, o macOS abre o FaceTime/iPhone em vez do GoTo.

---

## Fase 2 — OAuth e Infraestrutura GoTo ✅ CONCLUÍDA

**Objetivo**: Autenticar com o GoTo via OAuth 2.0 e preparar a infra de tipos e serviços.

### O que foi implementado

#### Variáveis de ambiente (`.env` local e `/opt/wb-crm/.env` no servidor)

```env
GOTO_CLIENT_ID=GOTO_CLIENT_ID_REDACTED
GOTO_CLIENT_SECRET=GOTO_CLIENT_SECRET_REDACTED
GOTO_ACCOUNT_KEY=GOTO_ACCOUNT_KEY_REDACTED
GOTO_WEBHOOK_SECRET=GOTO_WEBHOOK_SECRET_REDACTED
GOTO_ACCESS_TOKEN=<renovado automaticamente>
GOTO_REFRESH_TOKEN=<válido por ~30 dias>
GOTO_TOKEN_EXPIRES_AT=<unix timestamp>
GOTO_DEFAULT_OWNER_ID=<userId do admin no banco>
```

#### Serviços GoTo (`/src/lib/goto/`)

- `types.ts` — todos os tipos TypeScript da API GoTo (tokens, participantes, relatórios, etc.)
  - `GoToReportParticipant.type` é um **objeto aninhado** com `value: "LINE" | "PHONE_NUMBER"`, não string direta
  - Para OUTBOUND: número discado em `type.callee.number`; para INBOUND: `type.number`
- `auth.ts` — `buildAuthorizationUrl()`, `exchangeCodeForTokens()`, `refreshAccessToken()`, `isTokenExpired()`
- `notification-channel.ts` — tentativa de criar webhook; descoberto que GoTo só suporta **WebSocket**, não HTTP webhook

#### API Routes

- `/src/app/api/goto/callback/route.ts` — recebe code do OAuth e pode trocar por tokens
- `/src/app/api/goto/webhook/route.ts` — mantido como fallback, mas não é chamado pelo GoTo

#### Como o token foi obtido

GoTo não suporta webhooks HTTP — apenas WebSocket para notificações. O token foi obtido via fluxo manual:
1. Executar `npm run dev` localmente
2. Acessar URL de autorização GoTo com redirect para `localhost:3000`
3. Capturar `code` da URL de callback
4. Trocar por tokens via `curl` com Basic auth (Client ID:Secret em base64)

### Testes

```
tests/unit/lib/goto/auth.test.ts              — 11 testes passando
tests/unit/lib/goto/notification-channel.test.ts — 9 testes passando
tests/integration/api/goto-webhook.test.ts    — 9 testes passando
```

---

## Fase 3 — Registro Automático via Polling ✅ CONCLUÍDA

**Objetivo**: Após cada ligação, criar automaticamente uma `Activity` do tipo `call` no CRM vinculada ao Lead, Contact ou Partner correspondente.

### Decisão de arquitetura: Polling em vez de Webhook

GoTo **não suporta HTTP webhooks** — a API `notification-channel/v1/channels` cria apenas canais WebSocket. Em vez de manter uma conexão WebSocket persistente em Next.js/PM2, adotou-se **polling via cron**:

- Cron no servidor: `*/15 * * * *` → `POST /api/goto/sync?secret=...`
- A rota busca relatórios de chamadas desde a última atividade GoTo salva no banco
- Idempotência via `gotoCallId` (campo `@unique` na tabela `activities`)

### O que foi implementado

#### Migration de banco

```sql
-- /prisma/migrations/20260410_add_goto_call_id_to_activity/migration.sql
ALTER TABLE "activities" ADD COLUMN "gotoCallId" TEXT;
CREATE UNIQUE INDEX "activities_gotoCallId_key" ON "activities"("gotoCallId") WHERE "gotoCallId" IS NOT NULL;
CREATE INDEX "activities_gotoCallId_idx" ON "activities"("gotoCallId");
```

#### Serviços

- `/src/lib/goto/number-matcher.ts`
  - Busca Contact → Lead → Partner pelo número discado
  - Usa **`regexp_replace` no PostgreSQL** para normalizar números armazenados (ex: `(71) 3599-7905` → `7135997905`) antes de comparar com as variações digit-only geradas a partir do número GoTo
  - Gera variações: com código país, sem código país, sem DDD, com prefixo `55`
  - Exporta `phoneVariations()` para testes diretos

- `/src/lib/goto/call-activity-creator.ts`
  - Recebe `GoToCallReport` e `ownerId`
  - Verifica idempotência (busca por `gotoCallId` antes de criar)
  - Calcula duração em segundos e formata como `8min 32s`
  - Subject: `Ligação realizada — +557135997905 (8min 32s)` ou `recebida`
  - Cria Activity com `type="call"`, `completed=true`, `gotoCallId` salvo

- `/src/lib/goto/call-report-syncer.ts`
  - Busca relatórios da API GoTo desde o `createdAt` da última Activity GoTo (–1 min de overlap)
  - Fallback de 24h se não houver activity anterior
  - Suporta paginação via `nextPageMarker`
  - Retorna `{ fetched, created, skipped }`

- `/src/lib/goto/token-manager.ts`
  - `getValidAccessToken()` — verifica expiração (buffer de 5 min), renova via `refresh_token` se necessário
  - Persiste novo token no `.env` do servidor via `sed` (best-effort)

#### API Routes

- `/src/app/api/goto/sync/route.ts`
  - `POST` com `?secret=` obrigatório
  - Chama `getValidAccessToken()` → `syncCallReports()` → retorna `{ ok, fetched, created, skipped }`

#### Cron job no servidor

```bash
*/15 * * * * curl -s -X POST "https://crm.wbdigitalsolutions.com/api/goto/sync?secret=823b47..." >> /var/log/goto-sync.log 2>&1
```

### Testes

```
tests/unit/lib/goto/number-matcher.test.ts        — 27 testes passando
  - prioridade: Contact > Lead > Partner
  - normalização via regexp_replace (testado com phoneVariations exportada)
  - 8 formatos de armazenamento cobertos: (71) 3599-7905, 71 3599-7905,
    +55 71..., 3599-7905 (local), 557135997905, etc.
  - isolamento por ownerId

tests/unit/lib/goto/call-activity-creator.test.ts — 13 testes passando
  - criação básica, duração, direção INBOUND/OUTBOUND
  - vinculação a Contact / Lead / Partner
  - idempotência (não duplica por gotoCallId)
  - resiliência (não lança exceção se matchPhoneToEntity falhar)

Total GoTo: 64 testes passando
```

### Resultado em produção

- 2 ligações de hoje (10/04/2026) para `+557135997905` criadas como Activities
- Ambas vinculadas ao Lead **Mosello Advocacia** (`leadId = cmltiow9o00f3g8c7b7md14fm`)
- Número armazenado: `(71) 3599-7905` — matched via regexp_replace

---

## Fase 3b — Distinção visual de atividades GoTo ✅ CONCLUÍDA

**Objetivo**: Diferenciar visualmente no CRM as atividades automáticas do GoTo das atividades agendadas manualmente.

### Comportamento

Atividades GoTo (`gotoCallId != null`) e atividades agendadas são **registros separados e independentes**:
- **Atividade agendada** → criada manualmente, fica pendente até o usuário concluir
- **Atividade GoTo** → criada automaticamente pelo sync, `completed=true`, somente leitura

O usuário pode ter uma atividade agendada "Ligar para Mosello" e fazer várias ligações pelo GoTo. As ligações aparecem como registros separados; a agendada permanece pendente até o usuário decidir conclui-la.

### Mudanças implementadas

#### `ActivityTimeline.tsx`

| Situação | Círculo | Badge |
|---|---|---|
| Ligação GoTo (auto-sync) | Azul + ícone telefone | `GoTo` (azul) |
| Atividade agendada (pendente) | Cinza + ícone do tipo | `Agendada` (amarelo) |
| Atividade manual concluída | Verde + checkmark | `Concluída` (verde) |

#### `LeadActivitiesList.tsx`

- `gotoCallId` adicionado ao tipo `Activity`
- Atividades GoTo: ícone azul fixo (sem toggle), badge `GoTo`, descrição técnica oculta, data mantida
- Botões de ação (toggle, falha, pular, associar contatos) desabilitados para GoTo
- Atividades normais: comportamento inalterado

---

## Fase 4 — Tela de Configuração GoTo (Admin)

**Objetivo**: Interface no painel admin para configurar credenciais GoTo e gerenciar a integração sem editar variáveis de ambiente manualmente.

> **Quando implementar**: após Fases 1–3 estáveis em produção.

### O que fazer

- Página `/dashboard/admin/integrations/goto`
  - Status da integração (conectado / token expirando / desconectado)
  - Botão "Reconectar com GoTo" — inicia fluxo OAuth
  - Lista das últimas atividades criadas automaticamente
  - Botão "Sincronizar agora" — dispara sync manual

- Armazenar credenciais GoTo no banco (tabela `Integration`) em vez de `.env`

### Testes (TDD)

```
tests/unit/actions/goto-integration.test.ts
  ✓ salva credenciais no banco
  ✓ retorna status de conexão corretamente
  ✓ apenas admin pode acessar configurações de integração

tests/integration/api/goto-oauth-callback.test.ts
  ✓ troca code por token corretamente
  ✓ salva tokens no banco
  ✓ redireciona para página de integração após sucesso
```

### Entrega da Fase 4

- [ ] Testes escritos e passando
- [ ] Página de configuração implementada
- [ ] `git commit -m "feat: goto connect admin configuration page"`
- [ ] Deploy

---

## Fase 5 — Auto-Dial com Retry Automático no Ocupado

**Objetivo**: Ao clicar em "Ligar com retry", o CRM aciona o GoTo desktop para discar via API. Se ocupado/sem resposta, aguarda delay e tenta novamente até o limite de tentativas.

> **Pré-requisito**: Fases 2 e 3 concluídas.

### Como funciona a API

```
POST https://api.goto.com/calls/v2/calls
Authorization: Bearer {access_token}

{ "dialString": "+557135997905", "from": { "lineId": "LINE_ID_DO_USUARIO" } }
```

**Detecção de resultado via códigos ISDN Q.850** (no `causeCode` do relatório):

| Código | Significado | Ação |
|---|---|---|
| `16` | Atendida | Parar — Fase 3 registra a atividade |
| `17` | Ocupado | Aguardar delay e tentar novamente |
| `18` / `19` | Sem resposta | Aguardar delay e tentar novamente |
| `21` | Rejeitada | Parar sem retry |

### O que fazer

- Novo scope OAuth: `calls.v2.initiate`
- Migration: tabela `CallRetrySession`
- `call-initiator.ts` — chama `POST /calls/v2/calls`
- `retry-engine.ts` — lógica de causeCode → próxima ação
- Webhook atualizado para detectar sessões de retry ativas
- Botão `CallWithRetryButton` com painel de status (polling a cada 5s)

### Testes (TDD)

```
tests/unit/lib/goto/call-initiator.test.ts
tests/unit/lib/goto/retry-engine.test.ts
tests/unit/actions/goto-retry.test.ts
tests/integration/api/goto-webhook-retry.test.ts
```

### Entrega da Fase 5

- [ ] Testes escritos e passando
- [ ] Migration `CallRetrySession` aplicada
- [ ] Implementação completa
- [ ] `git commit -m "feat: auto-dial with busy retry via goto calls v2 api"`
- [ ] Deploy (`deploy-with-migrations.yml`)

---

## Fase 6 — Gravação de Áudio, Player e Transcrição com Whisper

**Objetivo**: Baixar automaticamente o áudio das ligações GoTo, disponibilizar player no histórico e gerar transcrição com Whisper.

> **Pré-requisito**: Fase 3 concluída. Os relatórios GoTo já incluem `recordings[].id` nos participantes.

> **Atenção na implementação**: Antes de implementar, perguntar ao usuário como conectar com o modelo Whisper existente (API REST própria, SDK, fila, etc.).

### Como funciona

O relatório `GoToCallReport` já retorna `recordings[{ id, startTimestamp }]` em cada participante. Com o `recordingId`:

```
GET /recording/v1/recordings/{recordingId}/content
→ retorna o arquivo de áudio (MP3/WAV)
→ scope necessário: cr.v1.read (já configurado)
```

### O que fazer

- Migration: campos `recordingId`, `recordingPath`, `transcription`, `transcriptionStatus` na `Activity`
- `recording-downloader.ts` — download e armazenamento local em `/opt/wb-crm/recordings/`
- `/api/recordings/[activityId]` — serve áudio com autenticação e suporte a `Range` headers
- `transcription-worker.ts` — integração com Whisper (confirmar interface com o usuário)
- `CallRecordingPlayer.tsx` — player HTML5 + transcrição expansível no `ActivityTimeline`

### Testes (TDD)

```
tests/unit/lib/goto/recording-downloader.test.ts
tests/unit/lib/whisper/transcription-worker.test.ts
tests/unit/actions/recording.test.ts
tests/integration/api/recordings-route.test.ts
```

### Entrega da Fase 6

- [ ] Confirmar interface do Whisper com o usuário
- [ ] Testes escritos e passando
- [ ] Migration aplicada
- [ ] `git commit -m "feat: call recording download, audio player and whisper transcription"`
- [ ] Deploy (`deploy-with-migrations.yml`)

---

## Estado Atual da Produção

### Arquivos criados/modificados

```
src/components/ui/phone-link.tsx                    ← Fase 1
src/lib/goto/types.ts                               ← Fase 2/3
src/lib/goto/auth.ts                                ← Fase 2
src/lib/goto/notification-channel.ts                ← Fase 2
src/lib/goto/number-matcher.ts                      ← Fase 3
src/lib/goto/call-activity-creator.ts               ← Fase 3
src/lib/goto/call-report-syncer.ts                  ← Fase 3
src/lib/goto/token-manager.ts                       ← Fase 3
src/app/api/goto/callback/route.ts                  ← Fase 2
src/app/api/goto/webhook/route.ts                   ← Fase 2
src/app/api/goto/sync/route.ts                      ← Fase 3
src/components/activities/ActivityTimeline.tsx       ← Fase 3b
src/components/leads/LeadActivitiesList.tsx          ← Fase 3b
prisma/schema.prisma                                ← gotoCallId adicionado
prisma/migrations/20260410_add_goto_call_id_.../    ← migration aplicada
tests/unit/components/phone-link.test.tsx
tests/unit/lib/goto/auth.test.ts
tests/unit/lib/goto/notification-channel.test.ts
tests/unit/lib/goto/number-matcher.test.ts
tests/unit/lib/goto/call-activity-creator.test.ts
tests/integration/api/goto-webhook.test.ts
```

### Cron job ativo no servidor

```bash
*/15 * * * * curl -s -X POST "https://crm.wbdigitalsolutions.com/api/goto/sync?secret=823b47..." >> /var/log/goto-sync.log 2>&1
```

### Comandos úteis

```bash
# Sync manual imediato
SECRET=GOTO_WEBHOOK_SECRET_REDACTED
curl -s -X POST "https://crm.wbdigitalsolutions.com/api/goto/sync?secret=$SECRET"

# Verificar logs de sync no servidor
ssh root@45.90.123.190 "tail -50 /var/log/goto-sync.log"

# Ver atividades GoTo no banco
ssh root@45.90.123.190 "docker exec crm_postgres psql -U crm_user -d crm_db -c \
  \"SELECT subject, \\\"leadId\\\", \\\"gotoCallId\\\" FROM activities WHERE \\\"gotoCallId\\\" IS NOT NULL ORDER BY \\\"createdAt\\\" DESC LIMIT 10\""

# Renovar token manualmente se necessário
REFRESH=<valor do GOTO_REFRESH_TOKEN>
curl -s -X POST "https://authentication.logmeininc.com/oauth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -u "GOTO_CLIENT_ID_REDACTED:GOTO_CLIENT_SECRET_REDACTED" \
  -d "grant_type=refresh_token&refresh_token=$REFRESH"
```

---

## Sequência de Deploy

```
Fase 1    →  quick-deploy.yml           (sem migrations)
Fase 2    →  quick-deploy.yml           (sem migrations)
Fase 3    →  deploy-with-migrations.yml ✅ (gotoCallId adicionado)
Fase 3b   →  quick-deploy.yml           (só componentes) ✅
Fase 4    →  deploy-with-migrations.yml (nova tabela Integration)
Fase 5    →  deploy-with-migrations.yml (nova tabela CallRetrySession)
Fase 6    →  deploy-with-migrations.yml (campos recording* na Activity)
```
