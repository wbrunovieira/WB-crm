# Plano: Backend NestJS + Automação WhatsApp

**Status:** Planejamento  
**Data de criação:** 2026-04-16  
**Referência de arquitetura:** `/Users/brunovieira/projects/wb-customer/backend`

---

## Visão Geral

O CRM atual funciona como Next.js full-stack (49 server actions, ~13k linhas, 74 modelos Prisma).
Para suportar automação de campanhas WhatsApp com workers, filas lógicas e delays, precisamos de um
processo separado que não bloqueie a UI e que possa escalar independentemente.

**Estratégia: Strangler Fig Pattern**
- O backend NestJS nasce ao lado do Next.js — **sem substituir nada**
- Os dados ficam no **mesmo banco PostgreSQL** — sem migração de dados
- O CRM Next.js continua 100% operacional durante toda a transição
- O NestJS começa servindo **apenas o módulo de campanhas WhatsApp**
- Futuras features (leads API, integração IA) migram gradualmente

### ⚠️ Garantia de Dados

> **Não perdemos nenhum dado.** O NestJS usa o mesmo `DATABASE_URL` e o mesmo schema Prisma.
> Nenhuma migração destrutiva é feita. As novas tabelas (campaigns, campaign_steps, etc.)
> são adicionadas via `prisma migrate` com rollback seguro. O CRM Next.js continua lendo e
> escrevendo normalmente durante toda a fase de implementação.

---

## Fase 1 — Backend NestJS (`/backend`)

### Objetivo
Criar a estrutura base do backend NestJS com DDD + Clean Architecture, CI/CD e TDD,
pronto para receber o módulo de campanhas WhatsApp.

### Sub-fases com checkpoint GitHub

---

#### 1.1 — Scaffolding e Configuração Base

**Entregáveis:**
- `/backend` inicializado com `@nestjs/cli`
- Mesma arquitetura de pastas do `wb-customer/backend`
- Variáveis de ambiente com Zod (mesmo padrão do projeto de referência)
- Vitest configurado (unit + e2e)
- Classes `core/` portadas: `Entity`, `AggregateRoot`, `UniqueEntityID`, `Either`
- Prisma apontando para o mesmo `DATABASE_URL` do CRM
- **`backend/Dockerfile`** (multi-stage: builder + runtime alpine, usuário não-root)
- **`docker-compose.yml`** atualizado com serviço `backend` (perfil `backend`, porta 3001, depende do `postgres` healthy)
- `backend/.env` com variáveis de ambiente do backend

**Estrutura de pastas:**
```
backend/
├── src/
│   ├── core/
│   │   ├── entity.ts
│   │   ├── aggregate-root.ts
│   │   ├── unique-entity-id.ts
│   │   ├── either.ts
│   │   └── domain/
│   │       └── events/
│   │           ├── domain-event.interface.ts
│   │           └── domain-events.ts
│   ├── domain/
│   │   └── (módulos de domínio — vazio no 1.1)
│   ├── infra/
│   │   ├── database/
│   │   │   ├── prisma/
│   │   │   │   ├── prisma.service.ts
│   │   │   │   ├── mappers/
│   │   │   │   └── repositories/
│   │   │   └── database.module.ts
│   │   ├── controllers/
│   │   ├── modules/
│   │   ├── filters/
│   │   │   └── all-exceptions.filter.ts
│   │   └── auth/
│   │       └── (jwt guard, decorators)
│   ├── env/
│   │   └── index.ts        ← Zod schema de variáveis de ambiente
│   ├── app.module.ts
│   └── main.ts
├── test/
│   ├── unit/               ← in-memory repositories, sem banco
│   └── e2e/                ← schema isolado por teste
├── prisma/
│   └── schema.prisma       ← symlink ou cópia gerenciada do schema raiz
├── vitest.config.ts
├── vitest.e2e.config.ts
├── package.json
└── tsconfig.json
```

**Testes TDD nesta sub-fase:**
```
test/unit/core/entity.spec.ts
test/unit/core/aggregate-root.spec.ts
test/unit/core/either.spec.ts
test/unit/core/unique-entity-id.spec.ts
```

**Critério de aceite:**
- `npm run test` passa (todas as classes core)
- `npm run build` sem erros TypeScript
- Servidor sobe em `:3001`, GET `/health` retorna `{ ok: true }`

> 🔀 **Checkpoint GitHub** após 1.1

---

#### 1.2 — Auth JWT (compartilhado com CRM)

**Objetivo:** O backend valida os mesmos tokens JWT emitidos pelo NextAuth do CRM.
Sem novo sistema de login — o frontend usa o token já existente.

**Entregáveis:**
- `JwtAuthGuard` e `@CurrentUser()` decorator
- Configuração via `JWT_SECRET` (mesma do `NEXTAUTH_SECRET`)
- Teste e2e: token inválido → 401, token válido → usuário injetado

**Testes TDD:**
```
test/unit/infra/auth/jwt.guard.spec.ts
test/e2e/auth/jwt-protected-route.e2e-spec.ts
```

> 🔀 **Checkpoint GitHub** após 1.2

---

#### 1.3 — DatabaseModule + PrismaService

**Objetivo:** Módulo global que provê o PrismaService e permite injeção nos repositórios.
O schema Prisma é compartilhado com o CRM (mesmo arquivo, mesma `DATABASE_URL`).

**Entregáveis:**
- `PrismaService` com `onModuleInit/onModuleDestroy`
- `DatabaseModule` como `@Global()` exportando `PrismaService`
- Health check de banco: GET `/health` retorna status do banco
- E2E test: conexão real com banco de teste

**Decisão sobre schema Prisma:**
```
Opção adotada: manter schema em /prisma/ (raiz do monorepo).
O /backend/prisma/schema.prisma é um symlink:
  ln -s ../../prisma/schema.prisma backend/prisma/schema.prisma
Migrações sempre rodam na raiz: npm run db:migrate
```

> 🔀 **Checkpoint GitHub** após 1.3

---

#### 1.4 — Nginx + Deploy Ansible para /backend

**Objetivo:** Subir o backend em produção atrás do mesmo Nginx, com PM2.

**Entregáveis:**
- PM2 ecosystem: processo `wb-crm-backend` na porta 3001
- Nginx: `api.crm.wbdigitalsolutions.com` → `localhost:3001`
- Playbook Ansible: `deploy-backend.yml`
- SSL via Certbot (subdomínio `api.crm`)
- CRM Next.js continua em `crm.wbdigitalsolutions.com` — **sem alteração**

**Playbook simplificado:**
```yaml
# deploy/ansible/playbooks/deploy-backend.yml
- name: Deploy NestJS backend
  tasks:
    - git pull
    - npm ci --prefix backend
    - npm run build --prefix backend
    - pm2 reload wb-crm-backend || pm2 start backend/dist/main.js --name wb-crm-backend
```

> 🔀 **Checkpoint GitHub** após 1.4  
> ✅ **Fase 1 completa**

---

## Fase 2 — Automação de Campanhas WhatsApp

### Contexto
- Usa a mesma Evolution API já instalada no servidor
- Número dedicado para campanhas (diferente do número da empresa)
- Envios pequenos por sessão para evitar bloqueio
- Integração total com CRM: leads, contatos, atividades

### Modelo mental da ferramenta (tipo AtendêZap/Disparow)

```
Campanha
├── Nome, status (draft/active/paused/finished)
├── Instância Evolution API (número WhatsApp)
├── Lista de destinatários (leads do CRM)
└── Sequência de etapas (steps):
    ├── Step 1: mensagem de texto
    ├── Step 2: delay 2h
    ├── Step 3: simular "digitando" 3s
    ├── Step 4: mensagem com mídia
    └── Step 5: delay 1 dia
```

---

### Sub-fases

---

#### 2.1 — Schema do Banco (Campanhas)

**Novas tabelas — adicionadas ao schema Prisma raiz via `db:migrate`:**

```prisma
model Campaign {
  id           String           @id @default(cuid())
  ownerId      String
  name         String
  description  String?
  status       CampaignStatus   @default(DRAFT)
  instanceName String           // Evolution API instance
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt

  steps        CampaignStep[]
  sends        CampaignSend[]
  owner        User             @relation(fields: [ownerId], references: [id])

  @@map("campaigns")
}

model CampaignStep {
  id           String           @id @default(cuid())
  campaignId   String
  order        Int
  type         StepType
  // Para mensagens de texto
  text         String?
  // Para mídia
  mediaUrl     String?
  mediaCaption String?
  mediaType    String?          // image/video/audio/document
  // Para delays
  delaySeconds Int?
  // Para "digitando"
  typingSeconds Int?

  campaign     Campaign         @relation(fields: [campaignId], references: [id], onDelete: Cascade)

  @@map("campaign_steps")
}

model CampaignSend {
  id           String           @id @default(cuid())
  campaignId   String
  leadId       String?
  phone        String           // E.164 normalizado
  status       SendStatus       @default(PENDING)
  currentStep  Int              @default(0)
  scheduledAt  DateTime?
  startedAt    DateTime?
  finishedAt   DateTime?
  errorMessage String?

  campaign     Campaign         @relation(fields: [campaignId], references: [id])
  lead         Lead?            @relation(fields: [leadId], references: [id])

  @@map("campaign_sends")
}

enum CampaignStatus { DRAFT ACTIVE PAUSED FINISHED }
enum StepType       { TEXT MEDIA DELAY TYPING AUDIO }
enum SendStatus     { PENDING RUNNING DONE FAILED OPTED_OUT }
```

**Migration safety:**
- Apenas `CREATE TABLE` — nenhuma tabela existente é alterada
- Rollback: `DROP TABLE campaign_sends, campaign_steps, campaigns`
- Prod: `npm run db:migrate` antes do deploy

> 🔀 **Checkpoint GitHub** após 2.1

---

#### 2.2 — Domínio Campaign (DDD)

**Estrutura:**
```
backend/src/domain/campaigns/
├── enterprise/
│   ├── entities/
│   │   ├── campaign.ts              ← AggregateRoot
│   │   ├── campaign-step.ts         ← Entity
│   │   └── campaign-send.ts         ← Entity
│   ├── value-objects/
│   │   ├── campaign-status.ts       ← CampaignStatus.create() → Either
│   │   ├── step-type.ts
│   │   └── phone-number.ts          ← E.164 validation via libphonenumber-js
│   └── events/
│       ├── campaign-started.event.ts
│       └── send-completed.event.ts
├── application/
│   ├── repositories/
│   │   ├── campaigns.repository.ts
│   │   └── campaign-sends.repository.ts
│   └── use-cases/
│       ├── create-campaign.use-case.ts
│       ├── start-campaign.use-case.ts
│       ├── pause-campaign.use-case.ts
│       └── get-campaign-stats.use-case.ts
└── domain/
    └── (sem services neste módulo — lógica fica nos use-cases)
```

**Testes TDD (in-memory repos):**
```
test/unit/domain/campaigns/
├── enterprise/
│   ├── campaign.spec.ts
│   ├── campaign-step.spec.ts
│   └── phone-number.spec.ts
└── application/use-cases/
    ├── create-campaign.use-case.spec.ts
    ├── start-campaign.use-case.spec.ts
    └── pause-campaign.use-case.spec.ts
```

**In-memory repositories:**
```typescript
// test/unit/repositories/in-memory-campaigns.repository.ts
export class InMemoryCampaignsRepository implements CampaignsRepository {
  public items: Campaign[] = []
  async findById(id: string) { ... }
  async save(campaign: Campaign) { ... }
  async findManyByOwner(ownerId: string) { ... }
}
```

> 🔀 **Checkpoint GitHub** após 2.2

---

#### 2.3 — Worker de Envio (Agendador + Executor)

**Conceito:** Sem BullMQ. Worker baseado em polling de banco (mesmo padrão do `wb-customer/backend`).

```
@nestjs/schedule → a cada 30s → CampaignWorkerService.tick()
  → busca CampaignSends WHERE status=RUNNING AND scheduledAt <= now()
  → para cada send: executa o próximo step
  → atualiza currentStep e scheduledAt para o próximo step
```

**Entregáveis:**
- `CampaignWorkerService` com `@Cron` (30s)
- `StepExecutorService`: despacha por `step.type`
  - `TEXT` → Evolution API `sendText`
  - `MEDIA` → Evolution API `sendMedia`
  - `DELAY` → atualiza `scheduledAt = now() + delaySeconds`
  - `TYPING` → Evolution API `sendPresence('composing')` + sleep(typingSeconds)
  - `AUDIO` → Evolution API `sendAudio` (PTT)
- `AntiBlockService`: rate limiting entre envios (configurável, default 3-8s random)
- `ActivityRecorderService`: cria `Activity` no CRM após cada mensagem enviada

**Testes TDD:**
```
test/unit/domain/campaigns/infra/
├── step-executor.spec.ts        ← mock Evolution client
├── anti-block.service.spec.ts
└── activity-recorder.spec.ts   ← mock prisma
```

**Anti-bloqueio — controles implementados:**
```typescript
interface AntiBlockConfig {
  minDelayMs: number        // 3000 (default)
  maxDelayMs: number        // 8000 (default)
  maxPerHour: number        // 30 (default)
  maxPerDay: number         // 150 (default)
  randomizeOrder: boolean   // true
  simulateTyping: boolean   // true
}
```

> 🔀 **Checkpoint GitHub** após 2.3

---

#### 2.4 — API REST de Campanhas

**Endpoints:**
```
POST   /campaigns                    criar campanha
GET    /campaigns                    listar (paginado, do usuário autenticado)
GET    /campaigns/:id                detalhe
PATCH  /campaigns/:id                editar (apenas DRAFT)
DELETE /campaigns/:id                deletar (apenas DRAFT)

POST   /campaigns/:id/steps          adicionar step
PATCH  /campaigns/:id/steps/:stepId  editar step
DELETE /campaigns/:id/steps/:stepId  remover step
PUT    /campaigns/:id/steps/reorder  reordenar steps

POST   /campaigns/:id/recipients     adicionar destinatários (leadIds[])
DELETE /campaigns/:id/recipients/:sendId  remover destinatário

POST   /campaigns/:id/start          iniciar campanha
POST   /campaigns/:id/pause          pausar
POST   /campaigns/:id/resume         retomar

GET    /campaigns/:id/stats          created/running/done/failed/opted_out
GET    /campaigns/:id/sends          lista de envios com status por destinatário
```

**Presenters (Response DTOs):**
```typescript
export class CampaignPresenter {
  static toHTTP(campaign: Campaign) {
    return { id, name, status, stepsCount, totalRecipients, ... }
  }
}
```

**Testes E2E:**
```
test/e2e/campaigns/
├── create-campaign.e2e-spec.ts
├── add-steps.e2e-spec.ts
├── start-pause-resume.e2e-spec.ts
└── campaign-stats.e2e-spec.ts
```

> 🔀 **Checkpoint GitHub** após 2.4

---

#### 2.5 — Interface no CRM Next.js

> **Frontend implementado com o agente de UI/UX**

**Novas rotas no CRM:**
```
/dashboard/campaigns            lista de campanhas
/dashboard/campaigns/new        wizard de criação (3 passos)
/dashboard/campaigns/[id]       detalhe + steps + destinatários
/dashboard/campaigns/[id]/stats relatório de envios em tempo real
```

**Server Actions no CRM (chamam a API backend):**
```typescript
// src/actions/campaigns.ts
export async function createCampaign(data: CampaignFormData) {
  const session = await getServerSession(authOptions)
  const res = await fetch(`${BACKEND_URL}/campaigns`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.accessToken}`
    },
    body: JSON.stringify(data)
  })
  revalidatePath('/dashboard/campaigns')
  return res.json()
}
```

**Fluxo de criação de campanha:**
```
Passo 1: Dados básicos
  - Nome, descrição
  - Instância Evolution API (dropdown das instâncias disponíveis)
  - Config anti-bloqueio (min/max delay, max por hora/dia)

Passo 2: Sequência de mensagens
  - Drag-and-drop de steps (usando @dnd-kit já instalado)
  - Tipos: Texto | Mídia | Delay | Simular digitando

Passo 3: Destinatários
  - Importar de leads filtrados (tag, cidade, fonte, etc.)
  - Preview: X destinatários, Y horas estimadas
  - Botão: Salvar como rascunho | Iniciar agora
```

**Relatório em tempo real:**
- Server-Sent Events (SSE) via `GET /campaigns/:id/stats/stream`
- Atualiza contadores no CRM a cada 5s sem reload

> 🔀 **Checkpoint GitHub** após 2.5  
> ✅ **Fase 2 completa**

---

## Sequência de Deploy (Sem Perda de Dados)

```
Para cada sub-fase:

1. npm run build                    ← verificar antes de qualquer coisa
2. npm test                         ← todos passando
3. git add . && git commit && git push
4. (se tem migration) npm run db:migrate  ← apenas ADD, nunca DROP
5. ansible-playbook quick-deploy.yml      ← CRM continua no ar durante o deploy
6. (se sub-fase 2.1+) ansible-playbook deploy-backend.yml
7. Verificar health checks
```

**Rollback de emergência:**
```bash
# CRM Next.js
ansible-playbook rollback.yml -e "backup_file=pre_migration_XXXXXXXX.sql"

# Backend NestJS (sem migration = rollback só de código)
git revert HEAD && git push
ansible-playbook deploy-backend.yml
```

---

## Ordem de Execução Recomendada

```
[Fase 1.1] Scaffolding + classes core              → 1 sessão
[Fase 1.2] Auth JWT                                → 1 sessão
[Fase 1.3] DatabaseModule + PrismaService          → 1 sessão
[Fase 1.4] Nginx + Ansible deploy                  → 1 sessão
────────────────────────────────────────────────────
[Fase 2.1] Schema banco (migrations)               → 1 sessão
[Fase 2.2] Domínio Campaign (DDD + unit tests)     → 2 sessões
[Fase 2.3] Worker de envio + anti-bloqueio         → 2 sessões
[Fase 2.4] API REST + e2e tests                    → 2 sessões
[Fase 2.5] Frontend CRM (UI/UX agent)              → 2 sessões
```

---

## Decisões Técnicas Registradas

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Fila de jobs | Polling de banco (`@nestjs/schedule`) | Mesmo padrão do `wb-customer/backend`, sem BullMQ/Redis extra |
| Schema Prisma | Compartilhado (symlink) | Único source of truth, sem sincronização manual |
| Auth | JWT do NextAuth reaproveitado | Usuário não precisa de segundo login |
| Envios grandes | Não implementar | Anti-bloqueio: máx ~150/dia por número |
| Novo domínio | Não | CRM integrado é mais valioso (leads, atividades, histórico) |
| Testes | Vitest (unit in-memory + e2e schema isolado) | Mesmo padrão do projeto de referência |
| Migrate/Deploy | Sempre ADD, nunca DROP | Garantia de não perder dados em produção |

---

## Referências

- Arquitetura de referência: `/Users/brunovieira/projects/wb-customer/backend`
- Evolution API: já instalada em `45.90.123.190` (container `evolution_postgres`)
- Schema atual do CRM: `/prisma/schema.prisma`
- Deploy Ansible: `/deploy/ansible/playbooks/`
