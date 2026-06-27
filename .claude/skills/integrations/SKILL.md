---
name: integrations
description: Blueprint para adicionar/entender QUALQUER integração externa no WB-crm (WhatsApp/Evolution, GoTo, Gmail, transcritor, e novas). Use sempre que o usuário pedir para integrar um serviço externo (enviar/receber dados, webhook, API de terceiro), investigar uma integração existente, ou precisar das credenciais/URLs de produção (ex.: Evolution/WhatsApp). Traz o padrão DDD (port→adapter→use case→controller/cron), as convenções obrigatórias (webhook com secret, env em 2 lugares, migração em 2 pastas, idempotência) e a referência viva da Evolution (endpoints, env vars, onde ficam as chaves em prod e como buscá-las).
---

# Integrações externas no WB-crm

Toda integração com serviço externo (WhatsApp/Evolution, GoTo, Gmail, transcritor, etc.) segue o **mesmo blueprint DDD** no backend NestJS (`backend/src/domain/integrations/<servico>/`). Frontend Next.js só chama os endpoints do backend. Idioma do produto: pt-BR.

## Blueprint — anatomia de uma integração (copie a estrutura)

```
backend/src/domain/integrations/<servico>/
├── application/
│   ├── ports/<servico>.port.ts          # classe abstrata = contrato do cliente externo
│   └── use-cases/*.use-case.ts          # 1 classe por ação; retorna Either<Error, Result>; NUNCA importa Prisma
├── infra/
│   ├── <servico>-api.client.ts          # adapter concreto do port (faz os fetch HTTP)
│   ├── controllers/*.controller.ts      # rotas HTTP (envio autenticado por JWT; webhook público validado por secret)
│   └── scheduled/*-cron.service.ts      # @Cron para polling/catchup
├── enterprise/                          # value objects/entidades (validação de invariantes)
└── <servico>.module.ts                  # providers: { provide: XPort, useClass: XClient }, use cases, repos, crons
```

Regras (ver memórias [[feedback_ddd_layers]], [[feedback_no_prisma_in_controllers]]):
1. **Port → Adapter**: o use case depende da classe abstrata `XPort`; o módulo amarra `{ provide: XPort, useClass: XClient }`. Controllers e use cases **nunca** importam `PrismaService` (há teste de arquitetura que quebra o CI).
2. **Use case = orquestração**, retorna `Either<Error, T>` (nunca lança). **VO/entidade = validação**. **Controller = só HTTP**.
3. **Webhook de entrada**: rota pública `POST /webhooks/<servico>`, valida header secret (`process.env.X_WEBHOOK_SECRET`) e responde `200` rápido; o processamento pesado é fire-and-forget ou cai num cron.
4. **Idempotência**: ao gravar evento externo, use um ID único do provedor (ex.: `messageId @unique`) pra não duplicar.
5. **Env vars em 2 lugares**: documente em `backend/.env.example` e configure no container de prod. Segredos nunca no repo.
6. **Migração em 2 pastas**: se mexer no schema, criar em `backend/prisma/migrations/` **e** `prisma/migrations/` (ver [[feedback_backend_migrations]]). Deploy com schema usa `deploy-with-migrations.yml`.
7. **Cron interno** (`@Cron("*/5 * * * *")`) faz catchup/polling do que o webhook perdeu. Precisa `ScheduleModule` (já global no AppModule).
8. **TDD** pra código novo de backend (ver [[feedback_tdd_migration]], [[feedback_test_coverage_before_done]]): VO → use case (fakes in-memory) → e2e (DB de dev compartilhado, self-clean — [[feedback_e2e_shared_dev_db]]).
9. **Frontend**: um modal/componente chama `apiFetch("/​<servico>/...", token, {...})`; o backend faz a chamada externa (segredos só no servidor).

Exemplos no repo pra copiar: **whatsapp** (mais completo), **goto** (ver [[reference_goto_legs_fullduplex]] e [[reference_call_analysis_pipeline]]), **email/gmail**, **meet**, **google-places**. Transcritor compartilhado: `backend/src/infra/shared/transcriber/transcriber.service.ts` (`POST /transcriptions/audio|video`, `GET /transcriptions/{job}` e `/result`; env `TRANSCRIPTOR_BASE_URL`, `TRANSCRIPTOR_API_KEY` header `X-API-Key`, callback `POST /webhooks/transcription/complete` com `TRANSCRIBER_CALLBACK_SECRET`).

### Google Meu Negócio (Places)
Client `backend/src/domain/leads/infra/google-places.client.ts` → `POST https://places.googleapis.com/v1/places:searchText` (header `X-Goog-Api-Key` = env **`GOOGLE_PLACES_API_KEY`**, `X-Goog-FieldMask` com os campos). Exposto no CRM via `POST /leads/google-places/search` `{textQuery,pageToken?,languageCode?}` → `{places[],nextPageToken?}`; `priceLevel` vira 0-4; HTTP 429 = rate limit (`retryAfterSeconds`). Place→Lead: `POST /leads` com `googleId`(=placeId, único), `businessName`, endereço, `phone`, `website`, `rating`, `source:"google_places"`. Dedupe: `GET /leads/check-google-id?googleId=`. Frontend: `GoogleLeadsModal` (busca em lote) e `LeadGooglePlacesLinkModal` ("Vincular Google Places" no lead).

### Dar acesso de API a um bot externo
Ver a skill **`crm-bot-api`** (auth JWT com `JWT_SECRET`, base `https://api.crm.wbdigitalsolutions.com`, endpoints de leads/atividades/google-places, como cunhar token e criar usuário-bot).

---

## Referência viva: WhatsApp via Evolution API

Servidor de prod `45.90.123.190`. Evolution roda no mesmo servidor (Docker). Ver também [[reference_evolution_api]].

### Credenciais / config (PROD, confirmado 2026-06-27)
- **Container**: `evolution_api` (`evoapicloud/evolution-api:v2.3.7`), porta **127.0.0.1:8080** (só localhost — exposto via Nginx).
- **URL pública**: `https://evolution.wbdigitalsolutions.com` · **interna (rede docker)**: `http://evolution_api:8080`
- **API key** (`AUTHENTICATION_API_KEY`): **não versionar** — buscar ao vivo (ver "Buscar os valores ao vivo" abaixo) ou no env do container. Header **`apikey: <key>`** em toda chamada.
- **Instância**: `wbdigital` · **número conectado**: `5511982864581` (Bruno / WB) · state `open`.
- **Webhook GLOBAL**: `WEBHOOK_GLOBAL_ENABLED=true`, `WEBHOOK_GLOBAL_URL=http://n8n:5678/webhook/evolution` → **todos os eventos vão pro n8n**, não direto pro CRM.
- **Backend CRM** lê: `EVOLUTION_API_URL=http://evolution_api:8080`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE` (default `wbdigital`), `EVOLUTION_WEBHOOK_SECRET`, `EVOLUTION_DEFAULT_OWNER_ID`, `EVOLUTION_N8N_FORWARD_URL` (opcional).

**Buscar os valores ao vivo** (a chave pode rotacionar):
```bash
ssh root@45.90.123.190 'KEY=$(docker exec evolution_api env | grep ^AUTHENTICATION_API_KEY= | cut -d= -f2); echo $KEY; \
  curl -s http://localhost:8080/instance/fetchInstances -H "apikey: $KEY"'   # lista instâncias + número + estado
```

### Endpoints Evolution usados (adapter `evolution-api.client.ts`)
Base = `EVOLUTION_API_URL`, header `apikey`, `{instance}` = `wbdigital`.
| Ação | Método + path | Body |
|---|---|---|
| Enviar texto | `POST /message/sendText/{instance}` | `{ "number":"5511...", "text":"..." }` |
| Enviar mídia | `POST /message/sendMedia/{instance}` | `{ number, mediatype, media(base64), caption, fileName, mimetype }` |
| Enviar áudio (PTT) | `POST /message/sendWhatsAppAudio/{instance}` | `{ number, audio(base64), encoding:true }` |
| Baixar mídia recebida | `POST /chat/getBase64FromMediaMessage/{instance}` | `{ message: <payload> }` |
| Verificar nº tem WhatsApp | `POST /chat/whatsappNumbers/{instance}` | `{ numbers:["5511..."] }` → `[{exists,jid,...}]` |
| (receber/ler) buscar mensagens | `POST /chat/findMessages/{instance}` | filtro por `where.key.remoteJid` (Evolution v2) |
| (typing) presença | `POST /chat/sendPresence/{instance}` | usado no módulo campaigns |

**Número (`number`)**: só dígitos com DDI, sem `+` (ex.: `5511982864581`). JID = `<digits>@s.whatsapp.net`. Grupos (`@g.us`) são ignorados. Normalização: `normalizePhoneForWhatsApp()` (dígitos) e `normalizePhoneE164()` (ver [[project_phone_e164]]).

### Como o CRM ENVIA (rotas internas, JWT)
Frontend `WhatsAppSendModal.tsx` → backend `whatsapp.controller.ts`:
`POST /whatsapp/send` (texto), `/whatsapp/send-media`, `/whatsapp/send-audio` (multipart), `/whatsapp/check`, `/whatsapp/templates`, `/whatsapp/batch-check` (SSE). Use cases: `SendWhatsAppMessageUseCase` etc.

### Como o CRM RECEBE
Evolution → **n8n** (webhook global) → (forward) → CRM `POST /webhooks/whatsapp` (controller valida header `x-webhook-secret` = `EVOLUTION_WEBHOOK_SECRET`). Só processa `messages.upsert`. `HandleWhatsAppWebhookUseCase` → `ProcessWhatsAppMessageUseCase` grava `WhatsAppMessage` (idempotente por `messageId`) + cria/atualiza `Activity` (sessão de 2h) + notificação se for do cliente. Mídia de áudio/vídeo → transcrição (cron `*/30`).

### Pra um agente EXTERNO enviar/receber direto (sem passar pelo CRM)
- **Enviar** (simples): `POST {URL}/message/sendText/wbdigital` com `apikey` + `{number,text}`.
- **Receber**: a porta-webhook global já é do n8n. Opções: (a) **poll** `POST /chat/findMessages/wbdigital`; (b) ler o banco `evolution_postgres`; (c) o n8n repassar pro agente; (d) **criar uma instância separada** (outro número) com webhook próprio — **recomendado** se o agente não puder usar o número principal (senão mistura com as conversas reais de cliente do CRM).
