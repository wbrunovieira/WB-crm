# Plano: Campanhas de Disparo WhatsApp

**Status:** Planejado  
**Referência competitiva:** Datacrazy.io (inbox omnicanal, disparo segmentado, gatilhos por pipeline)  
**Infraestrutura existente:** Evolution API (não-oficial), NestJS backend, sistema de cadências, Activities, leads com filtros por sourceGroup/label/status/segmento

---

## Objetivo

Permitir disparos de WhatsApp em massa com segmentação de leads, variáveis dinâmicas, rate limiting seguro, e integração nativa com o pipeline e atividades do CRM. Opcionalmente, análise de resposta com IA.

---

## Fases de Implementação

### Fase 1 — Fila com Rate Limiting (pré-requisito)

**Por quê primeiro:** Sem rate limiting nenhum disparo em escala é seguro. Risco de ban da conta Evolution API.

**Backend:**
- Criar módulo `WhatsAppCampaignModule` em `backend/src/domain/campaigns-whatsapp/`
- Fila de disparo: processar envios com intervalo aleatório de 30–90s entre mensagens
- Implementar com `setInterval` + fila em memória (simples) ou BullMQ (robusto, recomendado para volume)
- Limite: ~500 mensagens/dia por número (margem segura para Evolution API não-oficial)
- Cada item da fila: `{ campaignId, leadId, phone, message, scheduledAt }`
- Entidade: `WhatsAppCampaign` com campos `status` (draft/running/paused/completed/failed), `sentCount`, `failedCount`
- Entidade: `WhatsAppCampaignItem` com campos `status` (pending/sent/failed), `sentAt`, `error`

**Schema Prisma:**
```prisma
model WhatsAppCampaign {
  id          String   @id @default(cuid())
  ownerId     String
  name        String
  message     String   @db.Text
  status      String   @default("draft")
  sentCount   Int      @default(0)
  failedCount Int      @default(0)
  totalCount  Int      @default(0)
  scheduledAt DateTime?
  startedAt   DateTime?
  completedAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  owner       User     @relation(fields: [ownerId], references: [id])
  items       WhatsAppCampaignItem[]
}

model WhatsAppCampaignItem {
  id         String    @id @default(cuid())
  campaignId String
  leadId     String?
  phone      String
  message    String    @db.Text
  status     String    @default("pending")
  sentAt     DateTime?
  error      String?
  campaign   WhatsAppCampaign @relation(fields: [campaignId], references: [id])
}
```

---

### Fase 2 — Disparo com Segmentação e Variáveis (core)

**O que entrega:** Criar campanha, selecionar leads por filtro, escrever mensagem com variáveis, disparar.

**Backend — Use Cases:**
- `CreateCampaignUseCase` — cria campanha com filtro de leads e preview de destinatários
- `StartCampaignUseCase` — resolve leads pelo filtro, expande variáveis por lead, popula fila
- `PauseCampaignUseCase` / `ResumeCampaignUseCase`
- `GetCampaignStatusUseCase` — retorna progresso em tempo real (sentCount / totalCount)

**Variáveis suportadas:**
- `{nome}` → LeadContact.name (contato primário)
- `{empresa}` → Lead.businessName
- `{vendedor}` → User.name (owner do lead)
- `{cidade}` → Lead.city

**Filtros de segmentação:**
- Status do lead (`new`, `contacted`, `qualified`)
- sourceGroup
- Labels (array)
- Segmento / setor
- Cidade
- Quality (`hot`, `warm`, `cold`)
- Sem atividade há X dias (leads frios)

**Integração com Activities:**
- Cada mensagem enviada com sucesso cria uma `Activity` de tipo `whatsapp` no lead
- Subject: nome da campanha
- Description: mensagem enviada
- Permite rastrear histórico no card do lead

**Frontend — Tela `/campaigns/whatsapp`:**
- Lista de campanhas com status, progresso (barra), data
- Botão "Nova Campanha" → modal/página com:
  1. Nome da campanha
  2. Filtros de segmentação (preview do count de leads afetados em tempo real)
  3. Editor de mensagem com variáveis (clique para inserir `{nome}` etc.)
  4. Preview da mensagem com dados reais de um lead do filtro
  5. Configuração de horário de disparo (imediato ou agendado)
  6. Confirmação com total de destinatários

---

### Fase 3 — Gatilho Automático por Stage/Status do Pipeline

**O que entrega:** Quando um lead muda de status → dispara mensagem automaticamente. Inspirado no Datacrazy (pipeline stage → mensagem automática).

**Backend:**
- Criar `WhatsAppTriggerRule` — regra configurável por owner:
  - `triggerOn`: `status_change`, `no_activity_days`, `cadence_start`
  - `fromStatus` / `toStatus`: ex. `new → contacted`
  - `message`: template com variáveis
  - `delayMinutes`: enviar X minutos após o trigger
  - `active`: boolean

**Integração:**
- No use case de atualização de lead (quando `status` muda), disparar evento `lead.status_changed`
- `WhatsAppTriggerService` escuta o evento e verifica regras ativas do owner
- Se regra match → adiciona item na fila de disparo

**Frontend — Seção "Automações WhatsApp" em `/admin` ou `/settings`:**
- Lista de regras ativas
- Criar/editar regra: trigger, filtro opcional, mensagem, delay

---

### Fase 4 — Análise de Resposta com IA (diferencial vs. Datacrazy)

**O que entrega:** Quando um lead responde uma mensagem de campanha → analisar sentimento e intenção com Claude. Resultado aparece no card do lead.

**Diferencial:** O Datacrazy faz análise genérica de sentimento. Aqui a análise é contextualizada com o histórico SPICED do lead — a IA sabe o que foi discutido antes.

**Backend:**
- Webhook da Evolution API já recebe mensagens recebidas
- Detectar se a mensagem é resposta a uma campanha (via `campaignItemId` ou número de telefone)
- Chamar Claude com: mensagem recebida + histórico de atividades do lead + último SPICED
- Resultado: `{ sentiment: "positive|neutral|negative", intent: "interested|objection|request_info|not_interested", summary: string }`
- Salvar em `WhatsAppCampaignItem.analysisResult`
- Criar notificação para o vendedor se `intent === "interested"`

**Frontend:**
- Badge no card do lead: "💬 Respondeu com interesse" / "💬 Objeção identificada"
- Detalhe na activity: análise expandida

---

## Arquitetura Técnica

```
frontend (Next.js)
  └── /campaigns/whatsapp (lista + criação)
  └── /settings/whatsapp-triggers (automações)

backend (NestJS DDD)
  └── domain/campaigns-whatsapp/
      ├── enterprise/entities/
      │   ├── whatsapp-campaign.entity.ts
      │   └── whatsapp-campaign-item.entity.ts
      ├── application/
      │   ├── use-cases/
      │   │   ├── create-campaign.use-case.ts
      │   │   ├── start-campaign.use-case.ts
      │   │   ├── pause-campaign.use-case.ts
      │   │   └── get-campaign-status.use-case.ts
      │   ├── repositories/
      │   │   ├── whatsapp-campaign.repository.ts
      │   │   └── whatsapp-campaign-item.repository.ts
      │   └── services/
      │       ├── campaign-queue.service.ts      ← fila + rate limiting
      │       ├── message-renderer.service.ts   ← expande variáveis
      │       └── whatsapp-trigger.service.ts   ← gatilhos automáticos
      └── infra/
          ├── controllers/whatsapp-campaign.controller.ts
          └── database/prisma/repositories/

infraestrutura existente (reutilizada)
  └── Evolution API (envio de mensagem)
  └── WhatsAppModule (cliente HTTP já implementado)
  └── LeadsModule (filtros de segmentação)
  └── ActivitiesModule (registro de disparos)
```

---

## Riscos e Mitigações

| Risco | Mitigação |
|---|---|
| Ban da conta Evolution API por volume | Rate limiting 30–90s, limite 500/dia, pausa automática em erro 429 |
| Leads sem telefone cadastrado | Validar E.164 antes de adicionar à fila; pular e registrar como `failed` com motivo |
| Mensagem enviada para lead já convertido | Filtro opcional: excluir leads com `status = qualified` ou `convertedToOrganizationId != null` |
| Duplicidade (mesmo lead em múltiplas campanhas) | Verificar campanhas ativas no período antes de adicionar |
| Escala da fila em memória | Migrar para BullMQ + Redis se volume > 1.000 disparos/campanha |

---

## Priorização

| Fase | Valor | Esforço | Prioridade |
|---|---|---|---|
| 1 — Fila com rate limiting | Base técnica | Baixo | Alta |
| 2 — Disparo com segmentação | Core do produto | Médio | Alta |
| 3 — Gatilho por stage | Automação diferenciada | Médio | Média |
| 4 — Análise de resposta com IA | Diferencial vs. Datacrazy | Alto | Baixa (futura) |

Fases 1 e 2 formam o MVP funcional. Fase 3 agrega automação sem muita complexidade extra. Fase 4 é o diferencial de longo prazo.
