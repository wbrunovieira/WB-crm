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
  enterprise/entities/      ← entidades de domínio + Value Objects
  enterprise/value-objects/ ← VOs com validação encapsulada
  application/use-cases/    ← orquestração (sem validação de formato)
  application/repositories/ ← interfaces abstratas
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

## Padrão DDD Obrigatório (M10 em diante)

> Este padrão se aplica a todos os novos domínios. A correção do que foi feito antes (M1–M9) é tratada na fase de Tech Debt.

### Responsabilidades por camada

#### Controller — somente HTTP
O controller não toma decisões de negócio. Ele apenas:
- Extrai dados do request (body, params, query, `@CurrentUser()`)
- Converte tipos primitivos (`string → Date`, `string → number`)
- Chama o use case
- Mapeia o resultado para a resposta HTTP (`201`, `204`, `404`, `422`)

```typescript
// ✅ correto
async create(@Body() body: CreateLabelDto, @CurrentUser() user: AuthenticatedUser) {
  const result = await this.createLabel.execute({
    name: body.name,
    color: body.color,
    ownerId: user.id,
  });
  if (result.isLeft()) handleError(result);
  return { id: result.value.label.id.toString() };
}

// ❌ errado — validação de negócio no controller
async create(@Body() body: CreateLabelDto) {
  if (!body.name?.trim()) throw new BadRequestException("Nome obrigatório");
  if (body.color && !body.color.startsWith("#")) throw new UnprocessableEntityException("Cor inválida");
  ...
}
```

#### Value Objects — validação encapsulada
Toda regra de formato e invariante de negócio vive no VO. O VO retorna `Either<Error, VO>` e nunca lança exceção.

```typescript
// enterprise/value-objects/label-name.vo.ts
export class LabelName {
  private constructor(private readonly value: string) {}

  static create(raw: string): Either<InvalidLabelNameError, LabelName> {
    if (!raw?.trim()) return left(new InvalidLabelNameError("Nome não pode ser vazio"));
    if (raw.trim().length > 50) return left(new InvalidLabelNameError("Nome deve ter no máximo 50 caracteres"));
    return right(new LabelName(raw.trim()));
  }

  toString() { return this.value; }
}
```

#### Use Case — orquestrador
O use case cria VOs, verifica invariantes de domínio (duplicatas, regras de negócio), chama o repositório e retorna `Either`.

```typescript
// application/use-cases/create-label.use-case.ts
async execute(input: CreateLabelInput): Promise<Either<Error, { label: Label }>> {
  // 1. Criar VOs (validação de formato)
  const nameOrError = LabelName.create(input.name);
  if (nameOrError.isLeft()) return left(nameOrError.value);

  const colorOrError = HexColor.create(input.color);
  if (colorOrError.isLeft()) return left(colorOrError.value);

  // 2. Invariantes de domínio (regras de negócio)
  const exists = await this.repo.existsByNameAndOwner(nameOrError.value.toString(), input.ownerId);
  if (exists) return left(new DuplicateLabelError("Já existe uma label com esse nome"));

  // 3. Criar entidade
  const label = Label.create({
    name: nameOrError.value,
    color: colorOrError.value,
    ownerId: input.ownerId,
  });

  // 4. Persistir
  await this.repo.save(label);
  return right({ label });
}
```

#### Entidade — comportamento e invariantes
A entidade não é um DTO. Ela encapsula estado e expõe métodos de negócio.

```typescript
export class Label extends AggregateRoot<LabelProps> {
  get name() { return this.props.name.toString(); }
  get color() { return this.props.color.toString(); }

  update(data: { name?: string; color?: string }): Either<Error, void> {
    if (data.name) {
      const nameOrError = LabelName.create(data.name);
      if (nameOrError.isLeft()) return left(nameOrError.value);
      this.props.name = nameOrError.value;
    }
    return right(undefined);
  }
}
```

### TDD obrigatório

**Ordem de implementação para cada domínio:**

1. **Value Objects** — escrever testes antes do código
   - `describe("LabelName") → it("rejeita nome vazio") → implementar → verde`
2. **Entidade** — testes de comportamento (update, toggle, etc.)
3. **Use Cases** — testes com in-memory repository
   - Testar: caminho feliz, cada VO inválido, cada invariante de domínio
4. **E2E** — testes contra banco real
   - Testar: auth guard (401), happy path, validações (422), not found (404)
   - **Sempre incluir teste com todos os campos** (incluindo opcionais)

```
test/unit/domain/{entity}/
  enterprise/value-objects/label-name.spec.ts
  enterprise/entities/label.spec.ts
  application/use-cases/create-label.use-case.spec.ts
test/e2e/labels.e2e-spec.ts
```

### Estrutura de arquivos por domínio (template)

```
backend/src/domain/{entity}/
├── enterprise/
│   ├── entities/
│   │   └── {entity}.ts
│   └── value-objects/
│       ├── {entity}-name.vo.ts
│       └── {field}.vo.ts
├── application/
│   ├── repositories/
│   │   └── {entity}.repository.ts
│   └── use-cases/
│       └── {entity}.use-cases.ts   (ou um arquivo por use case)
└── {entity}.module.ts

backend/src/infra/
├── controllers/
│   └── {entity}.controller.ts
└── database/prisma/
    ├── repositories/{entity}/
    │   └── prisma-{entity}.repository.ts
    └── mappers/{entity}/
        └── {entity}.mapper.ts

backend/test/
├── unit/domain/{entity}/
│   ├── enterprise/value-objects/
│   ├── enterprise/entities/
│   ├── application/use-cases/
│   └── repositories/
│       └── in-memory-{entity}.repository.ts
└── e2e/
    └── {entity}.e2e-spec.ts
```

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

## Tech Debt — Arquitetura DDD

**Identificado em**: 2026-04-18 (M3.5) | **Regra vigente a partir de**: M10

### Regra obrigatória (M10 em diante)

```
Controller   → somente HTTP: extrai body/params, converte tipos primitivos, chama use case, retorna status
Use case     → orquestrador puro: cria VOs, chama repositório abstrato, retorna Either<Error, Result>
VO           → encapsula validação de formato e invariantes (nunca lança exceção, retorna Either)
Repository   → interface abstrata no domain; implementação Prisma fica em infra
```

**Nunca**: Prisma dentro de use case. **Nunca**: lógica de negócio no controller.

### Dívida nos domínios M1–M9 (padrão legado)

| Domínio | Problema | Prioridade |
|---------|---------|-----------|
| Leads | `if (!input.businessName?.trim())` no use case — deve ser `LeadBusinessName` VO | Alta |
| Contacts | Validações manuais de email/telefone no use case | Média |
| Deals, Activities, Partners | Validações inline sem VOs | Média |
| GoTo, WhatsApp, Email, Meet | Seguem padrão M10 — OK ✅ | — |

**O que fazer** (fase dedicada de refactor, não bloqueia migração):
- [ ] Criar `LeadBusinessName` VO → refatorar `CreateLeadUseCase` e `UpdateLeadUseCase`
- [ ] VOs para `Email`, `PhoneNumber`, `TaxId` nos domínios Contacts e Leads
- [ ] Revisar Deals, Activities, Partners para validações inline

### ~~Dívida: Meet — tabela `Meeting` no Prisma~~ (resolvido em M10.4)

M10.4 implementou modelo `Meeting` completo no Prisma, endpoints CRUD REST e cron jobs de detecção/polling.

---

### ✅ M7 — Pipeline & Stages
**Status**: Completo

**Implementado:**
- `Pipeline` entity (name, isDefault) + `Stage` entity (name, order, pipelineId, probability)
- `PipelinesRepository` abstrato — co-locado: pipelines + stages num mesmo repositório (stages pertencem ao pipeline)
- 10 use cases: `GetPipelines`, `GetPipelineById`, `CreatePipeline`, `UpdatePipeline`, `DeletePipeline`, `SetDefaultPipeline`, `CreateStage`, `UpdateStage`, `DeleteStage`, `ReorderStages`
- `PrismaPipelinesRepository` — `createDefaultStages` (4 estágios padrão), `reorderStages` via `$transaction`, `clearDefault` atômico
- `PipelinesController` — 11 rotas: `GET/POST /pipelines`, `GET/PATCH/DELETE /pipelines/:id`, `PATCH /pipelines/:id/set-default`, `POST /pipelines/stages`, `PATCH/DELETE /pipelines/stages/:id`, `PATCH /pipelines/:id/stages/reorder`
- 26 testes unitários + e2e cobrindo todos os endpoints
- Frontend hooks em `src/hooks/pipelines/use-pipelines.ts` (10 hooks)
- Componentes `PipelineCreateButton`, `PipelineManager`, `StageManager` migrados para React Query

**Decisões arquiteturais:**
- `clearDefault()` antes de `setDefault(true)` — atômico, sem race condition
- Auto-create 4 default stages na criação do pipeline (Qualificação 10%, Proposta 30%, Negociação 60%, Fechamento 90%)
- `DeletePipeline` retorna 422 se `isDefault === true`; `DeleteStage` retorna 422 se stage tem deals

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

### ✅ M9 — Shared Entities & Permissions
**Status**: Completo em 2026-04-18

#### O que foi implementado

**Domínio (`SharedEntity`)**
- `SharedEntity` entity (AggregateRoot) — campos: `entityType`, `entityId`, `sharedWithUserId`, `sharedByUserId`, `createdAt`
- `SharedEntityType` = `"lead" | "contact" | "organization" | "partner" | "deal"`
- `SharedEntitiesRepository` abstrato com 7 métodos: `findById`, `findByEntity`, `findSharedUserInfo`, `save`, `delete`, `existsForUser`, `transferOwnership`

**Use cases (4)**
- `ShareEntityUseCase` — valida role admin, tipo válido, não-self-share, não-duplicado → cria `SharedEntity`
- `UnshareEntityUseCase` — valida admin, busca por id → deleta
- `GetEntitySharesUseCase` — valida admin → retorna `SharedUserInfo[]` (userId, userName, userEmail, sharedAt)
- `TransferEntityUseCase` — valida admin + tipo → `transferOwnership()` (atualiza ownerId + remove todos os shares)

**Infraestrutura**
- `PrismaSharedEntitiesRepository` — `transferOwnership` usa `prisma[entityTable].update({ ownerId })` + `deleteMany` de shares
- `SharedEntitiesController` — 4 rotas com `JwtAuthGuard`:
  - `GET /shared-entities?entityType=&entityId=` → lista shares
  - `POST /shared-entities` → cria share (201)
  - `DELETE /shared-entities/:id` → remove share (204)
  - `PATCH /shared-entities/transfer` → transfere ownership (200)
- `SharedEntitiesModule` registrado no `AppModule`

**OR-filter nos 4 módulos restantes**
Leads, Organizations, Partners e Deals atualizados com padrão:
```typescript
// findMany: pré-busca sharedIds para non-admin
const sharedIds = requesterRole !== "admin" ? await this.getSharedIds(requesterId) : [];
// WHERE ownerId = self OR id IN (sharedIds)

// findById: post-fetch access check
if (requesterRole !== "admin" && row.ownerId !== requesterId) {
  const shared = await this.prisma.sharedEntity.findFirst({ where: { entityType, entityId: id, sharedWithUserId: requesterId } });
  if (!shared) return null;
}
```
(Contacts já tinham suporte — padrão aplicado para os 4 restantes)

**Testes**
- 19 testes unitários (in-memory repository) — todos passando ✅
- 21 testes E2E cobrindo auth guard, CRUD completo, integração SDR acessa/perde acesso após share/unshare — todos passando ✅
- Deploy confirmado em produção ✅

---

### 🔄 M10 — Integrações & Automações
**Status**: Em andamento — GoTo ✅ | WhatsApp ✅ | Email ✅ | Meet ✅ | Lead Research ✅

#### Automações mapeadas no Next.js

| Integração | Arquivo atual (Next.js) | NestJS | Tipo |
|---|---|---|---|
| GoTo webhook receiver | `api/goto/webhook/route.ts` | ✅ `GoToWebhookController` | Webhook público |
| GoTo recordings + S3 + Transcriber | `api/goto/check-recordings/route.ts` | ✅ `GoToRecordingCronService` | Cron 15min |
| GoTo token manager (auto-refresh) | `lib/goto/token-manager.ts` | ✅ `GoToTokenService` (Prisma) | Serviço |
| GoTo call activity creator | `lib/goto/call-activity-creator.ts` | ✅ `CreateCallActivityUseCase` | Use case |
| GoTo phone number matcher | `lib/goto/number-matcher.ts` | ✅ `PhoneMatcherService` (shared) | Serviço |
| GoTo S3 recording finder | `lib/goto/s3-recording.ts` | ✅ `S3RecordingClient` | Adapter |
| GoTo call report syncer | `lib/goto/call-report-syncer.ts` | ✅ `GoToApiClient` + cron | Use case |
| WB-Transcriber client | `lib/transcriptor.ts` | ✅ `TranscriberService` (shared) | Adapter |
| WhatsApp webhook receiver | `api/evolution/webhook/route.ts` | ✅ `WhatsAppWebhookController` | Webhook público |
| WhatsApp transcription cron | `api/evolution/check-transcriptions/route.ts` | ✅ `WhatsAppTranscriptionCronService` | Cron 5min |
| WhatsApp media (Drive + Transcriber) | `lib/evolution/media-handler.ts` | ✅ `ProcessWhatsAppMediaUseCase` | Use case |
| WhatsApp message activity creator | `lib/evolution/message-activity-creator.ts` | ✅ `ProcessWhatsAppMessageUseCase` | Use case |
| WhatsApp send (server action) | `actions/whatsapp.ts` | ✅ `POST /whatsapp/send` + `SendWhatsAppMessageUseCase` | Mutação |
| Evolution API client | `lib/evolution/client.ts` | ✅ `EvolutionApiClient` | Adapter |
| Gmail poll cron | `api/google/gmail-poll/route.ts` | ✅ `GmailPollCronService` | Cron 5min |
| Gmail email activity creator | `lib/google/email-activity-creator.ts` | ✅ `ProcessIncomingEmailUseCase` | Use case |
| Gmail poller (History API) | `lib/google/gmail-poller.ts` | ✅ `GmailClient` | Adapter |
| Gmail send + tracking inject | `actions/gmail.ts` | ✅ `POST /email/send` + `SendEmailUseCase` | Mutação |
| Email tracking open pixel | `api/track/open/[token]/route.ts` | ✅ `GET /track/open/:token` | Endpoint público |
| Email tracking click redirect | `api/track/click/[token]/route.ts` | ✅ `GET /track/click/:token` | Endpoint público |
| Email tracking logic | `lib/email-tracking.ts` | ✅ `TrackEmailOpenUseCase` + `TrackEmailClickUseCase` | Use cases |
| Google Meet recordings (3 passes) | `api/google/check-recordings/route.ts` | ✅ | Cron 15min |
| Meet transcription cron | `api/google/check-transcriptions/route.ts` | 🔲 | Cron 5min |
| Meet recording detector | `lib/google/recording-detector.ts` | 🔲 | Adapter |
| Google Drive client | `lib/google/drive.ts` | 🔲 `GoogleDriveService` (shared) | Adapter |
| Gmail client | `lib/google/gmail.ts` | 🔲 | Adapter |
| Google OAuth callback | `api/google/callback/route.ts` | 🔲 | OAuth flow |
| GoTo OAuth callback | `api/goto/callback/route.ts` | 🔲 | OAuth flow |
| Lead research webhook | `api/webhooks/lead-research/route.ts` | 🔲 | Webhook público |

#### M10.1 — GoTo Connect ✅ Completo em 2026-04-19

**Arquitetura implementada:**

```
backend/src/domain/integrations/goto/
├── enterprise/value-objects/
│   ├── call-outcome.vo.ts     ← ISDN Q.850 + voicemail heurístic (< 15s)
│   └── call-duration.vo.ts    ← não-negativo + format()
├── application/
│   ├── ports/
│   │   ├── goto-api.port.ts   ← fetchCallReport, fetchReportsSince, refreshToken
│   │   ├── goto-token.port.ts ← getValidAccessToken
│   │   └── s3-storage.port.ts ← findRecordingKey, findSiblingKey, download
│   └── use-cases/
│       ├── handle-goto-webhook.use-case.ts    ← ignora não-REPORT_SUMMARY; nunca 500
│       ├── create-call-activity.use-case.ts   ← idempotência, phone match, recording só se atendida
│       ├── process-call-recording.use-case.ts ← S3 dual-track → Transcriber
│       └── poll-call-transcriptions.use-case.ts ← interleave por timestamp + speaker
└── infra/
    ├── controllers/goto-webhook.controller.ts ← POST /webhooks/goto/calls (sem JWT)
    ├── scheduled/goto-recording-cron.service.ts ← @Cron("*/15 * * * *")
    ├── goto-api.client.ts     ← GoToApiPort impl (paginação, Bearer token)
    ├── goto-token.service.ts  ← GoToTokenPort impl (IntegrationToken no Prisma)
    └── s3-recording.client.ts ← S3StoragePort impl (ListObjectsV2, sibling detection)

backend/src/infra/shared/              ← @Global() — disponível em todos os módulos
├── transcriber/
│   ├── transcriber.port.ts    ← submitAudio, submitVideo, getStatus, getResult
│   └── transcriber.service.ts ← HTTP client para WB-Transcriber
├── phone-matcher/
│   └── phone-matcher.service.ts ← regexp_replace PostgreSQL, variações de DDD/DDI
└── shared-infra.module.ts
```

**Decisões arquiteturais:**
- `GoToTokenService` usa tabela `IntegrationToken` no Prisma — elimina o hack `sed` no `.env` do Next.js
- `PhoneMatcherService` unificado no `SharedInfraModule` — antes havia cópia em GoTo e cópia em Evolution
- `GoToWebhookController` sem `JwtAuthGuard` — valida `?secret=GOTO_WEBHOOK_SECRET`, trata ping por user-agent
- Webhook nunca retorna 500 — captura qualquer erro interno, loga e retorna 200 (evita retry loops do GoTo)
- `PollCallTranscriptionsUseCase` interleave de segmentos por timestamp, adiciona `speaker: "agent" | "client"` e `speakerName` do banco

**Testes:** 52 unit tests + 5 e2e tests — 386 total passando ✅

**Variáveis de ambiente necessárias:**
```env
GOTO_CLIENT_ID, GOTO_CLIENT_SECRET
GOTO_WEBHOOK_SECRET
GOTO_ACCOUNT_KEY, GOTO_DEFAULT_OWNER_ID
AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_GOTO_BUCKET
TRANSCRIPTOR_BASE_URL, TRANSCRIPTOR_API_KEY
```

#### M10.2 — WhatsApp (Evolution API) ✅ Completo em 2026-04-18

**Implementado:**
- `WhatsAppWebhookController` — POST /webhooks/whatsapp (sem JWT, valida `X-Webhook-Secret`, forward p/ n8n)
- `ProcessWhatsAppMessageUseCase` — sessões 2h, idempotência por messageId, Notification em nova sessão
- `ProcessWhatsAppMediaUseCase` — download da Evolution API → Google Drive → WB-Transcriber
- `WhatsAppTranscriptionCronService` — `@Cron("*/5 * * * *")`, polling + atualização de transcrições
- `SendWhatsAppMessageUseCase` + `POST /whatsapp/send` (JWT)
- `EvolutionApiClient` — implementação do `EvolutionApiPort`
- `PrismaWhatsAppMessagesRepository` — persistência e sessão de 2h via `findLastInSession()`
- VOs: `WhatsAppJid` (isGroup, extractPhone), `WhatsAppMessageType` (8 tipos, isDownloadable, isTranscribable)
- 68 novos testes (VOs + use cases + E2E) | 454 total passando

#### M10.3 — Email (Gmail) ✅ Completo em 2026-04-20

**Implementado:**
- VOs: `EmailAddress`, `EmailTrackingToken`, `TrackingType`
- Ports: `GmailPort` (send, pollHistory, getProfile, getMessage), `GoogleOAuthPort` (getValidToken, storeTokens)
- Use cases: `SendEmailUseCase`, `PollGmailUseCase`, `ProcessIncomingEmailUseCase`, `TrackEmailOpenUseCase`, `TrackEmailClickUseCase`
- Repositories: `EmailMessagesRepository`, `EmailTrackingRepository` (stubs em memória — schema Prisma pendente para M10.3.5)
- `EmailController` — POST /email/send (JWT), GET /email/messages (JWT)
- `EmailWebhookController` — GET /track/open/:token (público, retorna 1x1 GIF), GET /track/click/:token (público, redirect 302)
- `GmailPollCronService` — `@Cron("*/5 * * * *")`
- `GmailClient` e `GoogleOAuthService` — implementações dos ports
- 8 testes unitários (VOs) + 5 use case specs + 13 e2e tests — todos passando ✅
- `BOT_PATTERNS` afinado: `"apple"` removido (batia em AppleWebKit), substituído por `"applebot"` e `"apple-icloud"`
- `vitest.config.ts` — alias `@test` adicionado para imports cross-domain entre specs

**M10.3.5 — schema + Prisma real ✅ Completo:**
- Modelos `EmailMessage` e `EmailTracking` presentes em `prisma/schema.prisma`
- `PrismaEmailMessagesRepository` e `PrismaEmailTrackingRepository` implementados e wired no módulo

#### M10.4 — Google Meet ✅ Completo em 2026-04-22

**Implementado:**
- `DetectMeetRecordingsUseCase` — 3-pass strategy: Pass 0 (Drive-first), Pass 1 (time-based fallback), Pass 2 (retry pendentes 4h)
- `PollMeetTranscriptionsUseCase` — polling de jobs de transcrição de vídeo
- `RefreshMeetRsvpUseCase` — polling de RSVP via Google Calendar (5min)
- `MeetRecordingsCronService` (`*/15 * * * *`), `MeetTranscriptionsCronService` (`*/5 * * * *`), `MeetRsvpCronService` (`*/5 * * * *`)
- `GoogleDrivePort` + `GoogleDriveClient` — findMeetRecordingsFolder, listFilesInFolder, exportDocText, downloadFile
- `GoogleCalendarPort` + `GoogleCalendarClient` — getMeetEvent, createMeetEvent, updateEvent, cancelEvent
- Meetings CRUD (7 use cases): GetMeetings, GetMeetingById, ScheduleMeeting, UpdateMeeting, CancelMeeting, CheckMeetingTitle, UpdateMeetingSummary
- `MeetingsCrudController` — 7 endpoints REST autenticados via JWT
- `PrismaMeetingsRepository` — 20+ métodos com transações atômicas
- `MeetModule` registrado em `app.module.ts`
- **36 unit tests** cobrindo todos os use cases + cenários de resiliência (36/36 ✅)

#### M10.5 — Lead Research Webhook ✅ Completo em 2026-04-20

- `POST /webhooks/lead-research` — sem JWT; valida `X-Internal-Api-Key`, `X-Webhook-Secret` ou IP local
- `NotificationsRepository` abstrato + `PrismaNotificationsRepository` (infra)
- `CreateLeadResearchNotificationUseCase` — orquestra: resolve userId (payload ou fallback admin), cria Notification
- Controller nunca retorna 500 (evita retry loops do Agent)
- 5 testes unitários com `FakeNotificationsRepository` — todos passando ✅

#### Variáveis de ambiente completas (M10)

```env
# GoTo (✅ já configurado)
GOTO_CLIENT_ID, GOTO_CLIENT_SECRET, GOTO_WEBHOOK_SECRET
GOTO_ACCOUNT_KEY, GOTO_DEFAULT_OWNER_ID
AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_GOTO_BUCKET
TRANSCRIPTOR_BASE_URL, TRANSCRIPTOR_API_KEY

# Evolution (WhatsApp)
EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE
EVOLUTION_WEBHOOK_SECRET, EVOLUTION_OWNER_ID

# Google (OAuth + Gmail + Drive + Meet)
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI

# Segurança
CRON_SECRET, INTERNAL_API_KEY
```

---

### ✅ M11 — Labels, CNAE, Setores, ICP, Tech Profile, Product Links
**Status**: Concluído em 2026-04-20

Labels ✅ | CNAE ✅ | Setores ✅ | ICP ✅ | Tech Profile ✅ | Product Links ✅

#### Contexto

Funcionalidades de enriquecimento de entidades (tags, classificações, tech stack, produtos) que hoje vivem inteiramente em server actions do Next.js. São usadas em conjunto com Leads, Organizations e Deals — precisam de endpoints REST no NestJS para que o frontend possa migrar para React Query.

#### Subdomínios

**Labels**
- `Label` entity + `LabelName` VO (máx 50 chars, não vazio) + `HexColor` VO
- Use cases: `CreateLabel`, `UpdateLabel`, `DeleteLabel`, `GetLabels`
- Vínculos M2M: `AddLabelToLead`, `RemoveLabelFromLead`, `SetLeadLabels`, `AddLabelToOrganization`, `RemoveLabelFromOrganization`, `SetOrganizationLabels`
- Rotas: `GET/POST /labels`, `PATCH/DELETE /labels/:id`, `POST/DELETE /leads/:id/labels`, `PUT /leads/:id/labels`, `POST/DELETE /organizations/:id/labels`, `PUT /organizations/:id/labels`

**CNAE (Classificação Nacional de Atividades Econômicas)**
- Sem entity de domínio (tabela de referência imutável) — apenas repositório de leitura
- Use cases: `SearchCNAEs`, `GetCNAEById`
- Vínculos: `AddSecondaryCNAEToLead`, `RemoveSecondaryCNAEFromLead`, `AddSecondaryCNAEToOrganization`, `RemoveSecondaryCNAEFromOrganization`
- Rotas: `GET /cnaes?q=`, `GET /cnaes/:id`, `POST/DELETE /leads/:id/cnaes`, `POST/DELETE /organizations/:id/cnaes`

**Setores**
- `Sector` entity + VOs para campos obrigatórios (name, slug)
- Use cases: `CreateSector`, `UpdateSector`, `DeleteSector`, `GetSectors`, `GetSectorById`
- Vínculos: `LinkLeadToSector`, `UnlinkLeadFromSector`, `LinkOrganizationToSector`, `UnlinkOrganizationFromSector`
- Rotas: `GET/POST /sectors`, `PATCH/DELETE /sectors/:id`, `POST/DELETE /leads/:id/sectors`, `POST/DELETE /organizations/:id/sectors`

**ICP (Ideal Customer Profile)**
- `ICP` entity (name, description, criteria) + `ICPLink` entity com 12 campos de categorização
- VOs: `ICPFitStatus`, `PerceivedUrgency`, `BusinessMoment`
- Use cases: `GetICPs`, `GetICPById`, `LinkLeadToICP`, `UpdateLeadICP`, `UnlinkLeadFromICP`, `LinkOrganizationToICP`, `UpdateOrganizationICP`, `UnlinkOrganizationFromICP`, `CopyLeadICPsToOrganization`
- Rotas: `GET /icps`, `GET /icps/:id`, `POST/PATCH/DELETE /leads/:id/icps/:icpId`, `POST/PATCH/DELETE /organizations/:id/icps/:icpId`

**Tech Profile (Lead + Organization)**
- Sem entity nova — vínculos com tabelas existentes (TechProfileLanguage, TechProfileFramework, etc.)
- Use cases por tipo: `AddTechProfileItem`, `RemoveTechProfileItem`, `GetTechProfile`
- Cobre: languages, frameworks, hosting, databases, ERPs, CRMs, ecommerce
- Rotas: `GET /leads/:id/tech-profile`, `POST/DELETE /leads/:id/tech-profile/{type}`, idem para `/organizations/:id/`

**Deal Tech Stack**
- Vínculos de Deal com TechCategory, TechLanguage (com `isPrimary`), TechFramework
- Use cases: `AddDealTechItem`, `RemoveDealTechItem`, `GetDealTechStack`
- Rotas: `GET /deals/:id/tech-stack`, `POST/DELETE /deals/:id/tech-stack/{type}`

**Product Links**
- Vínculos Lead/Org/Deal/Partner com Product + campos extras (interestLevel, estimatedValue, notes)
- Deal products: soft-delete com `status` + `removedAt`
- Use cases: `AddProductLink`, `UpdateProductLink`, `RemoveProductLink`, `GetProductLinks`
- Rotas: `POST/PATCH/DELETE /leads/:id/products/:productId`, idem para orgs, deals, partners

#### Padrão TDD
Para cada subdomínio:
1. VOs primeiro (nome, slug, status enums) com testes unitários
2. Use cases com in-memory repo
3. E2E cobrindo autenticação, happy path, validações, not found

---

### ✅ M12 — Conversão de Lead, Cadências, Importação, Propostas, Operações
**Status**: Concluído em 2026-04-20 — M12.1–M12.8 ✅

#### Contexto

Fluxos de negócio mais complexos que envolvem transações, orquestração multi-entidade e lógica de automação.

---

#### ✅ M12.1 — Conversão de Lead → Organization (2026-04-20)

- `ConvertLeadToOrganizationUseCase` — transação atômica: cria Org, copia 7 tech profile tables + CNAEs secundários, cria Contacts a partir de LeadContacts, atualiza Lead (`status="qualified"`, `convertedToOrganizationId`)
- `LeadConversionRepository` abstract + `PrismaLeadConversionRepository` (single `$transaction`)
- `Lead.markAsConverted(organizationId)` adicionado à entidade
- Rota: `POST /leads/:id/convert`
- 9 unit tests + 6 E2E tests — todos passando ✅

---

#### ✅ M12.2 — Verificação de Duplicatas de Lead (2026-04-20)

- `CheckLeadDuplicatesUseCase` — scoring por campo: CNPJ (25pts), email (25pts), telefone (25pts), nome (25pts)
- `NoCriteriaError` se nenhum campo fornecido; retorna `DuplicateMatch[]` ordenado por score
- Rota: `POST /leads/check-duplicates`
- 8 unit tests + 5 E2E tests — todos passando ✅

---

#### ✅ M12.3 — Transferência para Operações (2026-04-20)

- `TransferToOperationsUseCase`, `RevertFromOperationsUseCase`
- `OperationsEntityType = "lead" | "organization"` (únicos com `inOperationsAt` no schema)
- Rotas: `PATCH /operations/transfer`, `PATCH /operations/revert`
- 8 unit tests + 4 E2E tests — todos passando ✅

---

#### ✅ M12.4 — Cadências (2026-04-20)

**VOs:** `CadenceName` (máx 100 chars), `CadenceSlug` (NFD + hífens, único por owner), `CadenceStatus` (draft/active/archived), `StepChannel` (email/linkedin/whatsapp/call/meeting/instagram/task), `StepDayNumber` (1–365, inteiro), `LeadCadenceStatus` (active/paused/completed/cancelled)

**Entidades:** `Cadence` (AggregateRoot) com `publish()` / `unpublish()` — rejeita publicar se arquivada; `CadenceStep` com `activityType` getter via `StepChannel.toActivityType()`

**17 use cases:**
- CRUD: `CreateCadence`, `UpdateCadence`, `DeleteCadence`, `GetCadences`, `GetCadenceById`, `PublishCadence`, `UnpublishCadence`
- Steps: `CreateCadenceStep`, `UpdateCadenceStep`, `DeleteCadenceStep`, `ReorderCadenceSteps`, `GetCadenceSteps`
- Lead: `ApplyCadenceToLeadUseCase` (gera Activities + LeadCadenceActivity em `$transaction`), `GetLeadCadences`, `PauseLeadCadence`, `ResumeLeadCadence`, `CancelLeadCadence`

**Rotas:**
- `GET/POST /cadences`, `GET/PATCH/DELETE /cadences/:id`, `PATCH /cadences/:id/publish|unpublish`
- `GET/POST /cadences/:cadenceId/steps`, `PATCH/DELETE /cadences/steps/:stepId`, `PATCH /cadences/:cadenceId/steps/reorder`
- `POST /cadences/:cadenceId/apply`, `GET /cadences/lead/:leadId`
- `PATCH /cadences/lead-cadences/:id/pause|resume|cancel`

**Decisão arquitetural:** rotas estáticas (`steps/`, `lead/`, `lead-cadences/`) declaradas antes de `:id` no controller para evitar colisão de rotas no NestJS.

**Testes:** 56 unit tests + 9 E2E tests — todos passando ✅

---

#### ✅ M12.5 — Disqualification Reasons (2026-04-20)

- `ReasonName` VO (trim, máx 100 chars)
- `DisqualificationReason` entity
- 3 use cases: `GetDisqualificationReasons`, `CreateDisqualificationReasonUseCase` (dedup por name+owner), `DeleteDisqualificationReasonUseCase`
- Rotas: `GET/POST /disqualification-reasons`, `DELETE /disqualification-reasons/:id`
- 15 unit tests + 7 E2E tests — todos passando ✅

---

#### ✅ M12.6 — Lead Import (2026-04-20)

- `ImportLeadsUseCase` — batch com deduplicação em 2 níveis:
  1. Por CNPJ (se fornecido) — busca bulk no banco
  2. Por `businessName` case-insensitive — busca bulk no banco + dedup intra-batch
- Retorna `ImportResult { total, imported, skipped, errors[] }` — nunca falha, apenas reporta
- `PrismaLeadImportRepository` com `findMany mode:"insensitive"` + `createMany skipDuplicates:true`
- Rota: `POST /lead-import`
- 10 unit tests + 6 E2E tests — todos passando ✅

---

#### ✅ M12.7 — Propostas (2026-04-20)

- `ProposalTitle` VO (trim, máx 200 chars), `ProposalStatus` VO (draft/sent/accepted/rejected, factory `draft()` e `sent()`)
- `Proposal` entity — `sentAt` auto-set em `create()` e `update()` ao status="sent"
- 5 use cases: `GetProposals`, `GetProposalById`, `CreateProposal`, `UpdateProposal`, `DeleteProposal`
- Filtros: `?leadId=&dealId=&status=`
- Rotas: `GET/POST /proposals`, `GET/PATCH/DELETE /proposals/:id`
- 7 unit tests + 8 E2E tests — todos passando ✅

---

#### ✅ M12.8 — Renovações de Hosting (2026-04-20)

- `GetUpcomingRenewalsUseCase` — filtra `Organization` por `hasHosting=true` + `hostingRenewalDate` entre hoje e hoje+N dias (padrão 30); ordena por `daysUntilRenewal` ascendente
- `CreateRenewalActivityUseCase` — cria Activity `type="task"` vinculada à organização; assunto padrão "Renovação de hospedagem"
- Sem VOs de domínio próprios — usa `UpcomingRenewal` como interface de retorno direto do repo
- Rotas: `GET /hosting-renewals?daysAhead=`, `POST /hosting-renewals/:organizationId/activity`
- 7 unit tests + 6 E2E tests — todos passando ✅

---

### ✅ M13 — Notificações, Dashboard, Usuários, Reuniões, Funil
**Status**: Concluído (2026-04-20)

#### Contexto

Funcionalidades transversais: sistema de notificações em tempo real, métricas do dashboard administrativo, gerenciamento de usuários e agendamento de reuniões.

#### Subdomínios

**Notificações**
- `Notification` entity (type, title, summary, read, userId, jobId?)
- Use cases: `GetNotificationsUseCase`, `MarkNotificationsReadUseCase` (por IDs ou todas)
- `CreateNotificationUseCase` — usado internamente pelos domain event handlers
- **SSE (Server-Sent Events)**: `NotificationsGateway` com `@Sse("/notifications/stream")`
  - No NestJS o SSE é um endpoint que retorna `Observable<MessageEvent>`
  - Substituir o EventBus in-memory do Next.js por `EventEmitter2` do `@nestjs/event-emitter`
  - Cada user abre uma conexão SSE autenticada via JWT; o gateway mantém stream ativo com keepalive de 25s
- Rotas: `GET /notifications`, `PATCH /notifications/read`, `GET /notifications/stream` (SSE)

**Usuários**
- `User` entity (já existe via AuthModule — expor endpoint de listagem)
- Use cases: `GetUsersUseCase` (admin: todos; outro: apenas self), `RegisterUserUseCase` (já existe via `/auth/register`)
- Rota: `GET /users`

**Reuniões (Google Meet / Google Calendar)**
- `Meeting` entity (title, scheduledAt, duration, googleEventId, googleMeetLink, status, linkedTo)
- VOs: `MeetingStatus` (scheduled, ended, cancelled), `MeetingDuration`
- Use cases: `ScheduleMeetingUseCase` (cria evento no Calendar + persiste), `UpdateMeetingUseCase`, `CancelMeetingUseCase` (cancela no Calendar), `GetMeetingsUseCase`
- Port: `GoogleCalendarPort` (createEvent, updateEvent, cancelEvent, getEvent)
- Rota: `GET/POST /meetings`, `PATCH/DELETE /meetings/:id`
- Nota: domain events de Meeting são consumidos pelo módulo Google Meet (M10) para detecção de gravações

**Dashboard Administrativo**
- Sem entidade de domínio — read model puro (queries direto no Prisma)
- Use cases: `GetManagerStatsUseCase` (métricas por usuário: leads criados/convertidos, deals por status/valor, atividades por tipo, mudanças de stage), `GetTimelineDataUseCase` (leads/deals por dia), `GetActivityCalendarUseCase` (heatmap de atividades do mês)
- Rota: `GET /dashboard/stats`, `GET /dashboard/timeline`, `GET /dashboard/activity-calendar`

**Funil de Vendas**
- Sem entidade — read model com cálculos
- Use cases: `GetFunnelStatsUseCase` (leads únicos, chamadas, conexões, decisores, reuniões, vendas), `GetWeeklyGoalsUseCase`, `UpsertWeeklyGoalUseCase`
- `WeeklyGoal` entity (targetSales, week, ownerId)
- Rota: `GET /funnel/stats`, `GET/POST /funnel/goals`

#### O que foi implementado

**Notificações** (`NotificationsModule`):
- `Notification` entity com VOs `NotificationType` (7 tipos) e `NotificationStatus` (pending/completed/error)
- 3 use cases: `GetNotificationsUseCase` (com filtro `?unread=true`), `CreateNotificationUseCase`, `MarkNotificationsReadUseCase` (por IDs ou all)
- SSE via `@Sse("notifications/stream")` + `NotificationsEventBus` (Subject RxJS + keepalive 25s)
- `NotificationsModule` exporta `CreateNotificationUseCase` e `NotificationsEventBus` para outros módulos
- 15 unit tests + 7 E2E tests ✅

**Usuários** (`AuthModule` / `UsersController`):
- `GetUsersUseCase` — admin: todos os usuários; sdr/closer: apenas self
- `UsersRepository.findAll()` + `findById()` adicionados ao repo e implementação Prisma
- Rota: `GET /users`
- 3 E2E tests ✅

**Dashboard** (`DashboardModule`):
- 3 use cases read-only (direto no Prisma, sem entidade de domínio):
  - `GetManagerStatsUseCase` — leads criados/convertidos, atividades por tipo, deals por status e valor por owner
  - `GetTimelineDataUseCase` — leads + deals criados por dia (últimos N dias, padrão 30)
  - `GetActivityCalendarUseCase` — heatmap de atividades do mês (por ano/mês)
- Rotas: `GET /dashboard/stats`, `GET /dashboard/timeline?days=`, `GET /dashboard/activity-calendar?year=&month=`
- 4 E2E tests ✅

**Funil** (`FunnelModule`):
- 3 use cases (direto no Prisma):
  - `GetFunnelStatsUseCase` — leads, calls, connections, meetings, deals won/total
  - `GetWeeklyGoalsUseCase` — lista metas semanais do owner
  - `UpsertWeeklyGoalUseCase` — cria ou atualiza via `weekStart_ownerId` unique
- Rotas: `GET /funnel/stats`, `GET/POST /funnel/goals`
- 4 E2E tests ✅

**Reuniões** (`MeetModule` — CRUD adicionado):
- 5 use cases CRUD: `GetMeetingsUseCase`, `GetMeetingByIdUseCase`, `ScheduleMeetingUseCase`, `UpdateMeetingUseCase`, `CancelMeetingUseCase` (seta status="cancelled", não deleta)
- `MeetingsRepository` estendido com `findById`, `findByOwner`, `create`, `update`, `delete`
- `MeetingsCrudController` com serialização de `attendeeEmails` (JSON parse/stringify)
- Rotas: `GET/POST /meetings`, `GET/PATCH/DELETE /meetings/:id`
- 6 E2E tests ✅

---

### ✅ M14 — Remover Next.js Backend (Frontend Puro)
**Status**: Fase 1 concluída em 2026-04-22 | Fases 2–4 pendentes

Pré-requisito: M10, M11, M12, M13 concluídos e validados em produção.

#### Progresso geral

| Item | Status |
|------|--------|
| `src/actions/` (9 arquivos) | ✅ Deletado |
| `src/lib/evolution/` | ✅ Deletado |
| `src/lib/event-bus.ts` | ✅ Deletado |
| `src/lib/goto/` (exceto s3-recording.ts) | ✅ Deletado |
| `src/lib/google/` | ✅ Deletado (auth.ts M14.4, token-store.ts M14.5) |
| `src/lib/email-tracking.ts` | ✅ Deletado |
| `src/lib/internal-auth.ts` | ✅ Deletado |
| `src/lib/goto/` | ✅ Deletado (s3-recording.ts M14.3) |
| `src/lib/transcriptor.ts` | ✅ Deletado (órfão) |
| `src/services/` (leads, deals, activities) | ✅ Deletado (órfão) |
| `src/app/api/google/gmail-poll/` | ✅ Deletado |
| `src/app/api/goto/webhook` | ✅ Deletado + Nginx roteado → NestJS |
| `src/app/api/goto/sync` | ✅ Deletado + Nginx roteado → NestJS |
| `src/app/api/evolution/webhook` | ✅ Deletado + Nginx roteado → NestJS |
| `src/app/api/track/` (open + click) | ✅ Deletado + Nginx roteado → NestJS |
| `src/app/api/webhooks/lead-research` | ✅ Deletado + Nginx roteado → NestJS |
| `src/app/api/notifications/stream` | ✅ M14.2 — SSE via JWT query param (2026-04-22) |
| `src/app/api/evolution/media/[messageId]` | ✅ M14.3 — `GET /whatsapp/media/:id` no NestJS |
| `src/app/api/proposals/[id]/file` | ✅ M14.3 — `GET /proposals/:id/file` no NestJS |
| `src/app/api/goto/recordings/[activityId]` | ✅ M14.3 — `GET /goto/recordings/:id` no NestJS |
| `src/app/api/google/disconnect` | ✅ M14.4 — `POST /google/disconnect` no NestJS |
| `src/app/api/google/auth` + `callback` | ✅ M14.4 — thin proxies → NestJS OAuth controller |
| `src/app/api/register/` | ✅ M14.5 — register page chama NestJS diretamente |
| `src/lib/funnel/` | 🔲 Avaliar — utilitários puros de UI, manter ou mover |
| `src/lib/prisma.ts` | 🔲 Após remover dependência em lib/auth.ts (NextAuth) |

#### O que fica no Next.js
```
src/app/(auth)/        → Login + Register UI
src/app/(dashboard)/   → Páginas (SSR via backendFetch + React Query)
src/components/        → Componentes React
src/hooks/             → React Query hooks chamando NestJS
src/lib/utils.ts, lists/, validations/, gmail-variables.ts  → Utilitários de UI
src/app/api/auth/      → NextAuth (permanece — autentica com NestJS via JWT)
src/app/api/google/    → Thin proxies OAuth (auth, callback)
src/app/api/docs/      → Proxy Swagger (manter enquanto útil)
```

#### Critério de conclusão total
- Zero imports de `prisma` no Next.js (fora de `lib/prisma.ts` e `lib/auth.ts`)
- Zero `"use server"` fora de `src/app/api/auth/`
- Zero chamadas a serviços externos (GoTo, Evolution, Gmail, Drive, S3) no Next.js
- Todos os dados chegam via `apiFetch()` ou `backendFetch()` → NestJS

---

### ✅ M14.2 — SSE Notifications via JWT Query Param
**Status**: Concluído em 2026-04-22

**Problema**: `EventSource` no browser não suporta headers customizados — impossível enviar `Authorization: Bearer`. O proxy `notifications/stream` atual resolve isso lendo a sessão NextAuth no servidor.

**Solução**: Adicionar suporte a `?token=` no guard NestJS para SSE. O `NotificationBell` passa o `accessToken` como query param ao abrir a conexão SSE diretamente com o NestJS.

**Impacto de segurança**: token no URL aparece nos logs do Nginx — mitigado filtrando `notifications/stream` dos logs, ou aceitando o risco (token expira em 7d, SSE usa HTTPS).

**Implementação**:
- [x] Criar `SseJwtAuthGuard` em `backend/src/infra/auth/guards/` — aceita `Authorization: Bearer` **ou** `?token=`
- [x] Trocar guard no endpoint `@Sse("stream")` para `SseJwtAuthGuard`
- [x] Atualizar `NotificationBell.tsx`: `new EventSource(`${NEXT_PUBLIC_BACKEND_URL}/notifications/stream?token=${token}`)`
- [x] Deletar `src/app/api/notifications/stream/route.ts`
- [ ] Deploy + validar SSE no browser

---

### ✅ M14.3 — Drive/S3 Streaming no NestJS
**Status**: Concluído em 2026-04-22

Movidos 3 endpoints de streaming binário para o NestJS com `SseJwtAuthGuard` (`?token=`):
- `GET /whatsapp/media/:messageId` — `WhatsAppMediaController` + `GoogleDriveDownloadService`
- `GET /proposals/:id/file` — `ProposalsFileController` + `GoogleDriveDownloadService`
- `GET /goto/recordings/:activityId` — `GoToRecordingsController` + `S3StoragePort`

Frontend: `GoToCallPlayer`, `WhatsAppMessageLog`, `ProposalViewer`, `ProposalsList` usam `${BACKEND_URL}/...?token=` diretamente.

---

### ✅ M14.4 — OAuth Google no NestJS
**Status**: Concluído em 2026-04-22

`GoogleOAuthController` em `EmailModule`:
- `GET /google/auth?token=` — SseJwtAuthGuard + admin check → redirect Google consent
- `GET /google/callback` — exchange code, save token, redirect frontend
- `POST /google/disconnect` — JwtAuthGuard + admin check, delete token

Next.js: `/api/google/auth` e `/api/google/callback` viram thin proxies. `/api/google/disconnect` deletado.

---

### ✅ M14.5 — Remover token-store e register proxy
**Status**: Concluído em 2026-04-22

- `src/lib/google/token-store.ts` deletado — admin google page chama `GET /email/token` diretamente
- `src/app/api/register/route.ts` deletado — register page chama `${BACKEND_URL}/auth/register` diretamente
- `src/lib/google/auth.ts` e `src/lib/google/` dir completamente removidos

---

### ⏳ M2.5 — Lead Frontend Completo
**Status**: Pendente (backend concluído)

- [ ] Enriquecer `POST /leads` no NestJS com contatos inline + tech profile + CNAE + labels em transação
- [ ] Adicionar `useLeads` e `useLead` queries em `src/hooks/leads/use-leads.ts`
- [ ] Seletor de partner (`referredByPartnerId`) no `LeadForm`

---

### ⏳ Tech Debt — VOs para M1–M9
**Status**: Pendente (não bloqueia nenhuma feature)

| Domínio | O que falta |
|---------|------------|
| Leads | `LeadBusinessName` VO no `CreateLeadUseCase` / `UpdateLeadUseCase` |
| Contacts | VOs para `Email`, `PhoneNumber` |
| Deals, Activities, Partners | Remover validações inline, extrair para VOs |

---

## Checklist por Fase

### M1–M9 (padrão legado — mantido como está)
- [ ] Entidade → Repository abstract → Use cases → PrismaRepository → Mapper → Controller → Module
- [ ] Testes unitários dos use cases
- [ ] Testes e2e com todos os campos
- [ ] Hooks React Query + remoção de server actions
- [ ] Deploy + validação nos logs

### M10 em diante (padrão DDD obrigatório)

#### 1. Value Objects (TDD primeiro)
- [ ] Identificar campos com regras de formato/negócio no subdomínio
- [ ] Escrever testes do VO antes de implementar (`label-name.spec.ts`)
- [ ] Implementar VO retornando `Either<Error, VO>` — nunca lança exceção
- [ ] Verde no teste antes de avançar

#### 2. Entidade
- [ ] Escrever testes de comportamento (métodos `update()`, `toggle()`, etc.)
- [ ] Implementar entidade usando VOs internamente
- [ ] Entidade estende `AggregateRoot` — adicionar domain events quando relevante

#### 3. Repository Abstract
- [ ] Definir interface com métodos mínimos necessários
- [ ] Criar `InMemoryRepository` em `test/unit/` implementando a interface

#### 4. Use Cases (TDD com in-memory)
- [ ] Para cada use case: escrever todos os testes antes de implementar
  - Testar caminho feliz
  - Testar cada VO inválido (retorna `left`)
  - Testar cada invariante de domínio (duplicata, not found, permissão)
- [ ] Implementar use case (controller não valida nada — tudo aqui ou no VO)
- [ ] Todos os testes unitários verdes

#### 5. Prisma Repository + Mapper
- [ ] Implementar `PrismaRepository` seguindo a interface
- [ ] Mapper com atenção a: campos JSON (`JSON.stringify`), DateTime (`new Date()`), campos opcionais

#### 6. Controller (somente HTTP)
- [ ] Extrair dados do request
- [ ] Converter tipos primitivos (`string → Date`, parse numéricos)
- [ ] Chamar use case, mapear resultado
- [ ] **Zero lógica de negócio** — se sentiu vontade de escrever um `if` de regra, mova para VO ou use case
- [ ] Adicionar decorators Swagger

#### 7. Module + Registro
- [ ] Registrar use cases, repository e controller no module
- [ ] Importar no `AppModule`

#### 8. Testes E2E
- [ ] Testar `401` sem token
- [ ] Testar happy path com **todos os campos** (incluindo opcionais)
- [ ] Testar validações → `422`
- [ ] Testar not found → `404`
- [ ] Testar regras de permissão (admin vs não-admin quando aplicável)

#### 9. Frontend + Deploy
- [ ] Criar hooks React Query em `src/hooks/{entity}/`
- [ ] Migrar componentes para usar hooks (remover server action)
- [ ] `git push`
- [ ] `ansible-playbook deploy-backend.yml` (se houver migration)
- [ ] `ansible-playbook quick-deploy.yml`
- [ ] Validar nos logs do Nginx que as rotas passam pelo NestJS
- [ ] Testar manualmente no browser

---

## Referências

- Backend: `/backend/src/`
- Hooks frontend: `/src/hooks/`
- Actions legadas: `/src/actions/`
- Deploy backend: `deploy/ansible/playbooks/deploy-backend.yml`
- Deploy frontend: `deploy/ansible/playbooks/quick-deploy.yml`
- Logs produção: `ssh root@45.90.123.190 "tail -f /var/log/nginx/access.log | grep contacts"`
