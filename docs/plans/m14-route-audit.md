# M14 — Auditoria de Rotas: Server Actions → NestJS

**Objetivo**: Antes de remover o backend Next.js, mapear cada server action / API route existente para a rota NestJS equivalente, identificar gaps e inconsistências de retorno.

**Legenda**:
- ✅ Coberta — rota existe e retorno é compatível
- ⚠️  Coberta parcialmente — rota existe mas retorno difere ou funcionalidade é parcial
- ❌ Ausente — nenhuma rota no backend cobre esta ação
- 🚫 Não migrar — permanece no Next.js (OAuth, NextAuth, external systems)

---

## LEADS

| Server Action | Método | Rota NestJS | Status | Observação |
|---|---|---|---|---|
| `getLeads` | GET | `GET /leads` | ✅ | Retorna `{ leads, total, page, pageSize }` com `?page=&pageSize=` |
| `getLeadById` | GET | `GET /leads/:id` | ✅ | |
| `getProspects` | GET | `GET /leads?status=prospect` | ⚠️ | Precisa verificar se filtro existe no backend |
| `createLead` | POST | `POST /leads` | ⚠️ | Action pode retornar `{ status: "created" \| "duplicate_found", lead, duplicates }` — backend retorna Lead diretamente sem detecção de duplicata no create |
| `createLeadWithContacts` | POST | `POST /leads` | ✅ | Body aceita campo `contacts[]` opcional |
| `updateLead` | PATCH | `PATCH /leads/:id` | ✅ | |
| `bulkArchiveLeads` | PATCH | `PATCH /leads/bulk-archive` | ✅ | |
| `getLeadContacts` | GET | `GET /leads/:id/contacts` | ✅ | |
| `createLeadContact` | POST | `POST /leads/:id/contacts` | ✅ | |
| `updateLeadContact` | PATCH | `PATCH /leads/:id/contacts/:contactId` | ✅ | |
| `deleteLeadContact` | DELETE | `DELETE /leads/:id/contacts/:contactId` | ✅ | |
| `toggleLeadContactActive` | PATCH | `PATCH /leads/:id/contacts/:contactId/toggle` | ✅ | |
| `qualifyProspect` | PATCH | `PATCH /leads/:id/qualify` | ✅ | |
| `checkLeadDuplicates` | POST | `POST /leads/check-duplicates` | ✅ | |
| `convertLeadToOrganization` | POST | `POST /leads/:id/convert` | ✅ | |
| `updateLeadActivityOrder` | PATCH | `PATCH /leads/:id/activity-order` | ✅ | body: `{ activityIds: string[] }` |
| `resetLeadActivityOrder` | PATCH/DELETE | `DELETE /leads/:id/activity-order` | ✅ | |
| Labels: add/remove | POST/DELETE | `POST/DELETE /leads/:id/labels/:labelId` | ✅ | |
| Labels: set bulk | PUT | `PUT /leads/:leadId/labels` | ✅ | |
| CNAEs: add/remove | POST/DELETE | `POST/DELETE /cnaes/leads/:leadId/:cnaeId` | ✅ | |
| ICPs: add/remove/update | POST/DELETE/PATCH | `POST/DELETE/PATCH /icps/leads/:leadId/:icpId` | ✅ | |
| Tech profile: get/add/remove | GET/POST/DELETE | `/leads/:leadId/tech-profile/*` | ✅ | |
| Products: add/remove | POST/DELETE | `/leads/:leadId/products/:productId` | ✅ | |
| Sectors: add/remove | POST/DELETE | `/sectors/leads/:leadId/:sectorId` | ✅ | |
| `POST /lead-import` | POST | `POST /lead-import` | ✅ | |

**✅ Todos os gaps de Leads foram resolvidos.**

---

## DEALS

| Server Action | Método | Rota NestJS | Status | Observação |
|---|---|---|---|---|
| `getDeals` | GET | `GET /deals` | ✅ | |
| `getDealById` | GET | `GET /deals/:id` | ✅ | |
| `createDeal` (via API route) | POST | `POST /deals` | ✅ | |
| `updateDeal` (via API route) | PATCH | `PATCH /deals/:id` | ✅ | |
| `deleteDeal` | DELETE | `DELETE /deals/:id` | ✅ | |
| `moveStage` | PATCH | `PATCH /deals/:id/stage` | ✅ | |
| `updateStageHistoryDate` | PATCH | `PATCH /deals/stage-history/:historyId` | ✅ | |
| Products: list/add/update/remove | GET/POST/PATCH/DELETE | `/deals/:dealId/products/*` | ✅ | |
| Tech stack | GET/POST/DELETE | `GET/POST/DELETE /deals/:id/tech-stack/*` | ✅ | categories, languages (+ primary), frameworks |

---

## CONTACTS

| Server Action | Método | Rota NestJS | Status | Observação |
|---|---|---|---|---|
| `getContacts` | GET | `GET /contacts` | ✅ | |
| `getContactById` (via API) | GET | `GET /contacts/:id` | ✅ | |
| `createContact` (via API) | POST | `POST /contacts` | ✅ | |
| `updateContact` (via API) | PATCH | `PATCH /contacts/:id` | ✅ | |
| `deleteContact` | DELETE | `DELETE /contacts/:id` | ✅ | |
| `toggleContactStatus` | PATCH | `PATCH /contacts/:id/status` | ✅ | |

---

## ORGANIZATIONS

| Server Action | Método | Rota NestJS | Status | Observação |
|---|---|---|---|---|
| `getOrganizations` | GET | `GET /organizations` | ✅ | |
| `getOrganizationById` | GET | `GET /organizations/:id` | ✅ | |
| `createOrganization` (via API) | POST | `POST /organizations` | ✅ | |
| `updateOrganization` (via API) | PATCH | `PATCH /organizations/:id` | ✅ | |
| `deleteOrganization` | DELETE | `DELETE /organizations/:id` | ✅ | |
| Labels: add/remove/set | POST/DELETE/PUT | `/organizations/:id/labels/*` | ✅ | |
| CNAEs: add/remove | POST/DELETE | `/cnaes/organizations/:id/:cnaeId` | ✅ | |
| ICPs: add/remove/update | POST/DELETE/PATCH | `/icps/organizations/:id/:icpId` | ✅ | |
| Tech profile | GET/POST/DELETE | `/organizations/:id/tech-profile/*` | ✅ | |
| Products | GET/POST/PATCH/DELETE | `/organizations/:id/products/*` | ✅ | |
| Sectors | POST/DELETE | `/sectors/organizations/:id/:sectorId` | ✅ | |
| External projects link/unlink | — | ❌ | 🚫 | Sistema externo — permanecer no Next.js |
| Hosting renewals query | GET | `GET /hosting-renewals` | ✅ | |

---

## ACTIVITIES

| Server Action | Método | Rota NestJS | Status | Observação |
|---|---|---|---|---|
| `getActivities` | GET | `GET /activities` | ✅ | |
| `getActivityById` | GET | `GET /activities/:id` | ✅ | |
| `createActivity` | POST | `POST /activities` | ✅ | |
| `updateActivity` | PATCH | `PATCH /activities/:id` | ✅ | |
| `deleteActivity` | DELETE | `DELETE /activities/:id` | ✅ | |
| `toggleActivityCompleted` | PATCH | `PATCH /activities/:id/toggle-completed` | ✅ | |
| `markActivityFailed` | PATCH | `PATCH /activities/:id/fail` | ✅ | |
| `markActivitySkipped` | PATCH | `PATCH /activities/:id/skip` | ✅ | |
| `revertActivityOutcome` | PATCH | `PATCH /activities/:id/revert` | ✅ | |
| `linkActivityToDeal` | POST | `POST /activities/:id/deals/:dealId` | ✅ | |
| `unlinkActivityFromDeal` | DELETE | `DELETE /activities/:id/deals/:dealId` | ✅ | |
| `updateActivityDueDate` | PATCH | `PATCH /activities/:id` | ✅ | Campo `dueDate` no body do update geral |
| `assignLeadContactsToActivity` | PATCH | `PATCH /activities/:id/lead-contacts` | ✅ | body: `{ leadContactIds: string[] }` |
| `removeLeadContactsFromActivity` | PATCH | `PATCH /activities/:id/lead-contacts` | ✅ | passa `leadContactIds: []` para remover |

---

## PIPELINES & STAGES

| Server Action | Método | Rota NestJS | Status | Observação |
|---|---|---|---|---|
| `getPipelines` | GET | `GET /pipelines` | ✅ | |
| `getPipelineById` | GET | `GET /pipelines/:id` | ✅ | |
| `createPipeline` | POST | `POST /pipelines` | ✅ | |
| `updatePipeline` | PATCH | `PATCH /pipelines/:id` | ✅ | |
| `deletePipeline` | DELETE | `DELETE /pipelines/:id` | ✅ | |
| `setDefaultPipeline` | PATCH | `PATCH /pipelines/:id/set-default` | ✅ | |
| `getStages` | GET | ⚠️ | ⚠️ | Sem rota `GET /pipelines/stages` (get all stages), apenas por pipeline |
| `getStagesByPipeline` | GET | `GET /pipelines/:id` (retorna com stages) | ⚠️ | Backend retorna pipeline com stages embutidos, não rota separada de stages |
| `createStage` | POST | `POST /pipelines/stages` | ✅ | |
| `updateStage` | PATCH | `PATCH /pipelines/stages/:id` | ✅ | |
| `deleteStage` | DELETE | `DELETE /pipelines/stages/:id` | ✅ | |
| `reorderStages` | PATCH | `PATCH /pipelines/:id/stages/reorder` | ✅ | |

---

## PARTNERS

| Server Action | Método | Rota NestJS | Status | Observação |
|---|---|---|---|---|
| `getPartners` | GET | `GET /partners` | ✅ | |
| `getPartnerById` | GET | `GET /partners/:id` | ✅ | |
| `createPartner` | POST | `POST /partners` | ✅ | |
| `updatePartner` | PATCH | `PATCH /partners/:id` | ✅ | |
| `deletePartner` | DELETE | `DELETE /partners/:id` | ✅ | |
| `touchLastContact` | PATCH | `PATCH /partners/:id/last-contact` | ✅ | |
| Products | GET/POST/PATCH/DELETE | `/partners/:id/products/*` | ✅ | |

---

## LABELS

| Server Action | Método | Rota NestJS | Status | Observação |
|---|---|---|---|---|
| `getLabels` | GET | `GET /labels` | ✅ | |
| `createLabel` | POST | `POST /labels` | ✅ | Retorna objeto Label completo |
| `updateLabel` | PATCH | `PATCH /labels/:id` | ✅ | Retorna objeto Label completo |
| `deleteLabel` | DELETE | `DELETE /labels/:id` | ✅ | |

**⚠️ Ajuste necessário:** `POST /labels` e `PATCH /labels/:id` devem retornar o objeto `Label` completo (id, name, color, createdAt).

---

## ADMIN (Business Lines, Products, Tech Options)

| Server Action | Método | Rota NestJS | Status | Observação |
|---|---|---|---|---|
| `getBusinessLines` | GET | `GET /admin/business-lines` | ✅ | |
| `getActiveBusinessLines` | GET | `GET /admin/business-lines?active=true` | ✅ | |
| `getBusinessLineById` | GET | `GET /admin/business-lines/:id` | ✅ | |
| `createBusinessLine` | POST | `POST /admin/business-lines` | ✅ | |
| `updateBusinessLine` | PATCH | `PATCH /admin/business-lines/:id` | ✅ | |
| `deleteBusinessLine` | DELETE | `DELETE /admin/business-lines/:id` | ✅ | |
| `toggleBusinessLineActive` | PATCH | `PATCH /admin/business-lines/:id/toggle` | ✅ | |
| `checkBusinessLineSlugExists` | GET | ❌ | ❌ | Sem rota de verificação de slug |
| `generateUniqueBusinessLineSlug` | GET | ❌ | ❌ | Sem rota de geração de slug |
| `getUsedBusinessLineOrders` | GET | ❌ | ❌ | Sem rota |
| `getProducts` | GET | `GET /admin/products` | ✅ | |
| `getActiveProducts` | GET | `GET /admin/products?active=true` | ✅ | |
| `getProductById` | GET | `GET /admin/products/:id` | ✅ | |
| `createProduct` | POST | `POST /admin/products` | ✅ | |
| `updateProduct` | PATCH | `PATCH /admin/products/:id` | ✅ | |
| `deleteProduct` | DELETE | `DELETE /admin/products/:id` | ✅ | |
| `toggleProductActive` | PATCH | `PATCH /admin/products/:id/toggle` | ✅ | |
| `checkProductSlugExists` | GET | ❌ | ❌ | |
| `generateUniqueProductSlug` | GET | ❌ | ❌ | |
| `getUsedProductOrders` | GET | ❌ | ❌ | |
| Tech options (all 8 types) | GET/POST/PATCH/DELETE | `GET/POST/PATCH/DELETE /admin/tech-options/:type` | ✅ | |

**❌ Rotas a criar para Admin:**
1. `GET /admin/business-lines/:id`
2. `GET /admin/business-lines?active=true` (filtro)
3. `GET /admin/products/:id`
4. `GET /admin/products?active=true` (filtro)
5. Slug checks e order queries são helper internos — podem ser eliminados ou simplificados no frontend

---

## ICPs

| Server Action | Método | Rota NestJS | Status | Observação |
|---|---|---|---|---|
| `getICPs` | GET | `GET /icps` | ✅ | |
| `getActiveICPsForSelect` | GET | `GET /icps?status=active` | ⚠️ | Backend não tem filtro `?status=` |
| `getICPById` | GET | `GET /icps/:id` | ✅ | |
| `createICP` | POST | `POST /icps` | ✅ | Retorna objeto ICP completo |
| `updateICP` | PATCH | `PATCH /icps/:id` | ✅ | Retorna objeto ICP completo |
| `deleteICP` | DELETE | `DELETE /icps/:id` | ✅ | |
| `checkICPSlugExists` | GET | ❌ | ❌ | Helper interno — pode ser eliminado |
| `generateUniqueICPSlug` | GET | ❌ | ❌ | Helper interno — pode ser eliminado |
| `getICPVersions` | GET | `GET /icps/:id/versions` | ✅ | Implementado |
| `restoreICPVersion` | POST | `POST /icps/:id/versions/restore` | ✅ | Implementado |
| Lead/Org ICP links | GET/POST/PATCH/DELETE | `/icps/leads/*`, `/icps/organizations/*` | ✅ | |

**✅ Filtro `?status=` em `GET /icps` implementado.**

---

## CADENCES

| Server Action | Método | Rota NestJS | Status | Observação |
|---|---|---|---|---|
| `getCadences` | GET | `GET /cadences` | ✅ | |
| `getCadenceById` | GET | `GET /cadences/:id` | ✅ | |
| `createCadence` | POST | `POST /cadences` | ✅ | |
| `updateCadence` | PATCH | `PATCH /cadences/:id` | ✅ | |
| `deleteCadence` | DELETE | `DELETE /cadences/:id` | ✅ | |
| `publishCadence` | PATCH | `PATCH /cadences/:id/publish` | ✅ | |
| `unpublishCadence` | PATCH | `PATCH /cadences/:id/unpublish` | ✅ | |
| Steps CRUD | GET/POST/PATCH/DELETE | `/cadences/:id/steps/*` | ✅ | |
| `applyCadenceToLead` | POST | `POST /cadences/:id/apply` | ✅ | |
| `applyBulkCadencesToLeads` | POST | ❌ | ❌ | Sem rota de bulk apply |
| `getLeadCadences` | GET | `GET /cadences/lead/:leadId` | ✅ | |
| `getActiveLeadCadencesCount` | GET | `GET /cadences/:id/lead-count` | ✅ | Implementado |
| pause/resume/cancel lead cadence | PATCH | `/cadences/lead-cadences/:id/pause|resume|cancel` | ✅ | |
| `checkCadenceSlugExists` | GET | ❌ | ❌ | Helper interno |
| `generateUniqueCadenceSlug` | GET | ❌ | ❌ | Helper interno |
| `getCadencesForICP` | GET | `GET /cadences?icpId=` | ✅ | Filtro implementado |

**✅ Todos os gaps de Cadences foram resolvidos.**

---

## PROPOSALS

| Server Action | Método | Rota NestJS | Status | Observação |
|---|---|---|---|---|
| `getProposals` | GET | `GET /proposals` | ✅ | |
| `createProposal` | POST | `POST /proposals` | ✅ | |
| `updateProposalStatus` | PATCH | `PATCH /proposals/:id` | ✅ | Campo `status` no body do update geral |
| `deleteProposal` | DELETE | `DELETE /proposals/:id` | ✅ | |
| Google Drive upload | — | ❌ | ❌ | `GoogleDrivePort` não implementado — fica fora do escopo M14 |

---

## MEETINGS

| Server Action | Método | Rota NestJS | Status | Observação |
|---|---|---|---|---|
| `getMeetings` | GET | `GET /meetings` | ✅ | |
| `scheduleMeeting` | POST | `POST /meetings` | ✅ | |
| `updateMeeting` | PATCH | `PATCH /meetings/:id` | ✅ | |
| `cancelMeeting` | PATCH | `DELETE /meetings/:id` (seta status=cancelled) | ⚠️ | Action usa PATCH, backend usa DELETE para cancelar |
| `updateMeetingSummary` | PATCH | `PATCH /meetings/:id` | ✅ | Campo `meetingSummary` no body geral |
| `checkMeetingTitleExists` | GET | ❌ | ❌ | Helper interno — pode ser eliminado no frontend |

---

## NOTIFICATIONS

| Ação / API Route | Método | Rota NestJS | Status | Observação |
|---|---|---|---|---|
| `GET /api/notifications` | GET | `GET /notifications` | ✅ | |
| `POST /api/notifications` | POST | Interno (CreateNotificationUseCase) | ⚠️ | Nenhuma rota HTTP pública de create — notificações são criadas internamente pelos use cases |
| `GET /api/notifications/stream` (SSE) | SSE | `GET /notifications/stream` | ✅ | |
| `PATCH /notifications/read` | PATCH | `PATCH /notifications/read` | ✅ | |

---

## DASHBOARD / STATS

| Server Action | Método | Rota NestJS | Status | Observação |
|---|---|---|---|---|
| `getManagerStats` | GET | `GET /dashboard/stats` | ✅ | Retorna `{ period, byUser: UserMetrics[], totals: TotalMetrics, comparison }` com `?period=today\|week\|month\|custom` |
| Funnel stats | GET | `GET /funnel/stats` | ✅ | |
| Weekly goals | GET/POST | `GET/POST /funnel/goals` | ✅ | |

---

## USERS

| Server Action | Método | Rota NestJS | Status | Observação |
|---|---|---|---|---|
| `getUsers` | GET | `GET /users` | ✅ | |

---

## SHARED ENTITIES

| Server Action | Método | Rota NestJS | Status | Observação |
|---|---|---|---|---|
| `shareEntity` | POST | `POST /shared-entities` | ✅ | |
| `unshareEntity` | DELETE | `DELETE /shared-entities/:id` | ✅ | |
| `getEntitySharing` | GET | `GET /shared-entities` | ✅ | |
| `transferEntity` | PATCH | `PATCH /shared-entities/transfer` | ✅ | |
| `bulkTransferEntities` | PATCH | ❌ | ❌ | Sem rota de bulk transfer |

---

## COMMUNICATIONS

| Ação / API Route | Método | Rota NestJS | Status | Observação |
|---|---|---|---|---|
| `sendWhatsAppMessage` | POST | `POST /whatsapp/send` | ✅ | |
| `getWhatsAppMediaMessages` | GET | `GET /whatsapp/messages/:activityId` | ✅ | |
| `POST /api/evolution/webhook` | POST | `POST /webhooks/whatsapp` | ✅ | |
| Email send | POST | `POST /email/send` | ✅ | |
| Email list | GET | `GET /email/messages` | ✅ | |
| Track open/click | GET | `GET /track/open/:token`, `GET /track/click/:token` | ✅ | |
| Campaigns CRUD | — | `GET/POST/DELETE/PATCH /campaigns/*` | ✅ | |

---

## INTEGRATIONS (Google OAuth, GoTo, Lead Research)

| Ação / API Route | Status | Rota NestJS alvo | Observação |
|---|---|---|---|
| `GET/POST /api/google/auth` | ❌ Migrar | `GET /auth/google` | Inicia OAuth — NestJS redireciona para Google via `@nestjs/passport` + `passport-google-oauth20` |
| `GET /api/google/callback` | ❌ Migrar | `GET /auth/google/callback` | Recebe code, troca por tokens, salva no banco, redireciona para frontend |
| `POST /api/google/disconnect` | ❌ Migrar | `POST /auth/google/disconnect` | Remove tokens do banco |
| `GET /api/goto/callback` | ❌ Migrar | `GET /auth/goto/callback` | Recebe code do GoTo, troca por tokens, salva no banco, redireciona para frontend |
| `GET /api/goto/auth` (se existir) | ❌ Migrar | `GET /auth/goto` | Inicia OAuth GoTo via `passport-oauth2` |
| `POST /api/goto/webhook` | ✅ | `POST /webhooks/goto/calls` | Já migrado |
| `POST /api/webhooks/lead-research` | ✅ | `POST /webhooks/lead-research` | Já migrado |
| `GET /api/auth/[...nextauth]` | 🚫 Fica | — | Gerencia sessão JWT do usuário no CRM — coexiste com NestJS (são contextos distintos) |
| `POST /api/register` | ✅ | `POST /auth/register` | Já migrado |
| External projects | 🚫 Fica | — | Sistema externo separado — não há backend próprio para migrar |

**Por que Google OAuth e GoTo OAuth devem migrar:**

Os tokens OAuth (accessToken, refreshToken) dessas integrações são lidos diretamente pelo NestJS para operar Gmail, Google Drive, Google Meet e GoTo recordings. Se o M14 remove o backend Next.js e esses tokens ainda são obtidos por rotas Next.js, o fluxo de autenticação das integrações fica quebrado no primeiro re-login. Além disso, manter rotas em `/api/google/` impede a remoção completa do `src/app/api/` exigida pelo M14.

**Fluxo após migração (exemplo Google):**
```
Usuário clica "Conectar Google"
→ Frontend redireciona para  GET  https://api.wbdigitalsolutions.com/auth/google
→ NestJS (Passport) redireciona para accounts.google.com
→ Google redireciona para   GET  https://api.wbdigitalsolutions.com/auth/google/callback
→ NestJS salva tokens no User do banco
→ NestJS redireciona para   https://crm.wbdigitalsolutions.com/settings?connected=google
```

**Distinção importante — NextAuth vs OAuth de integrações:**
- **NextAuth** (`/api/auth/[...]`) — autentica o *usuário* no CRM com email/senha. Usa JWT de sessão. Fica no Next.js.
- **Google/GoTo OAuth** — autentica as *integrações* (acesso à caixa Gmail, ao Drive, ao GoTo). Tokens são de serviço, não de sessão do usuário. Devem ir para o NestJS.

---

## CNAE / SECTORS / TECH PROFILE

| Server Action | Status |
|---|---|
| CNAE search/add/remove | ✅ |
| Sectors CRUD + add/remove | ✅ |
| Tech profile options CRUD | ✅ |
| Lead/Org tech profile add/remove | ✅ |
| Deal tech stack | ❌ Faltando |

---

## RESUMO DE GAPS

### ❌ Rotas ausentes no backend (a implementar antes de M14)

| Prioridade | Domínio | Rota | Descrição |
|---|---|---|---|
| ✅ | Leads | `GET /leads/:id/contacts` | Listar LeadContacts |
| ✅ | Leads | `POST /leads/:id/contacts` | Criar LeadContact |
| ✅ | Leads | `PATCH /leads/:id/contacts/:contactId` | Atualizar LeadContact |
| ✅ | Leads | `DELETE /leads/:id/contacts/:contactId` | Deletar LeadContact |
| ✅ | Leads | `PATCH /leads/:id/contacts/:contactId/toggle` | Toggle active LeadContact |
| ✅ | Leads | `PATCH /leads/:id/qualify` | Qualificar prospect |
| ✅ | Leads | `PATCH /leads/bulk-archive` | Arquivar múltiplos leads |
| ✅ | Activities | `PATCH /activities/:id/lead-contacts` | Atribuir LeadContacts a atividade |
| ✅ | Deals | `PATCH /deals/stage-history/:historyId` | Atualizar data de stage history |
| ✅ | Leads | Paginação em `GET /leads` | Retornar `{ leads, total, page, pageSize }` |
| ✅ | Leads | `POST /leads` com `contacts[]` | Criar lead + contatos em um request |
| ✅ | Cadences | `POST /cadences/bulk-apply` | Aplicar cadência a múltiplos leads |
| ✅ | Cadences | `GET /cadences/:id/lead-count` | Contar active lead cadences |
| ✅ | Cadences | `GET /cadences?icpId=` | Filtrar cadências por ICP |
| ✅ | Admin | `GET /admin/business-lines/:id` | Buscar business line por ID |
| ✅ | Admin | `GET /admin/products/:id` | Buscar product por ID |
| ✅ | Admin | `?active=true` em BL e Products | Filtros de ativos |
| ✅ | ICPs | `GET /icps/:id/versions` | Listar versões do ICP |
| ✅ | ICPs | `POST /icps/:id/versions/restore` | Restaurar versão do ICP |
| ✅ | Deals | Deal tech stack routes | `GET/POST/DELETE /deals/:id/tech-stack/*` |
| ✅ | Leads | `PATCH /leads/:id/activity-order` | Definir ordem de atividades — body: `{ activityIds: string[] }` |
| ✅ | Leads | `DELETE /leads/:id/activity-order` | Resetar ordem de atividades |
| Baixa | Shared | `PATCH /shared-entities/bulk-transfer` | Transferência em massa — ação não existe no Next.js, gap irrelevante para M14 |

### ⚠️ Inconsistências de retorno (a corrigir)

| Rota | Problema | Correção |
|---|---|---|
| ✅ `POST /labels` e `PATCH /labels/:id` | Retorna `{ id }` — action espera `Label` completo | Retornar `{ id, name, color, createdAt }` |
| ✅ `POST /icps` e `PATCH /icps/:id` | Retorna `{ id }` — action espera `ICP` completo | Retornar objeto ICP completo |
| ✅ `GET /leads` | Sem paginação | Retorna `{ leads, total, page, pageSize }` |
| ✅ `GET /dashboard/stats` | Shape diferente do `getManagerStats` | Retorna `{ period, byUser, totals, comparison }` com `?period=today\|week\|month\|custom&startDate=&endDate=` |
| ✅ `DELETE /meetings/:id` | Action usa PATCH para cancelar; backend usa DELETE | `PATCH /meetings/:id/cancel` adicionado como alias |

### ✅ OAuth de integrações — migrado para NestJS

| Status | Domínio | Rota NestJS | Descrição |
|---|---|---|---|
| ✅ | Google OAuth | `GET /auth/google` | Inicia OAuth Google — redireciona para consentimento |
| ✅ | Google OAuth | `GET /auth/google/callback` | Callback — salva tokens via `StoreGoogleTokensUseCase` |
| ✅ | Google OAuth | `POST /auth/google/disconnect` | Remove tokens via `DisconnectGoogleUseCase` |
| ✅ | GoTo OAuth | `GET /auth/goto` | Inicia OAuth GoTo — redireciona para consentimento |
| ✅ | GoTo OAuth | `GET /auth/goto/callback` | Callback — persiste tokens via `StoreGoToTokensUseCase` |

### 🚫 Permanece no Next.js (não migrar)

- **NextAuth** (`/api/auth/[...nextauth]`) — sessão JWT do usuário no CRM
- **External projects** — sistema externo separado, sem backend próprio a migrar
- `POST /api/notifications` (criação interna — não é rota pública)
