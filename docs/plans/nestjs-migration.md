# Plano de Migração — Next.js → NestJS (Strangler Fig)

**Iniciado em**: 2026-04-18  
**Padrão**: Strangler Fig — substituição incremental sem big bang  
**Objetivo**: Migrar todo o backend para NestJS DDD mantendo o Next.js como frontend puro (client components + React Query)

---

## Visão Geral da Estratégia

### Antes (estado inicial)
```
Browser → Next.js (Server Actions / API Routes) → PostgreSQL
```

### Depois (estado final)
```
Browser → NestJS (Controllers → Use Cases → Repositories) → PostgreSQL
Next.js → apenas frontend (React + client components)
```

### Regras da migração
- **Sem big bang**: migrar uma entidade por vez, a aplicação sempre funciona
- **Frontend vira client component**: cada página migrada passa de SSR para CSR com React Query
- **Testes antes de deploy**: unit tests + e2e tests cobrindo todos os campos antes de subir
- **GitHub + deploy obrigatório ao fim de cada fase**: push → deploy backend → deploy frontend → validar nos logs do Nginx que as rotas corretas retornam 200/201/204
- **Logs confirmam**: verificar nos logs do Nginx que as rotas passam pelo NestJS (não pelo Next.js)

---

## Arquitetura NestJS Adotada

### Camadas (DDD)
```
infra/controllers/          ← HTTP (entrada/saída)
domain/{entity}/
  application/use-cases/   ← lógica de negócio
  application/repositories/ ← interfaces abstratas
  enterprise/entities/      ← entidades de domínio
infra/database/prisma/
  repositories/             ← implementações Prisma
  mappers/                  ← conversão domínio ↔ Prisma
```

### Padrão Either
Use cases retornam `Either<Error, Result>`:
```typescript
return left(new NotFoundError("Contato não encontrado"));
return right({ contact });
```
Controller chama `handleError(result)` se `isLeft()`.

### JWT compatível com NextAuth
- `JWT_SECRET === NEXTAUTH_SECRET` em produção
- NestJS verifica o mesmo token que NextAuth emite
- Sessões antigas sem `accessToken`: NextAuth gera um token compatível via `jose` no callback `jwt`

### Variáveis de ambiente
- `NEXT_PUBLIC_BACKEND_URL` — URL pública do backend (browser)
- `BACKEND_URL` — URL interna (Next.js server → NestJS, para `getContacts` server-side)

---

## Fases de Migração

### ✅ M0 — Infraestrutura NestJS
**Status**: Concluído

- Setup do projeto NestJS em `/backend`
- Docker Compose com profile `backend`
- Prisma compartilhado com o Next.js (mesmo banco)
- JwtModule com `JWT_SECRET`
- Deploy via Ansible (`deploy-backend.yml`)
- Health check em `/health`
- Swagger em `/docs`

---

### ✅ M1 — Auth + Contacts
**Status**: Concluído em 2026-04-18

#### O que foi feito

**Auth (`POST /auth/login`)**
- `UsersRepository` (abstract) + `PrismaUsersRepository`
- `LoginUseCase` com bcrypt compare + JWT sign
- `AuthController` com endpoint público
- 5 testes unitários cobrindo: usuário inexistente, senha errada, credenciais corretas, payload do JWT, sem chamada JWT em falha
- Next.js `auth.ts` atualizado: `authorize` chama NestJS em vez de verificar bcrypt localmente

**Contacts (CRUD completo)**

Camadas criadas:
- `Contact` entity com todos os campos
- `ContactsRepository` (abstract) com 6 métodos
- `PrismaContactsRepository` com queries + filtros
- `ContactMapper` (toDomain / toPrisma)
- Use cases: `GetContactsUseCase`, `GetContactByIdUseCase`, `CreateContactUseCase`, `UpdateContactUseCase`, `DeleteContactUseCase`, `ToggleContactStatusUseCase`
- `ContactsController` com rotas: `GET /contacts`, `GET /contacts/:id`, `POST /contacts`, `PATCH /contacts/:id`, `DELETE /contacts/:id`, `PATCH /contacts/:id/status`

Frontend migrado:
- `src/hooks/contacts/use-contacts.ts` — 6 hooks React Query chamando NestJS diretamente
- Páginas `/contacts`, `/contacts/[id]`, `/contacts/[id]/edit` convertidas para client components
- `ContactForm` usa `useCreateContact` / `useUpdateContact`
- `DeleteContactButton` usa `useDeleteContact`
- `OrganizationContactsList` usa `useToggleContactStatus`
- Mutations removidas de `src/actions/contacts.ts` (mantido apenas `getContacts` para a página SSR de atividades)

#### Desafios encontrados e como foram resolvidos

**1. Sessões existentes sem `accessToken`**

_Problema_: Sessões criadas antes da migração não tinham o campo `accessToken` no JWT do NextAuth. O hook `enabled: !!token` ficava falso, a query nunca rodava e a página mostrava "nenhum contato encontrado".

_Solução_: No callback `jwt` do NextAuth, se `!token.accessToken && token.sub`, gera um JWT compatível com NestJS usando `jose` e o mesmo `NEXTAUTH_SECRET`. Transparente para o usuário, sem logout forçado.

```typescript
if (!token.accessToken && token.sub) {
  const { SignJWT } = await import("jose");
  const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);
  token.accessToken = await new SignJWT({
    sub: token.sub, name: token.name, email: token.email, role: token.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(secret);
}
```

**2. `birthDate` como string `"YYYY-MM-DD"`**

_Problema_: O frontend envia `birthDate: "2026-03-31"` (date-only). Prisma `DateTime` rejeita com `premature end of input. Expected ISO-8601 DateTime`.

_Solução_: Controller converte para `Date` antes de passar ao use case:
```typescript
birthDate: body.birthDate ? new Date(body.birthDate) : undefined,
```
Também adicionado guard no mapper `toPrisma` para suportar tanto `Date` quanto `string`.

**3. `languages` como array de objetos**

_Problema_: O campo `languages` no schema Prisma é `String` (JSON serializado). O frontend envia `[{ code: "pt-BR", isPrimary: true }]` como array JS, que chegava ao mapper como objeto e causava `Expected String or Null, provided (Object, Object)`.

_Solução_: Mapper `toPrisma` faz `JSON.stringify` se o valor for array:
```typescript
languages: contact.languages
  ? typeof contact.languages === "string"
    ? contact.languages
    : JSON.stringify(contact.languages)
  : null,
```

**4. `SessionProvider` ausente**

_Problema_: Ao converter páginas para client components com `useSession()`, o erro `Cannot destructure property 'data' of useSession() as it is undefined` aparecia. O `SessionProvider` do NextAuth não estava no tree.

_Solução_: Criar `src/components/providers/session-provider.tsx` (client) e envolver o layout do dashboard:
```tsx
<SessionProvider session={session}>
  <QueryProvider>
    {children}
  </QueryProvider>
</SessionProvider>
```

**5. Testes e2e não cobriam campos opcionais**

_Problema_: Os testes e2e originais só testavam `name` e `email`. Os bugs de `birthDate` e `languages` passaram despercebidos.

_Lição_: Todo e2e de criação/atualização deve ter um teste com **todos os campos** do payload, incluindo campos opcionais. Isso foi corrigido no `contacts.e2e-spec.ts`.

---

### ✅ M1.5 — Schema: referredByPartnerId em Organization
**Status**: Concluído em 2026-04-18

- Adicionado `referredByPartnerId` ao modelo `Organization` no Prisma schema
- Adicionado `referredOrganizations Organization[]` ao modelo `Partner`
- Migration `20260418_add_referred_by_partner_to_organization` aplicada em produção
- Adicionado `referredByPartnerId` nos schemas Zod de Lead e Organization
- UI e implementação NestJS adiadas para M2 (Lead) e M3 (Organization)
- Deploy com backup automático → Google Drive ✅

---

### 🔄 M2 — Leads
**Status**: Backend concluído em 2026-04-18 | Frontend parcial (mutações simples migradas)

#### Backend — concluído ✅

- `Lead` entity com ~60 campos escalares + `archive(reason?)`, `unarchive()`, `update(data)`
- `LeadsRepository` abstract com `LeadFilters` interface
- Use cases: `CreateLead`, `UpdateLead`, `DeleteLead`, `GetLeads`, `GetLeadById`, `ArchiveLead`, `UnarchiveLead`
- `PrismaLeadsRepository` com includes completos para detail (contacts, labels, tech profile, CNAE, sharedUsers)
- `LeadMapper` com `JSON.stringify` para campos array e `new Date()` para datas
- `LeadsController` com 7 rotas: `GET/POST /leads`, `GET/PATCH/DELETE /leads/:id`, `PATCH /leads/:id/archive`, `PATCH /leads/:id/unarchive`
- 20 testes unitários + 22 testes e2e — todos passando
- Deploy confirmado em produção ✅

#### Frontend — mutações simples migradas + validadas em produção ✅

- `src/hooks/leads/use-leads.ts` — hooks: `useDeleteLead`, `useArchiveLead`, `useUnarchiveLead`
- `ArchiveLeadButton` → usa `useArchiveLead` / `useUnarchiveLead`
- `DeleteLeadButton`, `DeleteLeadIconButton`, `ProspectsTable` → usa `useDeleteLead`
- `archiveLead`, `unarchiveLead`, `deleteLead` removidos de `src/actions/leads.ts`
- Confirmado nos logs do NestJS: `PATCH /leads/:id/archive` e `DELETE /leads/:id` ✅

#### Frontend — pendente (create, update, lista, detalhe) 🔲

- **`updateLead`** (`src/actions/leads.ts`): ainda via Next.js server action. Migração simples — apenas `PATCH /leads/:id` sem transação. Incluído no M2.5 junto com o create para não fragmentar o deploy.
- **`createLeadWithContacts`** (`src/actions/leads.ts`): ainda via Next.js server action. Migração complexa — transação atômica (Lead + LeadContacts + junction tables + CNAE + tech profile + labels + ICP). Requer enriquecimento do `POST /leads` no NestJS.
- **Lista** (`/leads`): mantida SSR — precisa de `icps`, `_count.leadCadences`, `sharedUsersMap` no endpoint NestJS.
- **Detalhe** (`/leads/[id]`): mantido SSR — mesmos dados complexos.
- **`referredByPartnerId` UI**: seletor de partner a adicionar no LeadForm.

#### Checklist M2.5 (create + update + lista + detalhe):
- [ ] Enriquecer `POST /leads` com contatos inline + junction tables (tech profile, CNAE, labels)
- [ ] `updateLead` → `PATCH /leads/:id` + hooks (`useUpdateLead`)
- [ ] `createLeadWithContacts` → `POST /leads` + hooks (`useCreateLead`)
- [ ] Adicionar `useLeads` e `useLead` queries ao `use-leads.ts`
- [ ] Migrar lista e detalhe para client components com React Query
- [ ] Adicionar seletor de partner (`referredByPartnerId`) no LeadForm
- [ ] Remover `createLeadWithContacts`, `updateLead` de `src/actions/leads.ts`
- [ ] GitHub push + deploy backend + deploy frontend + validar logs NestJS

**Lição aprendida:** `TypeError: o is not a function` em `pages.runtime.prod.js` é erro em cascata — Next.js tenta renderizar página de erro quando uma SSR falha, e o renderer de erro também falha. Sempre investigar a causa raiz (P2022, etc.) em vez do erro secundário.

**Ao fim de cada sub-fase:** GitHub push + deploy backend + deploy frontend + validar logs NestJS.

---

### ✅ M3 — Organizations
**Status**: Concluído em 2026-04-18

#### Backend — concluído ✅

- `Organization` entity com 39 campos escalares incluindo `referredByPartnerId`
- `OrganizationsRepository` abstract com `OrganizationFilters`
- Use cases: `GetOrganizations`, `GetOrganizationById`, `CreateOrganization`, `UpdateOrganization`, `DeleteOrganization`
- `PrismaOrganizationsRepository` com filtros (search, hasHosting, owner) e includes completos (contacts, deals, primaryCNAE, labels, 7 tech profile tables, secondaryCNAEs, sectors, icps)
- `OrganizationMapper` com `toJsonString()` para `languages` e `externalProjectIds`, guards de Date/string para `foundationDate`, `hostingRenewalDate`, `inOperationsAt`
- `OrganizationsController` com 5 rotas, JwtAuthGuard, Swagger
- 20 testes unitários + 20 testes e2e — todos passando
- Deploy confirmado em produção ✅

#### Frontend — mutações migradas ✅

- `src/hooks/organizations/use-organizations.ts` — hooks: `useCreateOrganization`, `useUpdateOrganization`, `useDeleteOrganization`
- `OrganizationForm` → usa `useCreateOrganization` / `useUpdateOrganization` (labels ainda via `setOrganizationLabels` server action)
- `DeleteOrganizationButton` → usa `useDeleteOrganization`
- `createOrganization`, `updateOrganization`, `deleteOrganization` removidos de `src/actions/organizations.ts`

#### Pendente (SSR → client components) 🔲

- Lista `/organizations` e detalhe `/organizations/[id]` ainda SSR — precisam de `getOrganizations`/`getOrganizationById` migrados para React Query
- Labels: `setOrganizationLabels` ainda via server action — a implementar endpoint NestJS labels em M3.5 ou M4

#### Campos críticos tratados:
- `externalProjectIds` — `JSON.stringify` no mapper ✅
- `referredByPartnerId` — incluído na entidade, mapper e controller ✅
- Hosting fields (`hasHosting`, `hostingRenewalDate`, etc.) — todos mapeados ✅
- `languages` — serializado para JSON string no hook antes de enviar ao backend ✅

**Ao fim:** GitHub push + deploy backend + deploy frontend + validar logs Nginx. ✅

---

### ✅ M4 — Partners
**Status**: Concluído em 2026-04-18

#### Backend — concluído ✅
- Entity, abstract repository, 6 use cases (get, getById, create, update, delete, updateLastContact)
- PrismaPartnersRepository com search (nome/tipo/expertise), owner scoping, includes completos
- 6 rotas: `GET/POST /partners`, `GET/PATCH/DELETE /partners/:id`, `PATCH /partners/:id/last-contact`
- 24 unit tests + 20 e2e tests — todos passando
- Deploy confirmado em produção ✅

#### Frontend — concluído ✅
- `src/hooks/partners/use-partners.ts` — hooks: `useCreatePartner`, `useUpdatePartner`, `useDeletePartner`, `useUpdatePartnerLastContact`
- `PartnerForm` usa `useCreatePartner` / `useUpdatePartner`
- `createPartner`, `updatePartner`, `deletePartner`, `updatePartnerLastContact` removidos de `src/actions/partners.ts`

**Ao fim:** GitHub push + deploy backend + deploy frontend ✅

---

### ✅ M5 — Deals
**Status**: Concluído em 2026-04-18

#### Backend — concluído ✅
- `Deal` entity com todos os campos escalares (title, value, currency, probability, closedAt, lostReason, stage, pipeline, etc.)
- `DealsRepository` abstract com filtros (search, stageId, pipelineId, owner)
- Use cases: `GetDeals`, `GetDealById`, `CreateDeal`, `UpdateDeal`, `DeleteDeal`
- `PrismaDealsRepository` com includes completos (contact, organization, products, techStack, languages, frameworks)
- `DealsController` com 5 rotas: `GET/POST /deals`, `GET/PATCH/DELETE /deals/:id`
- Testes unitários + e2e — todos passando
- Deploy confirmado em produção ✅

#### Frontend — concluído ✅
- `src/hooks/deals/use-deals.ts` — hooks: `useCreateDeal`, `useUpdateDeal`, `useDeleteDeal`
- `DealForm` usa `useCreateDeal` / `useUpdateDeal`
- `DeleteDealButton` usa `useDeleteDeal`
- Mutações removidas de `src/actions/deals.ts`
- Confirmado nos logs: POST 201, PATCH 200, DELETE 204 passando pelo NestJS ✅

#### Desafio resolvido
- URL de produção `api.crm.wbdigitalsolutions.com/deals` retornava 404 — Nginx não tinha o domínio configurado. Corrigido apontando para `localhost:3010` (porta NestJS).

---

### ✅ M6 — Activities
**Status**: Concluído em 2026-04-18

#### Backend — concluído ✅
- `Activity` entity com todos os campos escalares incluindo GoTo, email tracking, `organizationId`
- `ActivitiesRepository` abstract
- 11 use cases: `GetActivities`, `GetActivityById`, `CreateActivity`, `UpdateActivity`, `DeleteActivity`, `ToggleActivityCompleted`, `MarkActivityFailed`, `MarkActivitySkipped`, `RevertActivityOutcome`, `LinkActivityToDeal`, `UnlinkActivityFromDeal`
- `PrismaActivitiesRepository` com filtros (type, completed, dealId, contactId, leadId, outcome, dateRange, includeArchivedLeads)
- `ActivitiesController` com 11 rotas:
  - `GET /activities`, `GET /activities/:id`
  - `POST /activities`, `PATCH /activities/:id`, `DELETE /activities/:id`
  - `PATCH /activities/:id/toggle-completed`
  - `PATCH /activities/:id/fail`, `PATCH /activities/:id/skip`, `PATCH /activities/:id/revert`
  - `POST /activities/:id/deals/:dealId`, `DELETE /activities/:id/deals/:dealId`
- 22 testes unitários + 23 testes e2e — todos passando
- `organizationId` adicionado ao modelo Activity (migration `20260418_add_organization_to_activity`) ✅
- Deploy confirmado em produção ✅

#### Frontend — concluído ✅
- `src/hooks/activities/use-activities.ts` — hooks: `useCreateActivity`, `useUpdateActivity`, `useDeleteActivity`, `useToggleActivityCompleted`, `useMarkActivityFailed`, `useMarkActivitySkipped`, `useRevertActivityOutcome`, `useLinkActivityToDeal`, `useUnlinkActivityFromDeal`
- `UpdateActivityPayload = Partial<ActivityPayload>` para suportar updates parciais (`leadContactIds` sem `type`/`subject`)
- `ActivityForm` reescrito com `SearchableSelect` para leads (sem arquivados) e organizações
- Todos os componentes migrados: `DeleteActivityButton`, `ToggleCompletedButton`, `ActivityOutcomeButtons`, `LinkActivityToDealModal`, `ScheduleNextActivityModal`, `ActivityCalendar`, `LeadActivitiesList`
- `getOrganizationsList()` adicionado a `src/lib/lists/` e passado para páginas new/edit
- `leads-list.ts` filtrado para excluir leads arquivados

#### Desafios resolvidos

**1. Token inválido em navegação RSC**

_Problema_: `backendFetch` lia o cookie raw do NextAuth (JWT do NextAuth, não o `accessToken` do NestJS). Durante navegação client-side (soft navigation), o cookie era inacessível, causando `Error: Token não fornecido` → erro 500 no digest `4226760246`.

_Solução_: `backendFetch` usa `getServerSession(authOptions)` para obter `session.user.accessToken` — funciona tanto em SSR completo quanto em navegação RSC.

**2. Coluna `organizationId` não criada em produção**

_Problema_: `prisma migrate dev` falhou localmente (shadow database com migration quebrada), então nenhum arquivo SQL foi gerado. Deploy aplicou apenas migrations existentes, sem a nova coluna → `P2022: column activities.organizationId does not exist`.

_Solução_: Criado arquivo SQL de migration manualmente em `prisma/migrations/20260418_add_organization_to_activity/migration.sql` e re-deploy com migrations.

---

## Tech Debt — Arquitetura DDD (Value Objects)

**Identificado em**: 2026-04-18 durante M3.5

**Problema**: Validação de regras de negócio está no use case em vez de Value Objects:
- `CreateLeadUseCase`: `if (!input.businessName?.trim())` → deve ser `LeadBusinessName` VO
- `CreateOrganizationUseCase`: já corrigido — usa `OrganizationName` VO ✅
- Outros use cases (contacts, deals, activities, partners) com padrão similar ainda a verificar

**Padrão correto** (aplicado em Organizations):
```
Controller  → HTTP layer (parse body, auth, conversão string→Date, retornar status)
Use case    → orquestra (cria VO, chama repo, coordena)
VO          → valida e encapsula regra de negócio (ex: OrganizationName)
```

**O que falta fazer** (fase dedicada de refactor, não bloqueia migração):
- [ ] Criar `LeadBusinessName` VO → refatorar `CreateLeadUseCase` e `UpdateLeadUseCase`
- [ ] Revisar use cases de Contacts, Deals, Activities, Partners para validações manuais
- [ ] Considerar VOs para campos com regras específicas (email, phone, taxId)

---

### 🔲 M7 — Pipeline & Stages
**Status**: Pendente

- Entidades sem `ownerId` (admin-managed)
- Drag & drop de stages (reorder)

---

### ✅ M8 — Admin (BusinessLines, Products, Tech)
**Status**: Completo

**Abordagem:** AdminModule único com entidades `BusinessLine`, `Product`, e `AdminTechOption` (genérica para 10 tipos via discriminador `TechOptionType`).

**Implementado:**
- Entities: `BusinessLine`, `Product`, `AdminTechOption` (cobre TechCategory, TechLanguage, TechFramework + 7 TechProfile types)
- `AdminRepository` abstrato com métodos para as 3 entidades
- Use cases agrupados: `business-line.use-cases.ts`, `product.use-cases.ts`, `tech-option.use-cases.ts`
- `PrismaAdminRepository` — usa mapa de modelo (`TECH_PRISMA_MODEL`) para despachar para tabela correta
- `AdminController` — 25 rotas via `/admin/business-lines`, `/admin/products`, `/admin/tech-options/:type`
- `AdminModule` registrado no `AppModule`
- 42 testes unitários (in-memory repository) — todos passando
- E2E tests em `backend/test/e2e/admin.e2e-spec.ts`
- Frontend hooks em `src/hooks/admin/use-admin.ts`

**Rotas:**
- `GET/POST /admin/business-lines`, `PATCH/DELETE /admin/business-lines/:id`, `PATCH /admin/business-lines/:id/toggle`
- `GET/POST /admin/products`, `PATCH/DELETE /admin/products/:id`, `PATCH /admin/products/:id/toggle`
- `GET/POST /admin/tech-options/:type`, `PATCH/DELETE /admin/tech-options/:type/:id`, `PATCH /admin/tech-options/:type/:id/toggle`

---

### 🔲 M9 — Shared Entities & Permissions
**Status**: Pendente

- `SharedEntity` model
- `canAccessEntity`, `getOwnerOrSharedFilter`
- Garantir que NestJS implementa a mesma lógica de isolamento que o Next.js tinha

---

### 🔲 M10 — Remover Server Actions do Next.js
**Status**: Pendente

Após todas as entidades migradas:
- Remover `src/actions/` completamente
- Remover `src/lib/backend/client.ts` (server-side fetch helper)
- Next.js vira frontend puro: sem `"use server"`, sem Prisma, sem NextAuth callbacks de dados

---

## Checklist por Fase

Para cada fase M2–M9, seguir esta ordem:

- [ ] Criar entidade de domínio (`/backend/src/domain/{entity}/enterprise/entities/`)
- [ ] Criar repository abstract (`application/repositories/`)
- [ ] Criar use cases (`application/use-cases/`) — um arquivo por use case
- [ ] Criar PrismaRepository (`infra/database/prisma/repositories/`)
- [ ] Criar mapper (`infra/database/prisma/mappers/`) — atenção a campos JSON e DateTime
- [ ] Criar controller (`infra/controllers/`) com Swagger decorators
- [ ] Registrar no module correspondente
- [ ] Testes unitários dos use cases (mocks do repository)
- [ ] Testes e2e com **todos os campos** (incluindo opcionais, JSON, datas)
- [ ] Converter páginas Next.js para client components com hooks React Query
- [ ] Remover mutations de `src/actions/{entity}.ts`
- [ ] `git push`
- [ ] Deploy backend: `ansible-playbook deploy-backend.yml`
- [ ] Deploy frontend: `ansible-playbook quick-deploy.yml`
- [ ] Validar nos logs do Nginx: POST 201, PATCH 200, DELETE 204 — confirmar que passa pelo NestJS
- [ ] Testar manualmente no browser: criar, atualizar, deletar

---

## Referências

- Backend: `/backend/src/`
- Hooks frontend: `/src/hooks/`
- Actions legadas: `/src/actions/`
- Deploy backend: `deploy/ansible/playbooks/deploy-backend.yml`
- Deploy frontend: `deploy/ansible/playbooks/quick-deploy.yml`
- Logs produção: `ssh root@45.90.123.190 "tail -f /var/log/nginx/access.log | grep contacts"`
