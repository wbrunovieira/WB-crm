# Plano: Aderência DDD da Camada de Aplicação (Prisma · VOs · Testes)

**Data de Criação:** 2026-05-29
**Status:** Fases 1–4 + Tier 1 concluídas · **Fase 5 Batch 1 concluído** (InstagramHandle, OperationsEntityType, shared-entities guard) · pendentes: Fase 5 Batch 2–3 (name/slug VOs, CNAE, register-user), status→métodos de entidade, Fase 6 (backfill testes), Tier 2
**Prioridade:** Alta — dívida cresce em código novo de integração
**Origem:** Análise de aderência a DDD + auditoria de **todos os 205 use cases** (2026-05-29)

---

## 1. Problema

Regra de Ports & Adapters do projeto (`CLAUDE.md` → "DDD layer responsibilities", memória `feedback_ddd_layers`):

> Controller = HTTP only · UseCase = orquestração · **VO = validação** · **nunca injetar Prisma em use cases ou controllers.**

Três desvios desse contrato, medidos na auditoria:
1. **Prisma na camada `application`** — use cases injetam `PrismaService` em vez de depender de ports.
2. **Validação fora de VO** — validação de formato/regra inline no use case.
3. **Cobertura de unit test** — use cases não-triviais sem spec dedicado.

### Por que importa
- **Testabilidade:** use case com Prisma exige mockar o client inteiro em vez de usar _in-memory fakes_ de repositório.
- **Acoplamento:** lógica de negócio amarrada ao schema do Prisma.
- **Erosão do padrão:** a dívida cresce nos módulos novos de integração, não no legado.

### Insight que barateia tudo
**A maioria dos repository ports já existe** — os use cases simplesmente não os usam. O trabalho é majoritariamente "injetar o port e trocar a chamada"; onde faltar, adiciona-se um método de domínio pequeno.

---

## 2. Auditoria 2026-05-29 (205 use cases)

### 2.1 Critério Prisma — **7 vazamentos restantes** (4 já corrigidos na Fase 1)
| Use case | Operações | Ação |
|----------|-----------|------|
| `email-campaigns/bulk-enroll` | `contact/lead/leadContact/organization/partner.findMany` (5 tabelas) | ➕ métodos de busca em lote nos ports |
| `email-campaigns/enroll-entity` | `lead/organization.findUnique` | ✅ `Leads/OrganizationsRepository` |
| `email-campaigns/get-campaign-progress` | `emailCampaignStep.findMany` | ✅ `EmailCampaignStepsRepository` |
| `funnel/funnel.use-cases` | `activity/deal/lead.count`, `findMany`, `weeklyGoal.*` (16 acessos, 4 use cases) | ✅ `Activities/Deals/Leads` + ➕ `WeeklyGoalsRepository` |
| `phone/verify-lead-contact-phones` | `leadContact.findUnique/update` | ✅ `LeadContactsRepository` (espelhar `verify-lead-contact-email`) |
| `proposals/upload-proposal` | `lead.findUnique/update` | ✅ `LeadsRepository` |
| `proposals/update-proposal-with-file` | `lead.findUnique/update` | ✅ `LeadsRepository` |

### 2.2 Critério VO — validação inline a mover para Value Object
**Alto valor:**
- `email-campaigns/bulk-enroll` + `email-campaigns/send-campaign-step`: cada um define `EMAIL_REGEX` inline — **o VO `EmailAddress` já existe** e deve ser usado.
- `operations/operations.use-cases`: validação de enum `entityType` via lista hardcoded → VO/guard tipado.
- `meta-ads/verify-lead-meta-ads` + `batch-verify-lead-meta-ads`: normalização de handle Instagram (`replace(/^@/,"").trim()`) → VO `InstagramHandle`.

**Baixo valor / opcional (~15 ocorrências):** guards `if (!input.name?.trim())` em `create-*` (deal, pipeline, activity, contact, partner, lead). Avaliar caso a caso — se a entidade já valida não-vazio no `create()`, é redundância inofensiva (não extrair).

### 2.3 Critério Testes — **110/205 use cases sem unit spec dedicado**
Muitos são CRUD cobertos por e2e. Não-triviais **sem unit** (prioridade real):
`email-campaigns`: send-campaign-step, handle-gmail-bounce, get-campaign-stats, trigger-campaign-send-now, add-recipients · `warming`: run-warming-cycle, get-warming-status · `funnel`: os 4 · `admin`: business-line/product/tech-option (bundles) · `auth`: register-user · `bot-flows`: 6 de 7 · `dashboard`: os 3 · `deals`: deal-tech-stack (7), update-stage-history-date · `activities`: mark-thread-replied.

---

## 3. Estratégia (vale para todas as fases)

- **TDD sempre:** reescrever o spec para usar _in-memory fakes_ dos ports; ver vermelho; refatorar; ver verde.
- **Um use case por vez**, commits pequenos. Cada um: `npm run build` + **`tsc --noEmit`** (SWC não checa tipos) + `vitest run` antes de seguir.
- **Reusar ports existentes**; método novo só quando faltar, e de domínio (`findByEmail`, `markVerified`), não espelhando Prisma.
- **VO = validação.** Toda validação/regra inline encontrada vira um VO com spec próprio (TDD). Ex.: `EntityLink`, `EmailVerification`.
- **Use case canônico > repositório** quando ele encapsula efeito de domínio (ex.: `CreateNotificationUseCase` emite no event bus do SSE).
- **Sem mudança de comportamento** na refatoração de Prisma — retorno `Either`, payloads e efeitos idênticos; revisão senior por use case crítico.
- **Deploy** ao fim de cada fase, não a cada use case (`feedback_deploy_frequency`).

---

## 4. Sequência de Fases (ordem lógica)

> Lógica: **eliminar os vazamentos → travar com guardrail → arrumar validação em VOs → cobrir testes faltantes.** Em cada fase de Prisma, dobra-se o escopo para já incluir o VO e os unit tests dos use cases tocados.

### ✅ Fase 1 — Integrações em desenvolvimento ativo (CONCLUÍDA)
`process-whatsapp-message`, `verify-lead-contact-email`, `poll-gmail`, `process-incoming-email`. Ver tabela de progresso (§6).

### ✅ Trilha de segurança (CONCLUÍDA — spin-off da revisão senior)
Autorização owner-or-admin em todas as verificações por lead/sourceGroup. Ver §6.

### ▶️ Fase 2 — Email Campaigns (Prisma + VO + testes)
1. `get-campaign-progress` → `EmailCampaignStepsRepository`.
2. `enroll-entity` → `Leads/OrganizationsRepository`.
3. `bulk-enroll` → métodos de busca em lote nos ports (contact/lead/leadContact/organization/partner). **O mais pesado.**
4. **VO:** trocar `EMAIL_REGEX` inline pelo VO `EmailAddress` em `bulk-enroll` e `send-campaign-step`.
5. **Testes:** unit para `send-campaign-step`, `handle-gmail-bounce`, `get-campaign-stats`, `add-recipients`, `trigger-campaign-send-now`.

### Fase 3 — Funnel · Proposals · Phone (Prisma + testes)
1. `funnel.use-cases` (16 acessos) → `Activities/Deals/Leads` + ➕ `WeeklyGoalsRepository` (novo). **Pior caso.**
2. `proposals/upload-proposal` + `update-proposal-with-file` → `LeadsRepository`.
3. `phone/verify-lead-contact-phones` → `LeadContactsRepository` (espelhar o de email; mesmo padrão owner-scoping + VO de verificação se aplicável).
4. **Testes:** unit dos 4 use cases do funnel.

### ✅ Fase 4 — Guardrail anti-regressão (CONCLUÍDA)
- Teste de arquitetura `test/unit/architecture/no-prisma-in-application.spec.ts` que **falha o CI** se um arquivo em `domain/**/application/**` OU um `*.controller.ts` importar `infra/database`/`prisma.service`. Allowlist: só `health.controller` (liveness `$queryRaw`). Sanity-check confirmou que pega violação plantada.
- Regra explícita no `CLAUDE.md` (seção DDD → Key patterns) com exemplo ❌/✅.
- Não precisou de ratchet/allowlist de dívida — Fases 1–3 + Tier 1 já tinham zerado os vazamentos.

### ▶️ Fase 5 — Extração de VOs (validação inline → Value Object)

Varredura 2026-05-30 de **todos** os use cases (não só a auditoria original). Categorizado por tipo de validação, com a regra de corte: **VO = valor auto-contido com invariante própria; transição de estado de agregado = método de entidade, não VO** (confirmado pelo revisor senior).

**✅ Batch 1 (CONCLUÍDO) — format/normalização/enum (valor claro):**
1. `meta-ads`: `InstagramHandle` VO (trim + strip `@` + não-vazio) — usado em `verify-lead-meta-ads` e `batch-verify-lead-meta-ads`. Consolidou o skip de "sem instagram" + "handle vazio" no batch (antes chamava o checker com `""`).
2. `operations`: `validateType` inline → VO `OperationsEntityType` (+ `InvalidEntityTypeError` re-exportado p/ compat).
3. `shared-entities`: enum inline → guard de domínio `isValidSharedEntityType` no arquivo da entidade (union usada como primitivo em repos/controller → guard é proporcional, VO seria fricção).

**Batch 2 (proposto) — `*Name`/`*Title`/`*Slug` VOs (consistência com o padrão já existente: `OrganizationName`, `LabelName`, `SectorName`, `CadenceName`, `ProposalTitle`):**
guards `.trim()`/não-vazio inline em: `activities`(subject), `deals`(title), `contacts`(name), `partners`(name), `pipelines`(name), `stages`(name), `leads`(businessName), `admin`(product/business-line/tech-option name+slug). **Antes de extrair, verificar caso a caso se a entidade já valida no `create()`** — se sim, o guard do use case é redundância (per §2.2) e o end-state limpo é a entidade consumir o VO. Fazer um por entidade, commit pequeno.

**Batch 3 (proposto) — parsing/format específico:**
- `lead-import`: regex CNAE `/^(\d{4,7})\s*[-–]\s*(.+)$/` → VO `CnaeCode`/`CnaeEntry`.
- `auth/register-user`: validar email com `EmailAddress` VO (hoje não valida — é **adicionar** validação, não só mover; confirmar intenção).

**FORA do escopo "validação→VO" (tratar como modelo rico, fase futura):**
checagens de **transição de status** (`campaign.status !== "ACTIVE"`, `recipient.status !== "BOUNCED"`, deal `open|won|lost`, icp status) espalhadas em campaigns/email-campaigns/deals/icp → **métodos de entidade/agregado** (`campaign.canSend()`, `deal.close()`), não VOs. Validar o *valor* do enum pode virar VO; a *regra de transição* é invariante do agregado.

### Fase 6 — Backfill de unit tests (não-triviais sem spec)
Cobrir, por domínio, os não-triviais listados em §2.3 que não foram tocados nas fases anteriores: `warming` (run-warming-cycle, get-warming-status), `admin` (bundles), `auth` (register-user), `bot-flows` (6), `dashboard` (3), `deals` (deal-tech-stack, update-stage-history-date), `activities` (mark-thread-replied).

### Fase 7 — Controllers HTTP-only (investigação 2026-05-29)
"Controller = só HTTP" — não deve acessar Prisma nem repositório (delega a use case).

**Tier 1 — Prisma direto no controller — ✅ CONCLUÍDO (todos com revisão senior):**
- ✅ `transfer-analysis.controller` — load+validação no use case via `ActivitiesRepository.findAnalysisContext`; unit 10.
- ✅ `gatekeeper-analysis.controller` — reusa `findAnalysisContext`; unit 7.
- ✅ `meet-analysis.controller` — `MeetingsRepository.findMeetAnalysisContext`; unit 6.
- ✅ `infra/controllers/email-campaigns.controller` — 3 endpoints de leitura (source-groups, recipient-search, suppressions) → query use cases + 3 métodos no `EnrollmentSourceRepository`; unit 5. (Endpoints restantes injetam repos = Tier 2.)
- 🟢 `health.controller` — `$queryRaw SELECT 1` (liveness) — **aceitável**, não mexer.

**Resultado: ZERO Prisma em controllers** (exceto o health liveness). Gap menor (senior): os métodos de query do adapter de email-campaigns não têm teste de integração dedicado — opcional.

**Tier 2 — Controller injeta Repository (leitura direta em vez de use case) — EM ANDAMENTO:**
11 controllers, padrão dominante de leitura fina (dropdown/listagem/findById). Ação: envolver cada leitura num "query use case" fino.

✅ **Sub-batch 1 (2026-05-30):**
- `meetings-crud`: `MeetingsRepository` era injeção **morta** (nunca chamada) → removida.
- `findDistinctSourceGroups` (phone, whatsapp, meta-ads, email): passaram a injetar o `GetLeadSourceGroupsUseCase` existente (exportado do `LeadsModule`) em vez de `LeadsRepository`. Full e2e (450) valida o DI.

⏳ **Restante:** `email` (`emailMessagesRepo.findByOwnerId`) · `goto-recordings` (`activities.findByIdRaw`) · `warming` (poolEmails/sends findAll) · `auth` (`oauthRepo.loadGoToTokens`) · `lead-deep-research` (`sessionRepo.cancelAllActiveForUser` — é **comando**, vira command use case) · `gatekeeper-analysis` (5 reads: analysis/batch).

---

## 5. Riscos & Mitigações

| Risco | Mitigação |
|-------|-----------|
| `bulk-enroll` varre 5 tabelas | Métodos `findManyBy...` em lote por port; avaliar read-model dedicado |
| `funnel` exige `WeeklyGoalsRepository` novo + 16 acessos | Criar o port com TDD; migrar use case por use case dentro do bundle |
| Guardrail falharia o CI com vazamentos ainda presentes | Adicionar só após zerar (Fases 2–3), ou com allowlist em ratchet |
| Refatoração de use case crítico mudar comportamento | TDD + e2e + revisão senior por use case (padrão da Fase 1) |
| Backfill de 110 specs é grande | Priorizar não-triviais (§2.3); CRUD já coberto por e2e fica por último |

---

## 6. Progresso

| Fase | Item | Status |
|------|------|--------|
| 1 | process-whatsapp-message | ✅ 2026-05-29 — `CreateNotificationUseCase`; VO `EntityLink`; unit + e2e |
| 1 | verify-lead-contact-email | ✅ 2026-05-29 — `LeadContactsRepository`+`LeadsRepository`; VO `EmailVerification`; owner-scoping + erros HTTP 403/404/422/502 + frontend `ApiError`; unit 21 + VO 14 + e2e 8; senior |
| 1 | poll-gmail | ✅ 2026-05-29 — `GoogleTokenRepository` (singleton); unit 6 + e2e `/email/sync`; senior |
| 1 | process-incoming-email | ✅ 2026-05-29 — 8 ports + `CreateNotificationUseCase`; 3 métodos `findIdByEmailForOwner`; VO `EntityLink`; ciclo resolvido com forwardRef; unit 24 + e2e inbound + e2e bounce; senior |
| seg. | verify/lead-contact, verify/lead, verify/batch (email) | ✅ owner-or-admin + erros HTTP discriminados + frontend |
| seg. | batch phone / whatsapp / meta-ads | ✅ owner-filter no use case + `@CurrentUser`; unit + e2e; whatsapp ganhou guard de grupo vazio |
| seg. | email batch | ✅ alinhado ao VO `EmailVerification` (status malformado = erro por-lead) |
| 2 | get-campaign-progress | ✅ 2026-05-29 — Prisma removido (stepOrderMap do `allSteps`); unit 8; senior |
| 2 | enroll-entity | ✅ 2026-05-29 — `EnrollmentSourceRepository` (read-model port + adapter); unit 9; senior |
| 2 | bulk-enroll (+ EMAIL_REGEX→`EmailAddress`) | ✅ 2026-05-29 — `findBulkEnrollmentCandidates` no adapter (8 queries); VO `EmailAddress`; unit 10; e2e; senior |
| 2 | send-campaign-step (EMAIL_REGEX→`EmailAddress`) | ✅ 2026-05-29 — `isValidEmail` agora delega ao VO `EmailAddress`; teste de campo composto (`a@x / b@y`) preservado no spec combinado |
| 2 | unit: handle-gmail-bounce, get-campaign-stats, add-recipients | ✅ já cobertos no spec combinado `email-campaigns.spec.ts` (falso-positivo da auditoria por heurística de nome) |
| 2 | trigger-campaign-send-now | ⚠️ wrapper de lock `sendingInProgress` (sem Prisma/validação) — unit test opcional, baixo valor |
| 3 | funnel.use-cases (+ `FunnelRepository` + unit) | ✅ 2026-05-29 — read-model port `FunnelRepository` (4 métodos, 16 queries no adapter); use cases viraram orquestradores finos; owner-scoping preservado (equivalência verificada pelo senior); unit 7 + e2e; senior |
| 3 | upload-proposal · update-proposal-with-file | ✅ 2026-05-29 — `LeadsRepository.findDriveFolder/setDriveFolder`; unit 37 + e2e 10 |
| 3 | verify-lead-contact-phones | ✅ 2026-05-29 — `LeadContactsRepository`(+`savePhoneVerification`)+`LeadsRepository`; owner-scoping + 403/404; frontend `ApiError`; unit 8 + e2e 5; senior (paridade c/ email) |
| 4 | guardrail lint/CI + regra no CLAUDE.md | ✅ 2026-05-30 — teste de arquitetura (application + controllers, allowlist health); sanity-check de violação plantada; regra + exemplo no CLAUDE.md |
| 5 | Batch 1: `InstagramHandle` (meta-ads ×2) · `OperationsEntityType` · `isValidSharedEntityType` guard | ✅ 2026-05-30 — VO specs (10+6) + 2 skip-tests no batch; senior "ship it"; tsc + 1784 unit verdes |
| 5 | Batch 2a: `DealTitle` · `ContactName` · `PartnerName` · `PipelineName` · `StageName` · `ActivitySubject` (create-* delegam aos VOs) | ✅ 2026-05-30 — 6 VOs (padrão OrganizationName), msgs idênticas; 21 specs; 1807 unit verdes; tsc; guardrail; senior "ship it" |
| 5 | Batch 2b: `BusinessName` (lead) · `BusinessLineName`/`ProductName`/`TechOptionName` (admin) — create-* delegam | ✅ 2026-05-30 — 4 VOs name; msgs idênticas; specs (3+9); 1819 unit + admin/leads e2e verdes; tsc; guardrail |
| 5 | **Adiado (mudança de comportamento / decisão de produto):** slugs admin (hoje só não-vazio; `Slug` com regex kebab rejeitaria input aceito), enums `PartnerType`/`ActivityType` (sem conjunto canônico no código — VO estrito adicionaria validação) | ⏳ confirmar com produto |
| 5 | Batch 3: `CnaeEntry` VO (lead-import) · register-user valida email com `EmailAddress` (aprovado pelo usuário; +6 unit, backfill Fase 6) | ✅ 2026-05-30 — 1829 unit + 450 e2e verdes; tsc; guardrail. Mudança de comportamento: cadastro rejeita email malformado (→ 400) |
| 5 | status→métodos de entidade (fase "modelo rico", não-VO) · slugs admin / enums (decisão de produto) | ⏳ |
| 6 | unit backfill: warming, admin, auth, bot-flows, dashboard, deals, activities | ⏳ |
