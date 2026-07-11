# Plano: Paridade da página do Partner com a página do Lead

**Data de Criação:** 2026-07-10
**Status:** Em andamento — Fases 1, 2, 3a e 3b concluídas; Fase 4 pendente (última atualização 2026-07-11)
**Prioridade:** Média — melhora consistência de UX e produtividade no trabalho com parceiros
**Origem:** Pedido do Bruno (2026-07-10): a página do partner deve ter os mesmos recursos da página do lead; onde já existe, a renderização deve ficar similar.

---

## 1. Objetivo

Levar a página do **Partner** (`/partners/[id]`, 470 LOC) ao mesmo padrão da página do **Lead** (`/leads/[id]`, 886 LOC): mesmos recursos e, onde o recurso já existe, mesma renderização. Nem tudo do lead se aplica a um partner (um partner não é um prospect a qualificar/converter) — este plano separa o que **portar**, o que **alinhar** e o que **avaliar/pular**.

---

## 2. Método

Comparei seção a seção as duas páginas: barra de navegação, cabeçalho, e cada bloco (componentes, fetches de dados e renderização). Também verifiquei o suporte no backend (schema) para os recursos que dependem de dados vinculados ao partner.

**Achados de backend relevantes:**
- `Deal` tem `leadId`/`contactId`/`organizationId` — **NÃO** tem `partnerId`. → "Negócios" no partner exige mudança de schema/consulta.
- `Proposal` tem só `leadId`. → "Propostas" no partner exige backend.
- `PartnerProduct` **existe**. → "Produtos" no partner é viável sem migração.
- `Meeting`/`Activity` já têm `partnerId` (feito). → Reuniões e Atividades já vinculam.

---

## 3. Comparação seção a seção

Legenda: ✅ igual · 🟡 existe mas renderização difere · ❌ falta · ⚪ específico de lead (avaliar)

| Seção / recurso | Lead | Partner | Status | Backend p/ partner |
|---|---|---|---|---|
| **Barra de navegação fixa** (âncoras por seção) | sim | não | ❌ | — (frontend) |
| **Cabeçalho** (badges status/quality, estrela) | rico | nome + tipo | ⚪ | status/quality/estrela não existem em partner |
| **Informações básicas** | sim | sim | 🟡 alinhar layout | ok |
| **Contatos** | `LeadContactsList` (add/edit, papéis, converter, ações) | lista inline simples | 🟡 renderização bem mais pobre | endpoints de contato existem |
| **Atividades** | `LeadActivitiesList` (timeline, outcomes, análises call/meet/gatekeeper, GmailSync, lembretes, ordenação) | inline `slice(5)` | 🟡 gap grande | roll-up já feito; falta a UI rica |
| **Reuniões** | `MeetingsList` | `MeetingsList` | ✅ (feito) | ok |
| **Negócios (Deals)** | `LeadDealsList` (`/deals?leadId`) | — | ❌ | **falta `Deal.partnerId`** (migração) |
| **Propostas** | `ProposalsList` (`/proposals?leadId`) | — | ❌ | **falta `Proposal.partnerId`** (migração) |
| **Produtos** | `LeadProductsSection` | — | ❌ | `PartnerProduct` **existe** → viável |
| **Comunicação** (Phone/WhatsApp/WhatsAppCheck/Gmail) | sim | só `PhoneLink` | ❌ WhatsApp/Gmail | endpoints existem (genéricos) |
| **Verificação** (e-mail/telefone) | `LeadEmail/PhoneVerifyButton` | — | ⚪ | verificar se aplica a partner |
| **Notas** | `LeadNotesBlock` (edição inline) | texto read-only | 🟡 | campo `notes` existe |
| **Google Places** | seção + link | — | ⚪ | específico de prospecção |
| **Cadência** | `LeadCadenceSection` | — | ⚪ | cadência é de prospecção de lead |
| **ICP / Qualificação** | `LeadICPSection` | — | ⚪ | não se aplica a partner |
| **Tech Profile** | `LeadTechProfileSection` | — | ⚪ | específico de lead/org |
| **Setor / CNAEs** | `LeadSectorSection` / `SecondaryCNAEsManager` | — | ⚪ | avaliar |
| **Ads / Deep Research** | Meta/Google Ads, deep/focused research | — | ⚪ | específico de prospecção |
| **Hierarquia** | `LeadHierarchySection` | — | ⚪ | partner não tem hierarquia (por ora) |
| **Idiomas** | `LanguageBadges` | — | ⚪ | avaliar |
| **Estatísticas** | — | sim | (partner tem a mais) | — |
| **Leads Indicados** (referrals) | — | sim | (partner tem a mais) | — |
| **Gerenciamento de Acesso** | `EntityManagementPanel` | `EntityManagementPanel` | ✅ | ok |

---

## 4. Recomendação (3 grupos)

### A. Alinhar renderização (já existe, mas mais pobre no partner)
1. **Contatos** — trocar a lista inline por um componente rico equivalente ao `LeadContactsList` (adicionar/editar contato, papel, principal, ações). Idealmente **generalizar** `LeadContactsList` para aceitar `partnerId` em vez de duplicar.
2. **Atividades** — trocar o inline `slice(5)` pela experiência do `LeadActivitiesList` (timeline completa, outcomes, análises de call/meet, GmailSync, lembretes). O roll-up de dados já está pronto; falta a UI. Também generalizar em vez de duplicar.
3. **Informações básicas / Notas** — alinhar layout e usar edição inline de notas (equivalente ao `LeadNotesBlock`).
4. **Barra de navegação fixa** — adicionar as âncoras por seção (mesmo componente do lead).

### B. Portar recurso (falta e faz sentido pro partner)
5. **Comunicação** — `WhatsAppButton` + `WhatsAppCheckButton` + `GmailButton` no bloco de contato/contatos (os endpoints são genéricos).
6. **Produtos** — `LeadProductsSection` equivalente usando `PartnerProduct` (backend já suporta; sem migração).
7. **Negócios (Deals)** — precisa **migração `Deal.partnerId`** + endpoint `/deals?partnerId` + `MeetingsList`-style. Decisão de produto: um deal pode ser "de um parceiro"? (ex.: negócio de indicação/co-venda).
8. **Propostas** — precisa **migração `Proposal.partnerId`** + `/proposals?partnerId`. Avaliar se faz sentido enviar proposta a um parceiro.

### C. Específico de lead — avaliar/portar na Fase 4
ICP/qualificação, Convert, Tech Profile, Setor/CNAEs, Cadência, Meta/Google Ads, Deep Research, Google Places, Hierarquia, estrela/quality/status. Originalmente eram recursos de **prospecção/qualificação** de um prospect. **Decisão do Bruno (2026-07-11):** manter esses itens como opções e **avaliar portar** para o partner — vários podem ser úteis também na relação com parceiros (ex.: Tech Profile de uma agência parceira, Setor/CNAEs, notas de qualificação). A Fase 4 trata cada um caso a caso em vez de descartar por padrão.

---

## 5. Fases sugeridas (ordem por valor × esforço)

- **Fase 1 — Paridade de renderização (frontend puro, alto valor):** ✅ CONCLUÍDA — barra de nav, Contatos rico (`PartnerContactsList`), Atividades rico (`PartnerActivitiesList` + backend rich activity read-model), Notas inline, layout de Informações. Sem migração. Decisão do Bruno (2026-07-11): variantes `Partner*` em vez de generalizar os componentes do lead; Atividades sem cadência, sem drag-order e sem atribuição de contatos.
- **Fase 2 — Comunicação + Produtos:** ✅ CONCLUÍDA — WhatsApp/Gmail no partner; seção Produtos (PartnerProduct). Sem migração.
- **Fase 3 — Ciclo de vida do partner + Negócios/Propostas** (decisões tomadas por Bruno em 2026-07-11, ver §9). Migração só no backend, tudo aditivo (nullable/default, sem backfill). TDD obrigatório: unit + e2e.
  - **3a — Estágio do partner:** ✅ CONCLUÍDA (commit `e83b082b`) — campo `partnerStatus` (`prospect` = lead de partner ainda não oficializado · `active` = parceria oficializada · `inactive` = encerrada/pausada) + `partnershipStartedAt`. Badge de status no cabeçalho, filtro na lista, badge "já trouxe cliente" **derivado** de `referredLeads`/`referredOrganizations` convertidos (não armazenar). Espelha `Lead.status`.
  - **3b — Negócios/Propostas do partner:** ✅ CONCLUÍDA (commits `5dd5a2bc` backend, `804f4cbd` frontend, `cf2c950f` lock de campos no DealsView) — `Deal.partnerId` (partner é o cliente — cenário A), `Deal.referredByPartnerId` (atribuição/indicação — cenário B, mesmo padrão de `Lead.referredByPartnerId`/`Organization.referredByPartnerId`), `Proposal.partnerId`. Seções "Negócios" e "Propostas" na página do partner; na página de Negócios, badge "Parceiro: X" (indicação) + filtro "Negócios de parceiro".
    - **Senior review (2026-07-11):** aprovado com ressalvas, todas corrigidas — (1) `PartnerOwnershipValidator` reutilizável valida ownership de `partnerId`/`referredByPartnerId` em deals e proposals (a FK só garantia existência, não dono); (2) guard "mesmo parceiro não pode ser cliente e indicador"; (3) filtro de contatos do `DealForm` corrigido para usar as relações aninhadas do read model (`c.partner?.id` etc. — org/lead estavam quebrados em runtime); (4) removido `?pageSize=200` no-op das chamadas de `/partners`; (5) testes: unit (ownership, unlink, same-partner, admin bypass) + e2e (rejeição de partner alheio, `ON DELETE SET NULL`). **Drift descoberto:** a migration `20260711000002` não estava aplicada no dev DB (colunas via `db push`, FKs ausentes) — FKs alinhadas manualmente no dev; prod aplica via `deploy-backend.yml`.
- **Fase 4 — Grupo C (portar recursos escolhidos):** **Decisão do Bruno (2026-07-11):** portar 7 recursos do grupo C (fora Hierarquia e os de prospecção — Google Places/Meta-Google Ads/Deep Research). Insight estrutural: `Organization` já tem o precedente (junctions `Organization*`, colunas `primaryCNAEId`/`internationalActivity`/`languages`) → portar = replicar o padrão em `Partner*`. Migração só no backend, aditiva. TDD obrigatório + review por sub-fase + build + push (sem deploy por fase). Sub-fases por valor×esforço:
  - **4a — Estrela (`starRating`):** ✅ CONCLUÍDA — coluna `Partner.starRating Int?` (migration `20260711000003`) em toda a stack; `PartnerStarRatingInline` (PATCH `/partners/:id`, rollback em erro) no cabeçalho + exibição read-only nos cards da lista; validação de faixa 1–5 no use case (guard da bot API); unit + e2e (set/clear/faixa inválida). Senior review: aprovado. Nice-to-have adiados: `sortBy=starRating` na lista e `create` aceitar `starRating` (paridade fina). (Sem `quality` — redundante com `partnerStatus`.)
  - **4b — Idiomas:** ⏳ coluna `Partner.languages String?` (JSON) + `LanguageBadges` (display puro) + campo no form. Esforço P.
  - **4c — Verify e-mail/telefone:** ⏳ colunas de verificação no Partner + generalizar os use-cases de verify (já há `verify-lead-contact-email.use-case.ts`) + variantes dos botões. Esforço M.
  - **4d — Setor / CNAEs:** ⏳ `Partner.primaryCNAEId` + `Partner.internationalActivity` + `PartnerSector` + `PartnerSecondaryCNAE`, espelhando `Organization*`. Substitui/complementa o `Partner.industry` (string). Esforço M–G.
  - **4e — Tech Profile:** ⏳ 7 junctions `PartnerLanguage/Framework/Hosting/Database/ERP/CRM/Ecommerce` + endpoints + variante da seção. Esforço G.
  - **4f — ICP / Qualificação:** ⏳ `PartnerICP` + campos de fit + variante `PartnerICPSection`. Esforço G. (Fit fraco — confirmado por Bruno mesmo assim.)
  - **4g — Cadência:** ⏳ `PartnerCadence` + `PartnerCadenceActivity` (sem precedente Organization → maior risco). Esforço G. Por último.

---

## 6. Decisões de produto (resolvidas)

1. **Deals e Propostas vinculam a partner?** ✅ SIM (2026-07-11). Ver §9 — dois cenários (partner-cliente e partner-indicador), ambos suportados.
2. Quais itens do **grupo C** o Bruno quer no partner (se algum)? — ✅ DIREÇÃO DADA (2026-07-11): manter como opções e avaliar/portar na Fase 4 (podem ser úteis pro partner). Escolha item a item ainda a fazer na Fase 4.
3. **Generalizar vs. variantes:** ✅ RESOLVIDO — criar variantes `Partner*` (não generalizar). Aplicado nas Fases 1–2.

---

## 9. Decisões da Fase 3 (Bruno, 2026-07-11)

**Contexto:** partners são agências/negócios que indicam a WB para os clientes deles. Os cadastrados hoje ainda não trouxeram cliente nem oficializaram a parceria — são "leads de partner", mas NÃO devem se misturar com os leads de cliente final (que já são entidade separada `Lead` / página `/leads`).

**Decisão 1 — Ciclo de vida (aceita):** um Partner já é entidade separada, então basta um campo de estágio (não um novo tipo). Adicionar `partnerStatus` (`prospect|active|inactive`, default `prospect`, indexado) + `partnershipStartedAt DateTime?`. "Já trouxe cliente" é **derivado** de referrals convertidos, não armazenado. `partnerType` (o que ele é) e `partnerStatus` (onde está na relação) são ortogonais.

**Decisão 2 — Negócios/Propostas (aceita):** suportar os dois cenários:
- **A. Partner é o cliente** (ex.: a agência contrata um serviço para a própria agência) → `Deal.partnerId`, `Proposal.partnerId`.
- **B. Partner indicou** (ex.: a agência oferece o serviço para o cliente dela; o cliente final fecha) → `Deal.referredByPartnerId` (mesmo padrão já existente em Lead/Organization).
- Na página de Negócios: badge "Parceiro: X" quando `referredByPartnerId` setado + filtro "Negócios de parceiro".

**Pergunta em aberto (não bloqueia schema/backend, decide só a UX do fluxo de criação):** quando a agência indica, quem fatura/paga é o cliente final (cenário B, comissão) ou a agência (cenário A)? Definir na etapa de frontend da 3b.

---

## 7. Padrão de qualidade (obrigatório neste repo)

Cada fase entra com **testes** (unit + e2e; frontend com Playwright quando a jornada exigir) e **build + suíte e2e completa do backend rodados localmente antes de qualquer push**. Comentários de código em inglês.

---

## 8. Referências

- Páginas: `src/app/(dashboard)/leads/[id]/page.tsx`, `src/app/(dashboard)/partners/[id]/page.tsx`
- Componentes-chave do lead: `LeadContactsList`, `LeadActivitiesList`, `LeadProductsSection`, `ProposalsList`, `LeadDealsList`, `MeetingsList`, `LeadNotesBlock`
- Schema: `Deal` (sem partnerId), `Proposal` (sem partnerId), `PartnerProduct` (existe), `Meeting`/`Activity` (com partnerId)
- Já entregue: Reuniões no partner + roll-up de atividades dos contatos
