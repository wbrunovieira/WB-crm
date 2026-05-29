# Plano: Eliminar Vazamento de Prisma na Camada de Aplicação (DDD)

**Data de Criação:** 2026-05-29
**Status:** Fase 1 concluída (4/4 use cases de integração) — Fases 2–4 pendentes
**Prioridade:** Alta — está crescendo em código novo (integrações em desenvolvimento ativo)
**Origem:** Análise de aderência a DDD do backend (`/backend`)

---

## 1. Problema

A regra de Ports & Adapters do projeto (ver `CLAUDE.md` → "DDD layer responsibilities" e memória `feedback_ddd_layers`) diz:

> Controller = HTTP only · UseCase = orquestração · VO = validação · **nunca injetar Prisma em use cases ou controllers.**

A camada `application` (use cases) deve depender de **abstrações** (`*.repository.ts` — os _ports_), não do `PrismaService` concreto. Hoje **11 use cases** injetam `PrismaService` diretamente, furando essa fronteira.

### Por que importa
- **Testabilidade:** use cases com Prisma exigem mockar o client inteiro (`fakePrisma = { contact: { findFirst: vi.fn() }, ... }`) em vez de usar os _in-memory fakes_ de repositório. Foi exatamente a dor sentida ao testar `process-incoming-email` e `process-whatsapp-message`.
- **Acoplamento:** lógica de negócio fica amarrada ao schema do Prisma; trocar/migrar persistência vira refatoração ampla.
- **Erosão do padrão:** os módulos novos de integração (`email`, `whatsapp`, `email-campaigns`) são onde a dívida está crescendo *agora* — não no legado.

### Insight que barateia tudo
**A maioria dos repository ports necessários JÁ EXISTE.** Os use cases simplesmente não os usam. Exemplos de ports já disponíveis:
`NotificationsRepository`, `EmailSuppressionsRepository`, `ContactsRepository`, `LeadContactsRepository`, `OrganizationsRepository`, `GoogleTokenRepository`, `EmailCampaign*Repository`, `LeadsRepository`, `PartnersRepository`, `ProposalsRepository`.

Portanto o trabalho é majoritariamente **"injetar o port existente e trocar a chamada"**, não "criar port do zero". Onde faltar um método no port, adiciona-se um método pequeno.

---

## 2. Inventário completo dos 11 vazamentos

| # | Use case | Operações Prisma | Ports a usar (✅ existe / ➕ criar/estender) |
|---|----------|------------------|---------------------------------------------|
| 1 | `integrations/whatsapp/.../process-whatsapp-message` | `notification.create` | ✅ `NotificationsRepository.save` |
| 2 | `integrations/email/.../process-incoming-email` | `contact/leadContact/organization.findFirst`, `notification.create`, `emailCampaign.findMany`, `emailCampaignRecipient.updateMany`, `emailCampaignSend.findMany`, `emailSuppression.findFirst/create` | ✅ `Contacts/LeadContacts/Organizations/Notifications/EmailCampaigns/EmailCampaignRecipients/EmailCampaignSends/EmailSuppressions` (todos existem) |
| 3 | `integrations/email/.../poll-gmail` | `googleToken.findFirst`, `googleToken.updateMany` | ✅ `GoogleTokenRepository` (estender se faltar método) |
| 4 | `integrations/email/.../verify-lead-contact-email` | `leadContact.findUnique/update` | ✅ `LeadContactsRepository` |
| 5 | `integrations/phone/.../verify-lead-contact-phones` | `leadContact.findUnique/update` | ✅ `LeadContactsRepository` |
| 6 | `email-campaigns/.../get-campaign-progress` | `emailCampaignStep.findMany` | ✅ `EmailCampaignStepsRepository` |
| 7 | `email-campaigns/.../enroll-entity` | `lead/organization.findUnique` | ✅ `Leads/OrganizationsRepository` |
| 8 | `email-campaigns/.../bulk-enroll` | `contact/lead/leadContact/organization/partner.findMany` | ✅ ports correspondentes (estender com método de busca em lote) |
| 9 | `funnel/.../funnel.use-cases` | `activity/deal/lead.count`, `activity/deal.findMany`, `weeklyGoal.findMany/findUnique/upsert` | ✅ `Activities/Deals/Leads` + ➕ `WeeklyGoalsRepository` (provável criar) |
| 10 | `proposals/.../upload-proposal` | `lead.findUnique/update` | ✅ `LeadsRepository` (ou `ProposalsRepository`) |
| 11 | `proposals/.../update-proposal-with-file` | `lead.findUnique/update` | ✅ `LeadsRepository` (ou `ProposalsRepository`) |

---

## 3. Estratégia

- **TDD sempre** (memória `feedback_tdd_migration`): para cada use case, reescrever os testes para usar _in-memory fakes_ dos ports em vez de `fakePrisma`; ver vermelho; refatorar; ver verde.
- **Um use case por vez**, em commits pequenos e isolados. Cada um buildado (`npm run build`) e com testes passando antes de seguir.
- **Reusar ports existentes**; só adicionar método ao port quando a operação não estiver coberta. Métodos novos devem ser de domínio (ex.: `findByEmail`, `markVerified`), não espelhar o Prisma.
- **Sem mudança de comportamento** — é refatoração pura. O payload, os efeitos colaterais e os retornos `Either` permanecem idênticos. Os testes existentes continuam válidos como rede de segurança.
- **Use case só orquestra — validação/regra vai para Value Object.** Toda lógica de validação ou construção de regra encontrada inline num use case deve ser extraída para um VO (com seu próprio spec em TDD). Ex.: a construção do `link` da notificação virou o VO `EntityLink` (`notifications/enterprise/value-objects/entity-link.vo.ts`), reaproveitado por email e whatsapp. Preferir injetar o **use case canônico** (`CreateNotificationUseCase`) em vez do repositório quando ele já encapsula efeitos de domínio (ex.: emitir no event bus do SSE).
- **Deploy** ao final de cada fase (não a cada use case), seguindo `feedback_deploy_frequency`.

---

## 4. Fases

### ▶️ Fase 1 — Integrações em desenvolvimento ativo (email + whatsapp) — **PRIMEIRO PASSO**
A maior dor de teste e a maior velocidade de mudança estão aqui.

1. **`process-whatsapp-message`** (menor: só `notification.create`) — injetar `NotificationsRepository`, criar `Notification` via entidade, `repo.save()`. Atualizar spec para usar fake de `NotificationsRepository`.
2. **`verify-lead-contact-email`** — `LeadContactsRepository` (findUnique/update → métodos de domínio).
3. **`poll-gmail`** — `GoogleTokenRepository`.
4. **`process-incoming-email`** (maior: 9 operações em 8 tabelas) — substituir todas as buscas/escritas por ports já existentes; trocar `fakePrisma` por fakes de repositório no spec. Fazer por último na fase, pois é o que mais consolida o padrão.

**Done da Fase 1:** nenhum dos 4 use cases importa `PrismaService`; specs usam fakes de repositório; build verde; deploy backend.

### Fase 2 — Email Campaigns
`get-campaign-progress`, `enroll-entity`, `bulk-enroll` (este pode exigir métodos `findManyBy...` em lote nos ports).

### Fase 3 — Funnel & Proposals
`funnel.use-cases` (provável criar `WeeklyGoalsRepository`), `upload-proposal`, `update-proposal-with-file`.

### Fase 4 — Guardrail anti-regressão
Adicionar verificação automática para impedir novos vazamentos:
- Lint/CI: falhar se algum arquivo em `domain/**/application/use-cases/**` importar `PrismaService` ou `@/infra/database`.
- Documentar a regra no `CLAUDE.md` (já implícita, tornar explícita com exemplo).

---

## 5. Riscos & Mitigações

| Risco | Mitigação |
|-------|-----------|
| `process-incoming-email` é crítico (bounces + notificações) e foi mexido hoje | Fazê-lo por último na Fase 1; testes existentes cobrem bounce/notificação; refatoração sem mudança de comportamento |
| Método faltando num port exigir tocar a implementação Prisma do adapter | Adicionar método de domínio no port + impl; cobrir com teste do adapter se houver E2E |
| `bulk-enroll` busca em 5 tabelas | Pode justificar um read-model/serviço de consulta dedicado; avaliar na Fase 2 |

---

## 6. Progresso

| Fase | Use case | Status |
|------|----------|--------|
| 1 | process-whatsapp-message | ✅ feito (2026-05-29) — injeta `CreateNotificationUseCase` (não Prisma); link via VO `EntityLink`; unit TDD + e2e |
| 1 | verify-lead-contact-email | ✅ feito (2026-05-29) — injeta `LeadContactsRepository` + `LeadsRepository`; VO `EmailVerification`; **owner-scoping via lead pai** (admin bypass) + erros HTTP discriminados (403/404/422/502) no controller + frontend interpretando status (`ApiError`); unit (21) + VO (14) + e2e (8); revisão senior |
| 1 | poll-gmail | ✅ feito (2026-05-29) — injeta `GoogleTokenRepository` (singleton) no lugar de Prisma; unit (6) + e2e `/email/sync`; revisão senior (ship it) |
| 1 | process-incoming-email | ✅ feito (2026-05-29) — injeta 8 ports + `CreateNotificationUseCase` (não Prisma); 3 métodos novos `findIdByEmailForOwner`/`findLeadIdByContactEmailForOwner`; VO `EntityLink`; ciclo EmailModule↔EmailCampaignsModule resolvido com forwardRef; unit (24) + e2e inbound + e2e bounce; revisão senior (ship it, fidelidade exata) |
| 2 | get-campaign-progress | ⏳ |
| 2 | enroll-entity | ⏳ |
| 2 | bulk-enroll | ⏳ |
| 3 | funnel.use-cases | ⏳ |
| 3 | upload-proposal | ⏳ |
| 3 | update-proposal-with-file | ⏳ |
| 4 | guardrail lint/CI | ⏳ |

### Trilha de segurança (spin-off da revisão senior — autorização em verificações por sourceGroup/lead)
Fechada a classe "qualquer usuário verifica/grava em leads de qualquer dono":
- ✅ `verify/lead-contact/:id`, `verify/lead/:id`, `verify/batch` (email) — owner-or-admin + erros HTTP discriminados + frontend
- ✅ batch **phone**, **whatsapp**, **meta-ads** — owner-filter no use case (admin bypass), `@CurrentUser` no controller, unit + e2e; whatsapp ganhou guard de grupo vazio
- ✅ email batch alinhado ao VO `EmailVerification` (status malformado vira erro por-lead, não aborta o lote)
