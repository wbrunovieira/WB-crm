docs/arquitetura-projeto.md

# Arquitetura do Projeto WB-CRM

## Visão Geral

Clone do Pipedrive - Sistema de CRM focado em gestão de pipeline de vendas.

## Stack Tecnológico

### Frontend & Backend

- **Framework**: Next.js 14+ (App Router)
- **Linguagem**: TypeScript
- **Backend**: Next.js API Routes / Server Actions
- **Banco de Dados**: PostgreSQL
- **ORM**: Prisma
- **Autenticação**: NextAuth.js
- **Estilização**: Tailwind CSS + shadcn/ui

### Ferramentas Auxiliares

- **Validação**: Zod
- **Gerenciamento de Estado**: React Context / Zustand
- **Formatação de Dados**: date-fns
- **Drag & Drop**: @dnd-kit/core

## Arquitetura do Sistema

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Grupo de rotas de autenticação
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/              # Grupo de rotas do dashboard
│   │   ├── deals/                # Gestão de negócios
│   │   ├── contacts/             # Gestão de contatos
│   │   ├── activities/           # Gestão de atividades
│   │   ├── organizations/        # Gestão de organizações
│   │   └── pipeline/             # Visualização do pipeline
│   ├── api/                      # API Routes (se necessário)
│   └── layout.tsx
├── components/
│   ├── ui/                       # Componentes do shadcn/ui
│   ├── deals/                    # Componentes de negócios
│   ├── contacts/                 # Componentes de contatos
│   ├── activities/               # Componentes de atividades
│   └── shared/                   # Componentes compartilhados
├── lib/
│   ├── prisma.ts                 # Cliente Prisma
│   ├── auth.ts                   # Configuração NextAuth
│   ├── validations/              # Schemas Zod
│   └── utils.ts                  # Utilitários
├── actions/                      # Server Actions
│   ├── deals.ts
│   ├── contacts.ts
│   ├── activities.ts
│   └── organizations.ts
└── types/                        # Definições de tipos TypeScript
```

## Modelo de Dados (Principais Entidades)

### Core Entities

#### User (Usuário)

- id, name, email, password, role, createdAt

#### Organization (Empresa/Organização)

- id, name, domain, phone, address, ownerId, createdAt

#### Contact (Contato/Pessoa)

- id, name, email, phone, organizationId, ownerId, createdAt

#### Deal (Negócio)

- id, title, value, currency, status, stageId, contactId, organizationId, ownerId, expectedCloseDate, createdAt

#### Stage (Estágio do Pipeline)

- id, name, order, pipelineId, probability, createdAt

#### Pipeline (Pipeline de Vendas)

- id, name, isDefault, createdAt

#### Activity (Atividade)

- id, type (call, meeting, email, task), subject, description, dueDate, completed, dealId, contactId, ownerId, createdAt

## Plano de Implementação por Etapas

### FASE 1 - Fundação ✅ CONCLUÍDA

- [x] Next.js 14+, TypeScript, Tailwind CSS v4, ESLint/Prettier
- [x] PostgreSQL via Docker, Prisma, migrations, seed
- [x] NextAuth.js com Credentials provider + middleware de proteção de rotas
- [x] Dashboard básico com layout

### FASE 2 - Entidades Core ✅ CONCLUÍDA

- [x] CRUD de Contatos, Organizações, Negócios, Atividades
- [x] Pipeline Kanban com drag-and-drop (@dnd-kit)
- [x] Calendário de atividades
- [x] Sistema de Leads com LeadContacts e conversão Lead → Organization / LeadContact → Contact
- [x] Partners (agência, consultoria, indicador, etc.) com atividades e referrals
- [x] Papéis de usuário (admin / sdr / closer) com isolamento de dados por `ownerId`
- [x] Compartilhamento de entidades entre usuários (SharedEntity)

### FASE 3 - Integrações de Comunicação ✅ CONCLUÍDA

#### WhatsApp via Evolution API ✅

- [x] Webhook `MESSAGES_UPSERT`: mensagens enviadas e recebidas geram Activity automaticamente
- [x] Agrupamento em sessões de 2 horas (`WhatsAppMessage` + Activity por sessão)
- [x] Botão "Enviar WhatsApp" com modal de envio, emojis, templates e histórico
- [x] Timeline estilo chat com bolinhas e expand de sessões

#### Gmail via Google API ✅

- [x] OAuth2 com conta única da empresa (token persistido em `GoogleToken`)
- [x] Envio de e-mail com editor rich text, anexos e templates com variáveis dinâmicas
- [x] Recebimento automático via polling (5 min) — e-mail de lead/contato gera Activity
- [x] Reply com threadId (encadeia na thread Gmail correta)
- [x] Badges visuais: "Aguardando resposta" / "Respondido" / "Resposta enviada"
- [x] Botão de sincronização manual em páginas de Lead e Organization
- [x] Thread connector — linha visual ligando cards da mesma cadeia de respostas
- [x] Busca por texto + filtros por tipo e status nas listas de atividade
- [x] Ordenação: pendentes por drag-and-drop; concluídas/falhas/puladas por data de resolução

### FASE 4 - Dados Avançados ✅ CONCLUÍDA

- [x] Classificações CNAE (primária + secundárias) para Lead e Organization
- [x] Tech Profile: rastrear stack atual de Leads e Organizations (linguagens, frameworks, hosting, banco, ERP, CRM, e-commerce)
- [x] Tech Stack em Deals: categorias, linguagens e frameworks requeridos
- [x] Produtos e Linhas de Negócio (admin) com vínculos a Lead, Organization, Deal e Partner
- [x] Área admin: `/admin` para Business Lines, Products, Tech Stack, Tech Profile, Gmail Templates
- [x] Integração com projetos externos via API e `externalProjectIds` (JSON) em Organization
- [x] ICP (Ideal Customer Profile) scoring em Organizations

### FASE 5 - Google Drive + Propostas ✅ CONCLUÍDA

- [x] `src/lib/google/drive.ts` — `getOrCreateFolder`, `uploadFile`, `getFileUrl`, `deleteFile` (Buffer → Readable stream fix)
- [x] `src/lib/google/drive-folders.ts` — pasta `WB-CRM/Propostas/[Lead]/` criada/recuperada automaticamente, `driveFolderId` persistido
- [x] Campos `driveFolderId` em Lead e Organization, model `Proposal` — migration segura com `IF NOT EXISTS`
- [x] Server actions: `getProposals`, `createProposal` (upload Drive), `updateProposalStatus`, `deleteProposal` (remove do Drive)
- [x] `ProposalUploadModal` — título, descrição, upload PDF/Word/Excel/PPT ≤25 MB → Drive
- [x] `ProposalsList` — badges de status, 4 ações por arquivo:
  - **Visualizar**: modal fullscreen com iframe (PDF nativo; Word/Excel via Microsoft Office Online)
  - **Download**: força save-as na máquina local
  - **Abrir com app**: `inline=true` → browser/OS decide o app
  - **Abrir no Drive**: link direto para a interface do Google Drive
- [x] API route `/api/proposals/[id]/file` — serve arquivo via OAuth sem exigir login Google no browser
- [x] Seção "Propostas" nas páginas de Lead e Deal
- [x] 16 testes TDD (drive + proposals actions)

### FASE 6 - Google Meet: agendamento e gravações ✅ CONCLUÍDA

**Google Workspace Standard** — gravações automáticas habilitadas.

#### 6.1 — Agendamento ✅

- [x] `src/lib/google/calendar.ts` — `createMeetEvent`, `cancelMeetEvent`, `getMeetEvent`
- [x] `src/actions/meetings.ts` — `scheduleMeeting`, `cancelMeeting`, `getMeetings`
- [x] Model `Meeting` no Prisma (googleEventId, meetLink, attendeeEmails, status, leadId, dealId, activityId @unique…)
- [x] `ScheduleMeetingModal` — título, data/hora, duração, e-mails convidados pré-preenchidos
- [x] `MeetingsList` — seção de reuniões no perfil: futuras (botão "Entrar") e históricas (gravação + transcrição)
- [x] Activity do tipo `meeting` gerada automaticamente (pendente) ao agendar
- [x] Seção "Reuniões" nas páginas de Lead e Deal

#### 6.2 — Gravações ✅

- [x] `src/lib/google/recording-detector.ts` — busca gravação no Drive após término da reunião
- [x] `src/app/api/google/check-recordings/route.ts` — cron a cada 15 min (autenticado via `CRON_SECRET`)
  - Detecta reuniões encerradas, completa Activity vinculada, move gravação para `WB-CRM/Reuniões/[Entidade]/`
- [x] `recordingDriveId` e `recordingUrl` salvos na Meeting; player direto no `MeetingsList`

#### 6.3 — Transcrição ✅

- [x] `src/lib/transcriptor.ts` — cliente para a API `transcritor.wbdigitalsolutions.com`
  - `submitVideoForTranscription(buffer, fileName)` → retorna `jobId`
  - `getTranscriptionStatus(jobId)` → polling de status (pending/processing/done/failed)
  - `getTranscriptionResult(jobId)` → busca texto final
- [x] `check-recordings` atualizado: após mover gravação, baixa o vídeo do Drive e submete ao transcritor, salva `transcriptionJobId`
- [x] `src/app/api/google/check-transcriptions/route.ts` — cron a cada 5 min, faz polling dos jobs pendentes e salva `transcriptText + transcribedAt`
- [x] Transcrição exibida de forma expansível no `MeetingsList`
- [x] Campo `transcriptionJobId` adicionado ao model `Meeting`

#### Testes (TDD) ✅

- [x] `tests/unit/lib/google/calendar.test.ts` — 5 testes
- [x] `tests/unit/actions/meetings.test.ts` — 8 testes
- [x] `tests/unit/lib/transcriptor.test.ts` — 6 testes

### FASE 7 - WhatsApp: matching avançado + mídia 🔲

- [ ] Matching de números desconhecidos: sugestão de vínculo manual ao usuário
- [ ] Mídia (áudio, imagem, documento) → download → Google Drive → link permanente
- [ ] Transcrição de áudios via Whisper API (mesma pipeline futura do GoTo)

### FASE 8 - Dashboard e Relatórios 🔲

- [ ] Métricas principais (deals ganhos/perdidos/em andamento por período)
- [ ] Gráfico de funil de conversão por estágio
- [ ] Atividades do dia e próximas ao vencimento
- [ ] Relatório de performance por usuário (SDR vs Closer)
- [ ] Exportação CSV

### FASE 9 - GoTo Connect: chamadas e voicemail 🔲

- [ ] OAuth GoTo Connect + persistência de token
- [ ] Webhook de chamadas → Activity do tipo `call` com duração
- [ ] Gravações de chamada → download → Drive + transcrição Whisper
- [ ] Clique para ligar (Click-to-Call) do perfil do Lead/Contato

## Fluxo de Dados

### Padrão de Implementação

1. **UI Component** (React) → exibe dados e captura ações do usuário
2. **Server Action** → valida dados, executa lógica de negócio
3. **Prisma** → persiste/recupera dados do PostgreSQL
4. **Revalidation** → atualiza cache e UI automaticamente

### Exemplo de Fluxo (Criar Negócio)

```
CreateDealForm (component)
  → createDeal (server action)
    → Validação com Zod
    → prisma.deal.create()
    → revalidatePath('/deals')
  → UI atualizada automaticamente
```

## Convenções de Código

### Nomenclatura

- **Componentes**: PascalCase (DealCard.tsx)
- **Funções/Variáveis**: camelCase (createDeal, userId)
- **Tipos**: PascalCase com prefix (DealFormData, ContactStatus)
- **Server Actions**: verbo + substantivo (createDeal, updateContact)

### Organização de Arquivos

- Um componente por arquivo
- Co-localizar componentes relacionados
- Separar lógica de negócio em server actions
- Validações centralizadas em lib/validations

## Configurações Necessárias

### Variáveis de Ambiente (.env)

```
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"
```

### Scripts package.json

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "db:push": "prisma db push",
  "db:migrate": "prisma migrate dev",
  "db:studio": "prisma studio",
  "db:seed": "tsx prisma/seed.ts"
}
```

## Próximos Passos

**Fase atual**: FASE 7 — WhatsApp: matching avançado + mídia

**Fase 6 concluída** — Google Meet completo (agendamento, gravações, transcrição)
