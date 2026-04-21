# M14 — Migração do Frontend: Server Actions → NestJS

**Objetivo**: Substituir todas as chamadas Next.js Server Actions por chamadas HTTP ao NestJS backend, depois deletar o backend Next.js (`src/actions/`, `src/app/api/`).

**Produção**: cada fase é deployed antes de avançar para a próxima.

---

## Infraestrutura já disponível

```
src/lib/backend/client.ts  → backendFetch()  — Server Components (usa BACKEND_URL=http://localhost:3010)
src/lib/api-client.ts      → apiFetch()      — Client Components (usa NEXT_PUBLIC_BACKEND_URL=https://api.crm.wbdigitalsolutions.com)
```

Ambas as funções já injetam o JWT do NextAuth no header `Authorization: Bearer`.

---

## Processo por domínio (4 etapas obrigatórias)

```
1. VER      — o que a página precisa (campos, filtros, shape)
2. CURL     — testar rota NestJS em produção e comparar shape
3. IMPL     — se faltar algo: TDD no NestJS (VO → Entity → UseCase → E2E)
4. MIGRAR   — substituir server action por backendFetch()/apiFetch() → deploy → deletar action
```

---

## ~~FASE 1 — Labels~~ ✅

**Páginas que consomem**: `/leads`, `/leads/[id]`, `/organizations`, `/organizations/[id]`

| Action atual | Rota NestJS | Método |
|---|---|---|
| `getLabels()` | `GET /labels` | backendFetch |
| `createLabel()` | `POST /labels` | backendFetch |
| `updateLabel()` | `PATCH /labels/:id` | backendFetch |
| `deleteLabel()` | `DELETE /labels/:id` | backendFetch |

**Verificação**: `curl -H "Authorization: Bearer $TOKEN" https://api.crm.wbdigitalsolutions.com/labels`

**Delete após migrar**: `src/actions/labels.ts`, `src/actions/lead-labels.ts`, `src/actions/organization-labels.ts`

---

## ~~FASE 2 — Users~~ ✅

**Páginas**: `/leads`, `/organizations`, `/deals`, `/contacts`, `/partners`, `/activities`

| Action atual | Rota NestJS | Método |
|---|---|---|
| `getUsers()` | `GET /users` | backendFetch |

**Delete após migrar**: `src/actions/users.ts`

---

## ~~FASE 3 — Pipelines & Stages~~ ✅

**Páginas**: `/pipeline`, `/pipelines`, `/deals`

| Action atual | Rota NestJS | Método |
|---|---|---|
| `getPipelines()` | `GET /pipelines` | backendFetch |
| `getPipelineById()` | `GET /pipelines/:id` | backendFetch |
| `createPipeline()` | `POST /pipelines` | backendFetch |
| `updatePipeline()` | `PATCH /pipelines/:id` | backendFetch |
| `deletePipeline()` | `DELETE /pipelines/:id` | backendFetch |
| `setDefaultPipeline()` | `PATCH /pipelines/:id/set-default` | backendFetch |
| `getStages()` | via `GET /pipelines/:id` (stages embutidas) | backendFetch |
| `createStage()` | `POST /pipelines/stages` | backendFetch |
| `updateStage()` | `PATCH /pipelines/stages/:id` | backendFetch |
| `deleteStage()` | `DELETE /pipelines/stages/:id` | backendFetch |
| `reorderStages()` | `PATCH /pipelines/:id/stages/reorder` | backendFetch |
| `getPipelineView()` | `GET /pipelines` + deals por stage | backendFetch composto |

**Delete após migrar**: `src/actions/pipelines.ts`, `src/actions/stages.ts`, `src/actions/pipeline-view.ts`

---

## ~~FASE 4 — Admin: Business Lines & Products~~ ✅

**Páginas**: `/admin/products`, `/admin/business-lines`

| Action atual | Rota NestJS |
|---|---|
| `getBusinessLines()` | `GET /admin/business-lines` |
| `getBusinessLineById()` | `GET /admin/business-lines/:id` |
| `createBusinessLine()` | `POST /admin/business-lines` |
| `updateBusinessLine()` | `PATCH /admin/business-lines/:id` |
| `deleteBusinessLine()` | `DELETE /admin/business-lines/:id` |
| `toggleBusinessLineActive()` | `PATCH /admin/business-lines/:id/toggle` |
| `getProducts()` | `GET /admin/products` |
| `getActiveProducts()` | `GET /admin/products?active=true` |
| `getProductById()` | `GET /admin/products/:id` |
| `createProduct()` | `POST /admin/products` |
| `updateProduct()` | `PATCH /admin/products/:id` |
| `deleteProduct()` | `DELETE /admin/products/:id` |
| `toggleProductActive()` | `PATCH /admin/products/:id/toggle` |

**Nota**: slug checks (`checkBusinessLineSlugExists`, `generateUniqueBusinessLineSlug`) são helpers internos — eliminar, gerar slug no cliente com `slugify()`.

**Delete após migrar**: `src/actions/business-lines.ts`, `src/actions/products.ts`

---

## ~~FASE 5 — Admin: Tech Options (8 tipos)~~ ✅

**Páginas**: `/admin/tech-profile`, `/admin/tech-stack`

| Action atual | Rota NestJS |
|---|---|
| `getTechCategories()` | `GET /admin/tech-options/tech_categories` |
| `getTechLanguages()` | `GET /admin/tech-options/tech_languages` |
| `getTechFrameworks()` | `GET /admin/tech-options/tech_frameworks` |
| `getTechProfileOptions()` | `GET /admin/tech-options/:type` (para hosting, erp, crm, etc.) |

**Delete após migrar**: `src/actions/tech-categories.ts`, `src/actions/tech-languages.ts`, `src/actions/tech-frameworks.ts`, `src/actions/tech-profile-options.ts`

---

## ~~FASE 6 — Admin: Sectors~~ ✅

**Páginas**: `/admin/sectors`

| Action atual | Rota NestJS |
|---|---|
| `getSectors()` | `GET /sectors` |
| `createSector()` | `POST /sectors` |
| `updateSector()` | `PATCH /sectors/:id` |
| `deleteSector()` | `DELETE /sectors/:id` |

**Delete após migrar**: `src/actions/sectors.ts`

---

## ~~FASE 7 — ICPs~~ ✅

**Páginas**: `/admin/icps`, `/admin/icps/[id]`

| Action atual | Rota NestJS |
|---|---|
| `getICPs()` | `GET /icps` |
| `getICPById()` | `GET /icps/:id` |
| `getActiveICPsForSelect()` | `GET /icps?status=active` |
| `createICP()` | `POST /icps` |
| `updateICP()` | `PATCH /icps/:id` |
| `deleteICP()` | `DELETE /icps/:id` |
| `getICPVersions()` | `GET /icps/:id/versions` |
| `restoreICPVersion()` | `POST /icps/:id/versions/restore` |

**Nota**: slug helpers → eliminar, gerar no cliente.

**Delete após migrar**: `src/actions/icps.ts`, `src/actions/icp-links.ts`

---

## ~~FASE 8 — Cadences~~ ✅ (parcial)

**Páginas**: `/admin/cadences`, `/admin/cadences/[id]`

| Action atual | Rota NestJS |
|---|---|
| `getCadences()` | `GET /cadences` |
| `getCadenceById()` | `GET /cadences/:id` |
| `createCadence()` | `POST /cadences` |
| `updateCadence()` | `PATCH /cadences/:id` |
| `deleteCadence()` | `DELETE /cadences/:id` |
| `publishCadence()` | `PATCH /cadences/:id/publish` |
| `unpublishCadence()` | `PATCH /cadences/:id/unpublish` |
| `applyCadenceToLead()` | `POST /cadences/:id/apply` |
| `getLeadCadences()` | `GET /cadences/lead/:leadId` |
| Steps CRUD | `GET/POST/PATCH/DELETE /cadences/:id/steps/*` |

**Delete após migrar**: `src/actions/cadences.ts`, `src/actions/cadence-steps.ts`, `src/actions/lead-cadences.ts`

---

## ~~FASE 9 — Contacts~~ ✅

**Páginas**: `/contacts`, `/contacts/[id]`

| Action atual | Rota NestJS |
|---|---|
| `getContacts()` | `GET /contacts` |
| `getContactById()` | `GET /contacts/:id` |
| `createContact()` | `POST /contacts` |
| `updateContact()` | `PATCH /contacts/:id` |
| `deleteContact()` | `DELETE /contacts/:id` |
| `toggleContactStatus()` | `PATCH /contacts/:id/status` |

**Nota**: `contacts.ts` já usa `backendFetch()` parcialmente — verificar e unificar.

**Delete após migrar**: `src/actions/contacts.ts`, `src/app/api/contacts/`

---

## ~~FASE 10 — Partners~~ ✅

**Páginas**: `/partners`, `/partners/[id]`

| Action atual | Rota NestJS |
|---|---|
| `getPartners()` | `GET /partners` |
| `getPartnerById()` | `GET /partners/:id` |
| `createPartner()` | `POST /partners` |
| `updatePartner()` | `PATCH /partners/:id` |
| `deletePartner()` | `DELETE /partners/:id` |
| `touchLastContact()` | `PATCH /partners/:id/last-contact` |
| Products CRUD | `/partners/:id/products/*` |

**Delete após migrar**: `src/actions/partners.ts`

---

## ~~FASE 11 — Activities~~ ✅

**Páginas**: `/activities`, `/activities/[id]`, `/activities/calendar`

| Action atual | Rota NestJS |
|---|---|
| `getActivities()` | `GET /activities` |
| `getActivityById()` | `GET /activities/:id` |
| `createActivity()` | `POST /activities` |
| `updateActivity()` | `PATCH /activities/:id` |
| `deleteActivity()` | `DELETE /activities/:id` |
| `toggleActivityCompleted()` | `PATCH /activities/:id/toggle-completed` |
| `markActivityFailed()` | `PATCH /activities/:id/fail` |
| `markActivitySkipped()` | `PATCH /activities/:id/skip` |
| `revertActivityOutcome()` | `PATCH /activities/:id/revert` |
| `linkActivityToDeal()` | `POST /activities/:id/deals/:dealId` |
| `unlinkActivityFromDeal()` | `DELETE /activities/:id/deals/:dealId` |

**Delete após migrar**: `src/actions/activities.ts`, `src/app/api/activities/`

---

## ~~FASE 12 — Organizations~~ ✅ (parcial)

**Páginas**: `/organizations`, `/organizations/[id]`

| Action atual | Rota NestJS |
|---|---|
| `getOrganizations()` | `GET /organizations` |
| `getOrganizationById()` | `GET /organizations/:id` |
| `createOrganization()` | `POST /organizations` |
| `updateOrganization()` | `PATCH /organizations/:id` |
| `deleteOrganization()` | `DELETE /organizations/:id` |
| Labels | `/organizations/:id/labels/*` |
| CNAEs | `/cnaes/organizations/:id/:cnaeId` |
| ICPs | `/icps/organizations/:id/:icpId` |
| Tech profile | `/organizations/:id/tech-profile/*` |
| Products | `/organizations/:id/products/*` |
| Sectors | `/sectors/organizations/:id/:sectorId` |
| `getHostingRenewals()` | `GET /hosting-renewals` |

**Não migrar**: `external-projects.ts` — sistema externo separado.

**Delete após migrar**: `src/actions/organizations.ts`, `src/actions/organization-labels.ts`, `src/actions/organization-tech-profile.ts`, `src/app/api/organizations/`

---

## ~~FASE 13 — Leads~~ ✅ (reads migrados; mutations em componentes pendentes)

**Páginas**: `/leads`, `/leads/[id]`, `/leads/prospects`, `/leads/import`

| Action atual | Rota NestJS |
|---|---|
| `getLeads()` | `GET /leads?page=&pageSize=&status=&...` |
| `getLeadById()` | `GET /leads/:id` |
| `getProspects()` | `GET /leads?status=prospect` |
| `createLead()` | `POST /leads` |
| `updateLead()` | `PATCH /leads/:id` |
| `deleteLead()` | `DELETE /leads/:id` |
| `qualifyProspect()` | `PATCH /leads/:id/qualify` |
| `bulkArchiveLeads()` | `PATCH /leads/bulk-archive` |
| `checkLeadDuplicates()` | `POST /leads/check-duplicates` |
| `convertLeadToOrganization()` | `POST /leads/:id/convert` |
| Lead contacts CRUD | `GET/POST/PATCH/DELETE /leads/:id/contacts/*` |
| Labels | `POST/DELETE /leads/:id/labels/:labelId` |
| CNAEs | `/cnaes/leads/:leadId/:cnaeId` |
| ICPs | `/icps/leads/:leadId/:icpId` |
| Tech profile | `/leads/:leadId/tech-profile/*` |
| Products | `/leads/:leadId/products/:productId` |
| Cadences | `/cadences/lead/:leadId` |
| Activity order | `PATCH/DELETE /leads/:id/activity-order` |
| Import | `POST /lead-import` |

**Delete após migrar**: `src/actions/leads.ts`, `src/actions/lead-labels.ts`, `src/actions/lead-tech-profile.ts`, `src/actions/product-links.ts`, `src/actions/import-leads.ts`, `src/app/api/leads/`

---

## ~~FASE 14 — Deals~~ ✅

**Páginas**: `/deals`, `/deals/[id]`, `/pipeline`

| Action atual | Rota NestJS |
|---|---|
| `getDeals()` | `GET /deals` |
| `getDealById()` | `GET /deals/:id` |
| `createDeal()` | `POST /deals` |
| `updateDeal()` | `PATCH /deals/:id` |
| `deleteDeal()` | `DELETE /deals/:id` |
| `moveStage()` | `PATCH /deals/:id/stage` |
| Products CRUD | `/deals/:id/products/*` |
| Tech stack | `/deals/:id/tech-stack/*` |

**Delete após migrar**: `src/actions/deals.ts`, `src/actions/deal-tech-stack.ts`, `src/app/api/deals/`

---

## FASE 15 — Proposals & Meetings

**Páginas**: `/deals/[id]`, `/leads/[id]`, `/organizations/[id]`

| Action atual | Rota NestJS |
|---|---|
| `getProposals()` | `GET /proposals` |
| `createProposal()` | `POST /proposals` |
| `updateProposalStatus()` | `PATCH /proposals/:id` |
| `deleteProposal()` | `DELETE /proposals/:id` |
| `getMeetings()` | `GET /meetings` |
| `scheduleMeeting()` | `POST /meetings` |
| `updateMeeting()` | `PATCH /meetings/:id` |
| `cancelMeeting()` | `PATCH /meetings/:id/cancel` |

**Delete após migrar**: `src/actions/meetings.ts`, `src/actions/proposals.ts`

---

## FASE 16 — Campaigns

**Páginas**: `/campaigns`, `/campaigns/[id]`

| Action atual | Rota NestJS |
|---|---|
| `getCampaigns()` | `GET /campaigns` |
| `getCampaign()` | `GET /campaigns/:id` |

**Nota**: `campaigns.ts` já usa `backendFetch()` — verificar se está completo.

**Delete após migrar**: `src/actions/campaigns.ts`

---

## FASE 17 — Shared Entities & Entity Management

**Páginas**: `/admin/operations`

| Action atual | Rota NestJS |
|---|---|
| `shareEntity()` | `POST /shared-entities` |
| `unshareEntity()` | `DELETE /shared-entities/:id` |
| `getEntitySharing()` | `GET /shared-entities` |
| `transferEntity()` | `PATCH /shared-entities/transfer` |
| `searchEntitiesForTransfer()` | via `GET /leads`, `/organizations`, etc. com filtros |
| `getSharedUsersForEntities()` | via `GET /shared-entities` |

**Delete após migrar**: `src/actions/entity-management.ts`, `src/actions/operations-transfer.ts`

---

## FASE 18 — Dashboard & Funnel

**Páginas**: `/admin/manager`, `/dashboard`

| Action atual | Rota NestJS |
|---|---|
| `getManagerStats()` | `GET /dashboard/stats?period=month` |
| `getTimelineData()` | `GET /dashboard/timeline?period=month` |
| `getActivityCalendarData()` | `GET /dashboard/activity-calendar` |
| `getUpcomingRenewals()` | `GET /hosting-renewals` |
| Funnel stats | `GET /funnel/stats` |
| Weekly goals | `GET/POST /funnel/goals` |

**Delete após migrar**: `src/actions/admin-manager.ts`, `src/actions/hosting-renewals.ts`

---

## FASE 19 — Integrações (Gmail, WhatsApp, GoTo)

**Páginas**: `/admin/google`, emails em leads/deals

| Action atual | Rota NestJS |
|---|---|
| Email send | `POST /email/send` |
| Email list | `GET /email/messages` |
| `sendWhatsAppMessage()` | `POST /whatsapp/send` |
| `getWhatsAppMediaMessages()` | `GET /whatsapp/messages/:activityId` |
| Gmail templates | `GET/POST/PATCH/DELETE /campaigns/*` (ou templates endpoint) |
| WhatsApp templates | idem |

**OAuth**: `GET /auth/google`, `GET /auth/goto` — frontend redireciona para NestJS diretamente.

**Delete após migrar**: `src/actions/gmail.ts`, `src/actions/gmail-sync.ts`, `src/actions/gmail-templates.ts`, `src/actions/whatsapp.ts`, `src/actions/whatsapp-templates.ts`, `src/app/api/google/`, `src/app/api/goto/`, `src/app/api/evolution/`

---

## FASE 20 — Notificações

**Páginas**: componente global de notificações

| Action atual | Rota NestJS |
|---|---|
| `GET /api/notifications` | `GET /notifications` |
| `GET /api/notifications/stream` (SSE) | `GET /notifications/stream` |
| `PATCH /api/notifications/read` | `PATCH /notifications/read` |

**Delete após migrar**: `src/app/api/notifications/`

---

## FASE 21 — Limpeza final

Após todas as fases anteriores terem sido deployadas e verificadas:

1. Deletar todos os arquivos de server actions remanescentes em `src/actions/`
2. Deletar `src/app/api/` (exceto `src/app/api/auth/[...nextauth]` — NextAuth fica)
3. Remover imports de `prisma` do Next.js: `src/lib/prisma.ts` (se não mais usado)
4. Remover devDependencies do Next.js que eram só do backend: `bcryptjs`, etc.
5. Atualizar `middleware.ts` se necessário

**Não deletar**:
- `src/app/api/auth/[...nextauth]` — NextAuth sessão do usuário fica no Next.js
- `src/lib/auth.ts` — configuração NextAuth
- `src/lib/backend/client.ts` — usado pelas páginas migradas
- `src/lib/api-client.ts` — usado pelos hooks client-side

---

## Checklist de verificação por fase

Para cada fase, antes de deletar o código antigo:

```bash
# 1. Curl na rota NestJS em produção
curl -s -H "Authorization: Bearer $TOKEN" https://api.crm.wbdigitalsolutions.com/<rota> | jq .

# 2. Verificar que a página carrega em produção
# Acessar manualmente: https://crm.wbdigitalsolutions.com/<pagina>

# 3. Verificar que mutações funcionam (create/update/delete)
# Testar fluxo completo na UI

# 4. Conferir logs do NestJS
ssh root@45.90.123.190 "docker logs wb-crm-backend --tail=20"
```

---

## Status das fases

| Fase | Domínio | Status | Observações |
|---|---|---|---|
| 1 | Labels | ✅ | `labels.ts`, `lead-labels.ts`, `organization-labels.ts` deletados |
| 2 | Users | ✅ | `users.ts` deletado; `backendFetch('/users')` em todas as páginas |
| 3 | Pipelines & Stages | ✅ | `pipelines.ts`, `stages.ts`, `pipeline-view.ts` deletados |
| 4 | Admin: Business Lines & Products | ✅ | `business-lines.ts`, `products.ts` deletados; slug gerado no cliente |
| 5 | Admin: Tech Options | ✅ | `tech-categories.ts`, `tech-languages.ts`, `tech-frameworks.ts`, `tech-profile-options.ts` deletados |
| 6 | Admin: Sectors | ✅ | `sectors.ts` deletado |
| 7 | ICPs | ✅ | `icps.ts`, `icp-links.ts` deletados |
| 8 | Cadences | ✅ | `cadences.ts`, `cadence-steps.ts` deletados. `lead-cadences.ts` **parcial**: `applyCadenceToLead`, `applyCadenceToBulkLeads`, `pauseLeadCadence`, `resumeLeadCadence`, `cancelLeadCadence` removidos; mantidos `getLeadCadences`, `completeLeadCadence`, `cancelAllActiveCadences`, `getAvailableCadencesForLead`, `registerLeadReply` (NestJS não retorna detalhes ricos de cadência por lead) |
| 9 | Contacts | ✅ | `contacts.ts` deletado; `activities/page.tsx` usa `backendFetch('/contacts')` |
| 10 | Partners | ✅ | `partners.ts` deletado; `activities/page.tsx` e páginas de parceiros usam `backendFetch` |
| 11 | Activities | ✅ | `activities.ts` deletado; todos os reads migrados para `backendFetch`; mutations já estavam em hooks |
| 12 | Organizations | ✅ | `organizations.ts`, `organizations-list.ts` deletados. `organization-tech-profile.ts` **mantido** (sem endpoints NestJS para tech profile de organização) |
| 13 | Leads | ✅ | Reads migrados para `backendFetch`. NestJS recebeu `contactSearch`, `icpId`, `hasCadence` via TDD (18 testes). `leads.ts` **mantido** (mutations em componentes: `convertLeadToOrganization`, `deleteLeadContact`, `createLeadContact`, `qualifyProspect`, `bulkArchiveLeads`, etc.). `leads-list.ts` **mantido** (`getLeadContactsList` usado em `ContactForm`) |
| 14 | Deals | ✅ | Reads migrados para `backendFetch`. NestJS recebeu `valueRange`, `sortBy`, `sortOrder`, `closedMonth` via TDD (15 testes). Backend atualizado com `stage.pipeline`, `stageHistory.changedBy`, `whatsappMessages` em activities. `deals.ts` **mantido** (só `updateStageHistoryDate` restante). |
| 15 | Proposals & Meetings | ⏳ | |
| 16 | Campaigns | ⏳ | |
| 17 | Shared Entities | ⏳ | |
| 18 | Dashboard & Funnel | ⏳ | |
| 19 | Integrações (Gmail, WhatsApp, GoTo) | ⏳ | |
| 20 | Notificações | ⏳ | |
| 21 | Limpeza final | ⏳ | |
