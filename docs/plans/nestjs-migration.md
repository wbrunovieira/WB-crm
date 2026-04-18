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

### 🔲 M2 — Leads
**Status**: Pendente

Entidade mais complexa do sistema. Migrar antes de Organizations para garantir compatibilidade na conversão Lead → Organization.

**Campos críticos:**
- Tech profile: 7 junction tables (`LeadLanguage`, `LeadFramework`, `LeadHosting`, `LeadDatabase`, `LeadERP`, `LeadCRM`, `LeadEcommerce`)
- CNAE: `primaryCNAEId` + `LeadSecondaryCNAE[]`
- JSON fields: `languages`, `categories`, `types`, `openingHours`, `activityOrder` — todos precisam de `JSON.stringify` no mapper
- `referredByPartnerId` → já no schema, implementar no NestJS + UI (seletor de partner opcional)
- `LeadContact[]` — sub-entidade, criar use cases próprios ou inline no Lead use case
- Conversão Lead → Organization: `ConvertLeadUseCase` com transação atômica

**Atenção:** Não atualizar `src/actions/leads.ts` — será substituído inteiramente pelo NestJS + hooks.

**Ao fim:** GitHub push + deploy backend + deploy frontend + validar logs Nginx.

---

### 🔲 M3 — Organizations
**Status**: Pendente

Migrar após Leads para garantir que a conversão e os campos compatíveis estejam alinhados.

**Campos críticos:**
- `externalProjectIds` — JSON array, precisa de `JSON.stringify` no mapper
- `referredByPartnerId` — já no schema (migration `20260418`), implementar no NestJS + UI (seletor de partner opcional); transferir na conversão Lead → Organization
- `referredByPartnerId`: decisão tomada em 2026-04-18 — campo existia só no Lead (sem UI/actions), adicionado na Organization para preservar histórico de indicação na conversão. Implementação na UI adiada para M2/M3.
- Hosting fields (`hasHosting`, `hostingRenewalDate`, etc.)
- Tech profile: 7 junction tables idênticas ao Lead

**Ao fim:** GitHub push + deploy backend + deploy frontend + validar logs Nginx.

---

### 🔲 M4 — Partners
**Status**: Pendente

- Entidade `Partner` com tipo enum (`agencia_digital`, `consultoria`, etc.)
- Contatos vinculados via `Contact.partnerId`
- `referredLeads Lead[]` e `referredOrganizations Organization[]` — relações inversas já no schema
- **Atenção**: `OrganizationContactsList` e outros componentes que fazem toggle de status de contatos já usam hooks — não precisarão de mudança

**Ao fim:** GitHub push + deploy backend + deploy frontend + validar logs Nginx.

---

### 🔲 M5 — Deals (ex-M5)
**Status**: Pendente

- `DealProduct` junction, `DealTechStack`, `DealLanguage`, `DealFramework`
- Kanban pipeline view (leitura por stage)
- Campo `value` com multi-currency

---

### 🔲 M6 — Activities
**Status**: Pendente

- Entidade com muitos tipos (`call`, `meeting`, `email`, `whatsapp`, `visit`, `instagram_dm`)
- `contactIds` como JSON array
- WhatsApp messages linkadas
- Cadence activities (relação com `LeadCadence`)
- **Atenção**: após migrar, remover `getContacts` de `src/actions/contacts.ts` (única dependência SSR restante)

---

### 🔲 M7 — Pipeline & Stages
**Status**: Pendente

- Entidades sem `ownerId` (admin-managed)
- Drag & drop de stages (reorder)

---

### 🔲 M8 — Admin (BusinessLines, Products, Tech)
**Status**: Pendente

- Entidades sem `ownerId`
- CRUD simples

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
