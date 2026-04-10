# Plano de Integração — GoTo Connect VoIP

## Visão Geral

Integração do GoTo Connect ao WB-CRM para:
1. **Click-to-call**: clicar em qualquer número de telefone no CRM abre o GoTo e disca automaticamente
2. **Registro automático de ligações**: cada chamada concluída gera uma Atividade do tipo `call` no CRM vinculada ao Lead, Contato ou Organização correspondente

## Premissas

- API GoTo Connect **gratuita** com assinatura de ligações ativa
- Autenticação via **OAuth 2.0 com conta corporativa única** (uma conta GoTo para todo o CRM)
- Matching de número: o sistema busca Lead/Contact/Organization pelo número discado ou recebido
- Backend implementado em **TDD** (testes escritos antes do código de produção)
- Cada fase termina com **commit + push + deploy + teste em produção**
- Webhook receiver em produção: `https://crm.wbdigitalsolutions.com/api/goto/webhook`

## Referências da API GoTo

| Recurso | URL |
|---|---|
| Developer Portal | https://developer.goto.com/ |
| Base API | `https://api.goto.com/` |
| Auth URL | `https://authentication.logmeininc.com/oauth/authorize` |
| Token URL | `https://authentication.logmeininc.com/oauth/token` |
| Rate limit | 10 req/segundo (gratuito) |

**Scopes OAuth necessários:**
- `call-events.v1.notifications.manage`
- `call-events.v1.events.read`
- `cr.v1.read`

---

## Fase 1 — Click-to-Call com `tel:` Links

**Objetivo**: Qualquer número de telefone no CRM vira um link clicável. O GoTo (configurado como app padrão no OS) abre e disca.

### O que fazer

- Criar componente `PhoneLink` em `/src/components/ui/phone-link.tsx`
  - Renderiza `<a href="tel:{número}">{número}</a>` com ícone de telefone
  - Formata número para E.164 (`+55...`) no `href`, exibe formatado no texto
- Aplicar `PhoneLink` em todos os lugares onde telefone aparece:
  - Card de Lead (`/src/components/leads/`)
  - Detalhe de Lead (`/src/app/(dashboard)/leads/[id]/`)
  - Card de Contact / detalhe
  - Card de Organization / detalhe
  - Card de Partner / detalhe

### Testes (TDD)

```
tests/unit/components/phone-link.test.tsx
  ✓ formata número brasileiro para E.164 no href
  ✓ exibe número formatado visualmente (ex: (11) 99999-9999)
  ✓ número já em E.164 não é duplicado
  ✓ número com caracteres especiais é sanitizado
  ✓ renderiza ícone de telefone
```

### Entrega da Fase 1

- [ ] Testes escritos e passando
- [ ] Componente implementado
- [ ] Aplicado em Lead, Contact, Organization, Partner
- [ ] `git add . && git commit -m "feat: click-to-call tel: links on all phone numbers" && git push`
- [ ] Deploy via Ansible (`quick-deploy.yml` — sem migrations)
- [ ] Teste em produção: clicar em número de Lead, confirmar que GoTo abre e disca

---

## Fase 2 — Webhook Receiver

**Objetivo**: Criar endpoint no Next.js que o GoTo chama quando eventos de chamada ocorrem. Criar infraestrutura de Notification Channel no GoTo apontando para produção.

### O que fazer

#### 2a. Variáveis de ambiente

Adicionar ao `.env` e `.env.example`:
```env
GOTO_CLIENT_ID=
GOTO_CLIENT_SECRET=
GOTO_ACCOUNT_KEY=
GOTO_WEBHOOK_SECRET=   # token gerado localmente para validar requests do GoTo
```

#### 2b. Serviço GoTo (`/src/lib/goto/`)

- `auth.ts` — obtém e renova access token via client_credentials ou authorization_code
- `notification-channel.ts` — cria Notification Channel no GoTo apontando para o webhook
- `types.ts` — tipos TypeScript dos payloads de eventos GoTo

#### 2c. API Route do webhook

`/src/app/api/goto/webhook/route.ts`
- Aceita `POST` do GoTo
- Responde `200` imediatamente ao ping de verificação do GoTo (`User-Agent: GoTo Notifications` com body vazio)
- Valida autenticidade da requisição
- Loga eventos recebidos (inicialmente apenas `console.log` — processamento real na Fase 3)

#### 2d. Script de setup

`/src/scripts/goto-setup.ts` (executado uma vez via `npx tsx`)
- Autentica com GoTo
- Cria Notification Channel apontando para `https://crm.wbdigitalsolutions.com/api/goto/webhook`
- Cria subscription para `call-events/v1` e `call-events-report/v1`
- Salva `channelId` e `subscriptionId` no `.env`

### Testes (TDD)

```
tests/unit/lib/goto/auth.test.ts
  ✓ obtém access token com client credentials
  ✓ renova token antes de expirar
  ✓ lança UnauthorizedError se credenciais inválidas

tests/unit/lib/goto/notification-channel.test.ts
  ✓ cria notification channel com URL correta
  ✓ retorna channelId

tests/integration/api/goto-webhook.test.ts
  ✓ responde 200 no ping de verificação do GoTo
  ✓ retorna 401 se request sem token válido
  ✓ retorna 200 para payload de evento válido
  ✓ retorna 400 para payload malformado
```

### Entrega da Fase 2

- [ ] Testes escritos e passando
- [ ] Serviços GoTo implementados
- [ ] Endpoint `/api/goto/webhook` funcional
- [ ] Variáveis de ambiente documentadas no `.env.example`
- [ ] `git commit -m "feat: goto connect webhook receiver and notification channel setup"`
- [ ] Deploy (`deploy-with-migrations.yml` se houver migration, senão `quick-deploy.yml`)
- [ ] Executar `goto-setup.ts` em produção para registrar o webhook no GoTo
- [ ] Teste: fazer uma ligação pelo GoTo, confirmar que o webhook recebe o evento (verificar logs do PM2: `pm2 logs wb-crm`)

---

## Fase 3 — Registro Automático de Atividade

**Objetivo**: Ao fim de cada ligação, criar automaticamente uma `Activity` do tipo `call` no CRM vinculada ao Lead, Contact ou Organization correspondente.

### O que fazer

#### 3a. Serviço de matching de número

`/src/lib/goto/number-matcher.ts`
- Recebe número de telefone (E.164 ou local)
- Busca no banco: Contact → Lead → Organization → Partner (nesta ordem de prioridade)
- Retorna `{ entityType, entityId, contactId? }` ou `null` se não encontrado
- Normaliza formatos: `(11) 99999-9999`, `11999999999`, `+5511999999999` → mesma busca

#### 3b. Serviço de criação de atividade

`/src/lib/goto/call-activity-creator.ts`
- Recebe CDR completo do GoTo (report da `call-events-report/v1`)
- Calcula duração em segundos (`callEnded - callCreated`)
- Determina `ownerId` pelo `extensionNumber` do participante LINE
- Chama `number-matcher` para encontrar a entidade
- Cria `Activity` via Prisma:
  ```typescript
  {
    type: "call",
    subject: `Ligação ${direction === "OUTBOUND" ? "realizada" : "recebida"} — ${formattedDuration}`,
    notes: `GoTo Call ID: ${conversationSpaceId}`,
    dueDate: callCreated,
    completed: true,
    completedAt: callEnded,
    // vincula à entidade encontrada:
    contactId?, leadId?, organizationId?, partnerId?,
    ownerId,
    metadata: { gotoCallId, direction, duration, dialedNumber }
  }
  ```

#### 3c. Atualizar webhook para processar eventos

Atualizar `/src/app/api/goto/webhook/route.ts`:
- Evento `ENDING` de `call-events/v1`: marcar chamada como em andamento de finalização
- Evento `REPORT_SUMMARY` de `call-events-report/v1`: chamar `call-activity-creator`

#### 3d. Migration de banco (se necessário)

Se o modelo `Activity` precisar de campo `gotoCallId` para idempotência:
```prisma
model Activity {
  // ...campos existentes
  gotoCallId  String?  @unique  // previne duplicação de atividade
}
```
Rodar `npm run db:migrate`.

### Testes (TDD)

```
tests/unit/lib/goto/number-matcher.test.ts
  ✓ encontra Contact por número exato
  ✓ encontra Contact normalizando formato brasileiro
  ✓ fallback para Lead quando Contact não encontrado
  ✓ fallback para Organization quando Lead não encontrado
  ✓ retorna null quando número não encontrado em nenhuma entidade
  ✓ respeita ownerId (não retorna entidades de outro usuário)

tests/unit/lib/goto/call-activity-creator.test.ts
  ✓ cria atividade OUTBOUND com duração correta
  ✓ cria atividade INBOUND com subject correto
  ✓ vincula atividade ao Contact quando encontrado
  ✓ vincula atividade ao Lead quando Contact não encontrado
  ✓ não cria atividade duplicada (mesmo gotoCallId)
  ✓ lança erro se ownerId não identificado

tests/integration/api/goto-webhook-processing.test.ts
  ✓ payload REPORT_SUMMARY cria Activity no banco
  ✓ payload repetido não duplica Activity
  ✓ número não encontrado no banco não gera erro 500 (apenas log)
```

### Entrega da Fase 3

- [ ] Testes escritos e passando
- [ ] `number-matcher` e `call-activity-creator` implementados
- [ ] Webhook atualizado para processar CDR
- [ ] Migration aplicada (se necessário)
- [ ] `git commit -m "feat: auto-create call activity from goto connect cdr"`
- [ ] Deploy (`deploy-with-migrations.yml`)
- [ ] Teste em produção:
  - Fazer ligação para número de um Lead cadastrado
  - Aguardar ~30s após fim da chamada
  - Confirmar que Activity aparece no timeline do Lead

---

## Fase 4 — Tela de Configuração GoTo (Admin)

**Objetivo**: Interface no painel admin para configurar as credenciais GoTo e gerenciar a integração sem precisar alterar variáveis de ambiente manualmente.

> **Quando implementar**: após as Fases 1–3 estarem estáveis em produção.

### O que fazer

- Página `/dashboard/admin/integrations/goto`
  - Formulário para inserir `Client ID`, `Client Secret`, `Account Key`
  - Botão "Conectar com GoTo" — inicia fluxo OAuth
  - Status da integração (conectado / desconectado, último evento recebido)
  - Botão para recriar Notification Channel manualmente (útil se o channel expirar)
  - Lista das últimas 10 atividades criadas automaticamente via GoTo

- Armazenar credenciais GoTo de forma segura (não em `.env`, mas em tabela `Integration` no banco criptografada)

### Testes (TDD)

```
tests/unit/actions/goto-integration.test.ts
  ✓ salva credenciais criptografadas no banco
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
- [ ] Teste em produção: reconfigurar integração pela UI sem tocar no servidor

---

## Fase 5 — Auto-Dial com Retry Automático no Ocupado

**Objetivo**: Ao clicar em "Ligar com retry", o CRM aciona o GoTo desktop para discar via API (sem WebRTC). Se a chamada terminar com ocupado ou sem resposta, o sistema aguarda um delay configurável e tenta novamente até atingir o limite de tentativas. Cada tentativa bem-sucedida gera uma Activity automaticamente (via Fase 3).

> **Pré-requisito**: Fases 2, 3 e 4 concluídas (webhook receiver, registro de atividade e credenciais OAuth configuradas).

### Como funciona a API

O GoTo tem dois endpoints de chamada com mecânicas distintas:
- `POST /web-calls/v1/calls` — WebRTC no browser (complexo, áudio no app)
- `POST /calls/v2/calls` — aciona o **GoTo desktop** para discar (simples, sem WebRTC)

Usamos o segundo. O CRM envia o número e o `lineId` do usuário; o GoTo desktop abre e disca:

```json
POST https://api.goto.com/calls/v2/calls
Authorization: Bearer {access_token}

{
  "dialString": "+557135997905",
  "from": { "lineId": "LINE_ID_DO_USUARIO" }
}
```

**Detecção de ocupado** via códigos de causa ISDN Q.850 no relatório pós-chamada:

| Código | Significado | Ação do retry |
|---|---|---|
| `16` | Atendida normalmente | Parar — Fase 3 registra a atividade |
| `17` | Ocupado (`USER_BUSY`) | Aguardar delay e tentar novamente |
| `18` / `19` | Sem resposta (`NO_ANSWER`) | Aguardar delay e tentar novamente |
| `21` | Rejeitada | Parar sem retry |

### O que fazer

#### 5a. Novo scope OAuth

Adicionar scope `calls.v2.initiate` ao OAuth Client no GoTo Developer Portal.

#### 5b. Migration de banco — tabela `CallRetrySession`

```prisma
model CallRetrySession {
  id              String    @id @default(cuid())
  entityType      String    // "lead" | "contact" | "organization" | "partner"
  entityId        String
  dialNumber      String    // número discado
  lineId          String    // lineId GoTo do usuário
  maxAttempts     Int       @default(5)
  delaySeconds    Int       @default(45)
  attemptCount    Int       @default(0)
  status          String    @default("pending") // pending | dialing | waiting | completed | cancelled | failed
  lastCauseCode   Int?      // último código ISDN Q.850
  lastCallId      String?   // último conversationSpaceId GoTo
  nextAttemptAt   DateTime?
  completedAt     DateTime?
  ownerId         String
  owner           User      @relation(fields: [ownerId], references: [id])
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

#### 5c. Server Action — iniciar sessão de retry

`/src/actions/goto-retry.ts`
- `startCallRetry(entityType, entityId, dialNumber, options)` — cria `CallRetrySession` e dispara primeira tentativa
- `cancelCallRetry(sessionId)` — cancela sessão em andamento
- `getCallRetryStatus(sessionId)` — retorna status atual para polling da UI

#### 5d. Serviço de discagem

`/src/lib/goto/call-initiator.ts`
- `initiateCall(dialNumber, lineId, accessToken)` — chama `POST /calls/v2/calls` e retorna `conversationSpaceId`
- `getUserLineId(userId)` — busca `lineId` GoTo do usuário via `GET /voice-admin/v1/lines`

#### 5e. Lógica de retry no webhook

Atualizar `/src/app/api/goto/webhook/route.ts`:
- Ao receber `REPORT_SUMMARY`, verificar se o `conversationSpaceId` pertence a uma `CallRetrySession` ativa
- Checar código de causa (`16` → concluído, `17/18/19` → agendar próxima tentativa, `21` → cancelar)
- Se retry: atualizar `attemptCount`, `nextAttemptAt`, `status = "waiting"`
- Disparar próxima tentativa via `setTimeout` server-side ou registrar em fila

#### 5f. Componente UI — botão com retry

`/src/components/ui/call-with-retry-button.tsx` (client component)
- Dropdown no número de telefone:
  - "Ligar agora" → `tel:` link (Fase 1)
  - "Ligar com retry automático" → inicia sessão de retry
- Painel de status (polling a cada 5s em `getCallRetryStatus`):

```
┌──────────────────────────────────────┐
│ 📞 Tentativa 2 de 5                  │
│ Ocupado — próxima em 38s             │
│ ████████████░░░░░░░░░  [Cancelar]    │
└──────────────────────────────────────┘
```

- Ao completar: "✅ Chamada atendida — atividade registrada" ou "❌ Limite atingido sem resposta"

#### 5g. Configurações por usuário

Salvar na tabela `User` (ou `Integration`):
- `gotoLineId` — lineId GoTo do usuário (preenchido na Fase 4 ou manualmente)
- Padrão de tentativas e delay configurável na UI de admin

### Testes (TDD)

```
tests/unit/lib/goto/call-initiator.test.ts
  ✓ chama POST /calls/v2/calls com dialNumber e lineId corretos
  ✓ retorna conversationSpaceId da resposta
  ✓ lança erro se lineId não configurado
  ✓ lança UnauthorizedError se token inválido

tests/unit/lib/goto/retry-engine.test.ts
  ✓ cause code 16 → status "completed", sem nova tentativa
  ✓ cause code 17 → status "waiting", agendamento de nova tentativa
  ✓ cause code 18 → status "waiting", agendamento de nova tentativa
  ✓ cause code 21 → status "cancelled", sem nova tentativa
  ✓ attemptCount >= maxAttempts → status "failed", sem nova tentativa
  ✓ cancelCallRetry muda status para "cancelled" e impede próxima tentativa

tests/unit/actions/goto-retry.test.ts
  ✓ startCallRetry cria CallRetrySession no banco
  ✓ startCallRetry respeita ownerId do usuário logado
  ✓ cancelCallRetry apenas o dono pode cancelar
  ✓ getCallRetryStatus retorna dados corretos por sessionId

tests/integration/api/goto-webhook-retry.test.ts
  ✓ REPORT_SUMMARY com cause 17 atualiza sessão e agenda retry
  ✓ REPORT_SUMMARY com cause 16 finaliza sessão como "completed"
  ✓ sessão cancelada ignora REPORT_SUMMARY subsequente
  ✓ limite de tentativas atingido muda status para "failed"
```

### Entrega da Fase 5

- [ ] Testes escritos e passando
- [ ] Migration `CallRetrySession` aplicada
- [ ] `call-initiator.ts` e `retry-engine.ts` implementados
- [ ] Webhook atualizado para processar retry
- [ ] Botão `CallWithRetryButton` implementado e aplicado em Lead/Contact/Organization/Partner
- [ ] `git commit -m "feat: auto-dial with busy retry via goto calls v2 api"`
- [ ] Deploy (`deploy-with-migrations.yml`)
- [ ] Teste em produção:
  - Ligar para número ocupado, confirmar que UI mostra "Tentativa 2 de 5"
  - Confirmar que ao atender, Activity é criada automaticamente
  - Confirmar que botão Cancelar interrompe o ciclo

---

## Fase 6 — Gravação de Áudio, Player e Transcrição com Whisper

**Objetivo**: Após cada ligação, baixar automaticamente o arquivo de áudio do GoTo, armazená-lo, disponibilizar um player diretamente no histórico de atividades do CRM e gerar a transcrição em texto usando o modelo Whisper já utilizado em outro app do usuário.

> **Pré-requisito**: Fase 3 concluída (registro automático de atividade via webhook). A gravação é baixada no mesmo fluxo do webhook `REPORT_SUMMARY`.

> **Atenção na implementação**: Antes de implementar a integração com o Whisper, perguntar ao usuário como prefere conectar com o modelo existente — pode ser via API HTTP, SDK compartilhado, chamada direta ao serviço, ou outra forma. Não assumir a interface sem confirmar.

### Como funciona a API de Gravação do GoTo

O relatório pós-chamada (`REPORT_SUMMARY`) inclui, desde fev/2025, um campo `recordings[]` nos participantes com o `recordingId`. Com ele:

```
GET /recording/v1/recordings/{recordingId}/content
→ retorna o arquivo de áudio (MP3 ou WAV)
→ scope necessário: cr.v1.read (já planejado nas fases anteriores)
```

Não há URLs assinadas — o download exige o Bearer token OAuth ativo, então o áudio é baixado server-side e armazenado no servidor do CRM.

### O que fazer

#### 6a. Storage de áudio

Definir onde os arquivos de áudio ficam armazenados:
- **Opção A — filesystem local** no servidor (`/opt/wb-crm/recordings/`), servido via rota Next.js protegida por auth
- **Opção B — S3/R2** (Cloudflare R2 ou AWS S3) com URL assinada por tempo limitado

> Recomendação: Opção A para começar (sem custo adicional, servidor já existe). Migrar para S3 se o volume crescer.

#### 6b. Migration de banco — campos na `Activity`

```prisma
model Activity {
  // ...campos existentes
  recordingId        String?   // recordingId do GoTo
  recordingPath      String?   // caminho local ou URL do storage
  recordingDuration  Int?      // duração em segundos
  transcription      String?   // texto completo da transcrição
  transcriptionStatus String?  @default("pending") // pending | processing | done | failed
}
```

#### 6c. Serviço de download de gravação

`/src/lib/goto/recording-downloader.ts`
- `downloadRecording(recordingId, accessToken)` — chama `GET /recording/v1/recordings/{id}/content`, retorna buffer do áudio
- `saveRecording(buffer, activityId)` — salva no filesystem em `/opt/wb-crm/recordings/{activityId}.mp3` e retorna o path
- Integrado ao webhook da Fase 3: após criar a `Activity`, verifica se `recordings[]` existe no relatório e dispara o download

#### 6d. Rota de streaming de áudio (protegida)

`/src/app/api/recordings/[activityId]/route.ts`
- Verifica sessão do usuário e ownership da Activity
- Serve o arquivo de áudio com headers corretos (`Content-Type: audio/mpeg`, `Accept-Ranges: bytes`) para suportar seek no player
- Nunca expõe o path real do filesystem

#### 6e. Serviço de transcrição

`/src/lib/whisper/transcriber.ts`

> **NOTA PARA IMPLEMENTAÇÃO**: antes de escrever este serviço, perguntar ao usuário:
> - Como o Whisper está hospedado no outro app? (API REST própria, OpenAI API, self-hosted, etc.)
> - Qual o endpoint/interface de entrada? (URL + auth? SDK? fila de mensagens?)
> - O retorno já vem com timestamps por segmento ou só texto puro?

Interface esperada (a confirmar com o usuário):
```typescript
interface TranscriptionResult {
  text: string           // texto completo
  segments?: Array<{     // opcional: trechos com timestamps
    start: number        // segundos
    end: number
    text: string
  }>
  language?: string      // idioma detectado
}

async function transcribeAudio(audioPath: string): Promise<TranscriptionResult>
```

#### 6f. Worker de transcrição

`/src/lib/whisper/transcription-worker.ts`
- Chamado após `saveRecording()` de forma assíncrona (não bloqueia o webhook)
- Atualiza `Activity.transcriptionStatus = "processing"`
- Envia áudio para o Whisper e aguarda resultado
- Salva `Activity.transcription` e `Activity.transcriptionStatus = "done"`
- Em caso de erro: `transcriptionStatus = "failed"` (sem crash do webhook)

#### 6g. Componente UI — Player + Transcrição

`/src/components/activities/CallRecordingPlayer.tsx` (client component)

```
┌─────────────────────────────────────────────┐
│ 📞 Ligação realizada — 8min 32s             │
│ 10/04/2026 às 10:23 · Bruno → (71) 3599-7905│
│                                             │
│  ▶ ──────────────────────── 8:32  ⬇ baixar │
│                                             │
│ 📝 Transcrição                        ▼    │
│  Boa tarde, falo com João da Mosello?       │
│  Sim, pode falar.                           │
│  Estava entrando em contato sobre...        │
│                                             │
│  ⏳ Processando transcrição...              │  ← estado intermediário
└─────────────────────────────────────────────┘
```

- Player HTML5 nativo (`<audio>`) apontando para `/api/recordings/{activityId}`
- Botão de download do áudio original
- Seção de transcrição expansível/colapsável
- Estados: `pending` (aguardando gravação), `processing` (spinner), `done` (texto), `failed` (mensagem de erro + botão retry)
- Polling a cada 5s enquanto `transcriptionStatus === "processing"`

Integrado ao `ActivityTimeline` existente — aparece apenas em activities do tipo `call` que tenham `recordingId`.

### Testes (TDD)

```
tests/unit/lib/goto/recording-downloader.test.ts
  ✓ chama GET /recording/v1/recordings/{id}/content com Bearer token
  ✓ salva arquivo no path correto
  ✓ retorna path do arquivo salvo
  ✓ lança erro se recordingId inválido (404 do GoTo)
  ✓ não falha o webhook se download falhar (erro isolado)

tests/unit/lib/whisper/transcription-worker.test.ts
  ✓ atualiza transcriptionStatus para "processing" antes de chamar Whisper
  ✓ salva texto da transcrição e status "done" ao completar
  ✓ salva status "failed" se Whisper retornar erro
  ✓ não lança exceção — erros são capturados e logados

tests/unit/actions/recording.test.ts
  ✓ apenas dono da Activity pode acessar gravação
  ✓ Activity sem recordingPath retorna 404

tests/integration/api/recordings-route.test.ts
  ✓ retorna 401 sem sessão
  ✓ retorna 403 se Activity pertence a outro usuário
  ✓ retorna stream de áudio com Content-Type correto
  ✓ suporta header Range para seek no player
```

### Entrega da Fase 6

- [ ] Confirmar com o usuário a interface do Whisper antes de implementar
- [ ] Testes escritos e passando
- [ ] Migration com campos de gravação na `Activity` aplicada
- [ ] `recording-downloader.ts` integrado ao webhook da Fase 3
- [ ] Rota `/api/recordings/[activityId]` implementada e protegida
- [ ] `transcription-worker.ts` implementado (após confirmar interface Whisper)
- [ ] `CallRecordingPlayer` integrado ao `ActivityTimeline`
- [ ] `git commit -m "feat: call recording download, audio player and whisper transcription"`
- [ ] Deploy (`deploy-with-migrations.yml`)
- [ ] Teste em produção:
  - Fazer ligação de teste
  - Confirmar que áudio aparece no histórico de atividades do Lead
  - Confirmar que player reproduz o áudio sem baixar
  - Confirmar que transcrição aparece após processamento

---

## Sequência de Deploy por Fase

```
Fase 1  →  quick-deploy.yml           (sem migrations)
Fase 2  →  quick-deploy.yml           (sem migrations)
Fase 3  →  deploy-with-migrations.yml (com migration se gotoCallId adicionado)
Fase 4  →  deploy-with-migrations.yml (nova tabela Integration)
Fase 5  →  deploy-with-migrations.yml (nova tabela CallRetrySession)
Fase 6  →  deploy-with-migrations.yml (campos recording* e transcription* na Activity)
```

## Comandos de Deploy (referência)

```bash
cd deploy/ansible

# Deploy sem migrations
ansible-playbook -i inventory/production.yml playbooks/quick-deploy.yml

# Deploy com migrations (faz backup automático antes)
ansible-playbook -i inventory/production.yml playbooks/deploy-with-migrations.yml

# Verificar logs do webhook em produção
ssh root@45.90.123.190 "pm2 logs wb-crm --lines 50"
```

## Checklist de Pré-requisitos (fazer antes de começar)

- [ ] Criar conta no GoTo Developer Portal: https://developer.goto.com/
- [ ] Criar OAuth Client com os scopes: `call-events.v1.notifications.manage`, `call-events.v1.events.read`, `cr.v1.read`, `calls.v2.initiate` (necessário na Fase 5), `users.v1.lines.read` (necessário na Fase 5)
- [ ] Anotar `Client ID` e `Client Secret` (mostrado apenas uma vez)
- [ ] Identificar `Account Key` da conta GoTo (disponível no Developer Portal após autenticar)
- [ ] Confirmar que `crm.wbdigitalsolutions.com` está acessível via HTTPS (necessário para GoTo enviar webhooks)
