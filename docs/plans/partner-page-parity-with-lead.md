# Plano: Paridade da página do Partner com a página do Lead

**Data de Criação:** 2026-07-10
**Status:** Proposto — análise concluída, implementação não iniciada
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

### C. Específico de lead — avaliar/pular (provavelmente não portar)
ICP/qualificação, Convert, Tech Profile, Setor/CNAEs, Cadência, Meta/Google Ads, Deep Research, Google Places, Hierarquia, estrela/quality/status. São recursos de **prospecção/qualificação** de um prospect; um partner é uma relação estabelecida. Recomendo **não portar** por padrão, e reavaliar caso a caso se o Bruno quiser algum.

---

## 5. Fases sugeridas (ordem por valor × esforço)

- **Fase 1 — Paridade de renderização (frontend puro, alto valor):** ✅ CONCLUÍDA — barra de nav, Contatos rico (`PartnerContactsList`), Atividades rico (`PartnerActivitiesList` + backend rich activity read-model), Notas inline, layout de Informações. Sem migração. Decisão do Bruno (2026-07-11): variantes `Partner*` em vez de generalizar os componentes do lead; Atividades sem cadência, sem drag-order e sem atribuição de contatos.
- **Fase 2 — Comunicação + Produtos:** ✅ CONCLUÍDA — WhatsApp/Gmail no partner; seção Produtos (PartnerProduct). Sem migração.
- **Fase 3 — Negócios e Propostas (precisa decisão + backend):** migração `Deal.partnerId`/`Proposal.partnerId`, endpoints e seções. Só se o produto confirmar que faz sentido.
- **Fase 4 — Limpeza:** revisar itens do grupo C com o Bruno; portar o que ele quiser.

---

## 6. Decisões de produto a confirmar (antes de codar)

1. **Deals e Propostas** vinculam a partner? (define se entra migração ou fica fora)
2. Quais itens do **grupo C** o Bruno quer no partner (se algum)?
3. **Generalizar** os componentes do lead (`LeadContactsList`, `LeadActivitiesList`, etc.) para `lead|partner|organization` **ou** criar variantes de partner? (recomendo generalizar — evita 3× de código e mantém a renderização idêntica de fato).

---

## 7. Padrão de qualidade (obrigatório neste repo)

Cada fase entra com **testes** (unit + e2e; frontend com Playwright quando a jornada exigir) e **build + suíte e2e completa do backend rodados localmente antes de qualquer push**. Comentários de código em inglês.

---

## 8. Referências

- Páginas: `src/app/(dashboard)/leads/[id]/page.tsx`, `src/app/(dashboard)/partners/[id]/page.tsx`
- Componentes-chave do lead: `LeadContactsList`, `LeadActivitiesList`, `LeadProductsSection`, `ProposalsList`, `LeadDealsList`, `MeetingsList`, `LeadNotesBlock`
- Schema: `Deal` (sem partnerId), `Proposal` (sem partnerId), `PartnerProduct` (existe), `Meeting`/`Activity` (com partnerId)
- Já entregue: Reuniões no partner + roll-up de atividades dos contatos
