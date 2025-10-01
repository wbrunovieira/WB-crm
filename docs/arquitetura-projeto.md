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

### FASE 1 - Fundação (Semana 1-2) ✅ CONCLUÍDA

#### Etapa 1.1: Setup Inicial ✅

- [x] Inicializar projeto Next.js com TypeScript
- [x] Configurar Tailwind CSS v4 (nova configuração CSS-based)
- [x] Configurar ESLint e Prettier
- [x] Configurar variáveis de ambiente

#### Etapa 1.2: Banco de Dados ✅

- [x] Configurar SQLite (ambiente local simplificado)
- [x] Configurar Prisma
- [x] Criar schema completo (User, Organization, Contact, Deal, Pipeline, Stage, Activity)
- [x] Gerar e executar migrations
- [x] Criar seed com usuário teste e pipeline padrão

#### Etapa 1.3: Autenticação ✅

- [x] Configurar NextAuth.js com Prisma Adapter
- [x] Criar páginas de login/registro
- [x] Implementar middleware de autenticação
- [x] Proteger rotas do dashboard
- [x] Criar dashboard básico com layout

### FASE 2 - Funcionalidades Básicas (Semana 3-4)

#### Etapa 2.1: Gestão de Contatos ✅

- [x] CRUD de contatos (Create, Read, Update, Delete)
- [x] Listagem de contatos com busca
- [x] Formulário de criação/edição de contato
- [x] Visualização detalhada de contato com negócios e atividades

#### Etapa 2.2: Gestão de Organizações ✅

- [x] CRUD de organizações
- [x] Listagem de organizações com contadores
- [x] Vincular contatos a organizações via dropdown
- [x] Visualização detalhada de organização com contatos e negócios

### FASE 3 - Pipeline de Vendas (Semana 5-6) ✅ CONCLUÍDA

#### Etapa 3.1: Estrutura do Pipeline ✅

- [x] CRUD de pipelines
- [x] CRUD de estágios (stages)
- [x] Configurar pipeline padrão
- [x] Função de reordenar estágios (backend pronto)

#### Etapa 3.2: Gestão de Negócios (Deals) ✅

- [x] CRUD de negócios
- [x] Vincular negócios a contatos/organizações
- [x] Atribuir negócios a estágios
- [x] Listagem de negócios em tabela

### FASE 4 - Visualização do Pipeline (Semana 7-8) ✅ CONCLUÍDA

#### Etapa 4.1: Interface Kanban ✅

- [x] Criar layout Kanban com colunas por estágio
- [x] Exibir cards de negócios em cada estágio
- [x] Mostrar valor total por estágio
- [x] Indicadores visuais de status

#### Etapa 4.2: Drag & Drop ✅

- [x] Implementar drag & drop entre estágios
- [x] Atualizar status do negócio ao mover
- [x] Animações de transição
- [x] Feedback visual durante drag

### FASE 5 - Atividades (Semana 9-10) ✅ CONCLUÍDA

#### Etapa 5.1: Gestão de Atividades ✅

- [x] CRUD de atividades (call, meeting, email, task)
- [x] Vincular atividades a negócios/contatos
- [x] Agendar atividades com data/hora
- [x] Marcar atividades como concluídas

#### Etapa 5.2: Timeline e Calendário ✅

- [x] Timeline de atividades por negócio
- [x] Visualização em calendário
- [x] Filtros por tipo e status
- [ ] Notificações de atividades pendentes (não implementado)

### FASE 6 - Dashboard e Relatórios (Semana 11-12)

#### Etapa 6.1: Dashboard Principal

- [ ] Métricas principais (negócios ganhos, perdidos, em andamento)
- [ ] Gráfico de funil de vendas
- [ ] Atividades do dia
- [ ] Negócios próximos ao fechamento

#### Etapa 6.2: Relatórios Básicos

- [ ] Relatório de performance por usuário
- [ ] Relatório de conversão por estágio
- [ ] Exportação de dados (CSV)
- [ ] Filtros por período

### FASE 7 - Melhorias e Polimento (Semana 13-14)

#### Etapa 7.1: UX/UI

- [ ] Responsividade mobile
- [ ] Loading states e skeleton screens
- [ ] Mensagens de erro amigáveis
- [ ] Toasts de sucesso/erro

#### Etapa 7.2: Performance

- [ ] Otimizar queries do Prisma
- [ ] Implementar paginação
- [ ] Caching com React Query (opcional)
- [ ] Otimizar imagens e assets

#### Etapa 7.3: Funcionalidades Extras

- [ ] Busca global
- [ ] Filtros avançados
- [ ] Comentários em negócios
- [ ] Upload de arquivos (anexos)

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

1. Inicializar projeto Next.js: `npx create-next-app@latest wb-crm`
2. Configurar dependências principais
3. Começar pela Fase 1 - Etapa 1.1
4. Implementar de forma iterativa, testando cada funcionalidade antes de avançar
