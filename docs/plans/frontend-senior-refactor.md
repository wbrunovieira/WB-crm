# Plano: Refatoração "Senior" do Frontend (quebrar arquivos grandes + clean code)

**Data de Criação:** 2026-07-16
**Status:** Proposto — não iniciado
**Prioridade:** Média — dívida de manutenibilidade, não bloqueia features
**Objetivo:** Levar o frontend (`src/`) a um padrão sênior — componentes pequenos, de responsabilidade única, com duplicação eliminada — **sem mudar comportamento** e **sem regressão visual**.

---

## 1. Diagnóstico (medido em 2026-07-16)

`src/components` + `src/app`: **325 arquivos `.tsx`**, dos quais **112 (34%) passam de 200 linhas**.

| Faixa | Qtd | Observação |
|---|---|---|
| **> 1000 linhas** | 3 | `LeadForm` (1393), `LeadActivitiesList` (1377), `EmailCampaignsView` (1179) — monólitos de 1 componente, 19–30 `useState` cada, sem decomposição |
| **500–1000** | 29 | forms gigantes, listas, calendários, modais |
| **200–500** | 80 | maioria aceitável; foco nos clusters de duplicação |

### Clusters de duplicação (o maior ROI — copiar/colar entre entidades)
| Cluster | Arquivos | ~Linhas somadas | Alvo |
|---|---|---|---|
| **Verify buttons** (email/phone) | `LeadEmailVerifyButton`, `LeadContactEmailVerifyButton`, `PartnerEmailVerifyButton`, `ContactEmailVerifyButton`, `LeadPhoneVerifyButton`, `LeadContactPhoneVerifyButton`, `PartnerPhoneVerifyButton`, `ContactPhoneVerifyButton` (8) | ~1783 | 1 `VerifyButton` genérico (channel email/phone) + config por entidade → ~350 |
| **ICP sections** | `LeadICPSection` (825), `PartnerICPSection` (819), `OrganizationICPSection` (819) | ~2463 | 1 `<EntityICPSection>` parametrizado + 3 wrappers finos → ~500 |
| **Cadence sections + modais** | `LeadCadenceSection` (441), `PartnerCadenceSection` (436), `ApplyCadenceModal` (331), `PartnerApplyCadenceModal` (331), `BulkApplyCadenceModal` (231) | ~1770 | seções/modais genéricos por entidade → ~700 |
| **Batch check modais** | `BatchEmailCheckModal` (316), `BatchPhoneCheckModal` (310), `BatchWhatsAppCheckModal` (306) | ~932 | 1 `BatchCheckModal` genérico → ~350 |
| **Activities lists** | `LeadActivitiesList` (1377), `PartnerActivitiesList` (823) | ~2200 | `<EntityActivitiesList>` + hooks compartilhados → ~800 |
| **Activity calendars** | `activities/ActivityCalendar` (803), `admin/manager/ActivityCalendar` (454) | ~1257 | núcleo de calendário compartilhado → ~700 |
| **Forms grandes** | `LeadForm` (1393), `OrganizationForm` (800), `ActivityForm` (680), `DealForm` (608), `PartnerForm` (566), `ContactForm` (460), `CadenceForm` (425), `SectorForm` (384) | ~5300 | seções de campo + hook de estado por form |

> Só os 4 primeiros clusters (verify/ICP/cadence/batch) somam **~7000 linhas** que colapsam para **~1900** — grande ganho com risco baixo (comportamento idêntico, só desduplicação).

---

## 2. Definição de "Senior" (Definition of Done por arquivo)

Um arquivo é considerado "pronto" quando:
1. **Tamanho:** componente/página ≤ **~250 linhas** (alvo), **≤ 300 como teto**. Hooks e helpers extraídos contam à parte.
2. **Responsabilidade única:** um componente = uma coisa. UI de apresentação separada de lógica de dados/estado.
3. **Lógica em hooks:** estado complexo, efeitos e chamadas de API vivem em **custom hooks** (`useXxx`) testáveis, não inline no JSX.
4. **Zero duplicação entre entidades:** comportamento repetido (lead/partner/org/contact) vira **um componente genérico parametrizado** + wrappers finos.
5. **Sem mudança de comportamento:** mesma UX, mesmos textos (pt-BR), mesmas chamadas de API. Refactor puro.
6. **Tipagem forte:** sem `any` novo; props explícitas.
7. **Testes:** o comportamento crítico extraído ganha teste unitário (hook/utils/validação). Componentes com lógica ramificada ganham teste de render (happy-dom).

### Convenções do projeto a PRESERVAR (não "modernizar" à toa — ver `CLAUDE.md`)
- **Server Components por padrão**; `"use client"` só quando há interatividade/hooks. Ao quebrar, empurrar `"use client"` para as folhas interativas e manter contêineres como Server Components quando possível.
- **Forms com `useState` puro** — **NÃO** introduzir `react-hook-form`/Formik. O padrão continua: estado com `useState`, handlers manuais, `try/catch` com `setError`, `useRouter.push()`. A extração é: **um hook `useXxxForm()`** encapsulando esse estado + seções de campo como subcomponentes controlados.
- **Zod** em `src/lib/validations/` reaproveitado client+server — manter.
- **Dados via `apiFetch`** (`src/lib/api-client`) — o frontend não tem Prisma. Manter.
- **Erros** com as classes de `src/lib/errors.ts`; **toasts** com Sonner; **UI** com os componentes shadcn em `src/components`.
- Textos de UI em **pt-BR**.

---

## 3. Guardrails (Stage 0 — antes de quebrar qualquer arquivo)

**Objetivo:** criar a base compartilhada e as travas que tornam as etapas seguintes seguras e mensuráveis.

1. **Diretório de primitivos compartilhados** já existe (`src/components/shared/`) — consolidar ali os genéricos criados nas etapas.
2. **Hook utilitário `useAsyncAction`** (`src/hooks/`): encapsula o padrão onipresente `loading → try/catch → toast erro/sucesso`. Vira a base dos verify-buttons/modais.
3. **Budget de tamanho no ESLint:** adicionar `max-lines` como **warning** (limite 300, ignorando comentários/branco) — não falha o CI ainda, só dá visibilidade. Na etapa final vira `error` para arquivos novos.
4. **Baseline de métricas:** salvar a contagem atual (script `scripts/count-large-components.sh`) para medir progresso a cada etapa.
5. **Harness de teste de componente:** confirmar `tests/unit/components/` + `happy-dom` (já configurado) e criar 1 exemplo de teste de hook + 1 de render como molde.

**Commit:** `chore(fe): guardrails p/ refactor (useAsyncAction, max-lines warn, baseline)`
**→ Review sênior** (ver §5).

---

## 4. Etapas (ordenadas por ROI ÷ risco)

> Regra de ouro em toda etapa: **refactor sem mudança de comportamento**. Rodar `npm run test:frontend`, `npx tsc --noEmit`, `npm run build` e um **smoke visual** das telas afetadas antes de commitar.

### Stage 1 — Colapsar os *Verify Buttons* (8 → ~2) 🟢 baixo risco / alto ROI
- Criar `src/components/shared/verify/VerifyButton.tsx` genérico: props `{ channel: "email" | "phone", value, entity: { type, id }, onVerified }`. A diferença entre lead/partner/contact é só o **endpoint** e o **label** → tabela de config (`verify-config.ts`).
- Substituir os 8 arquivos por wrappers de 1–5 linhas (ou remover e ajustar os imports para o genérico).
- Teste: `useVerify` hook (estados verifying/ok/erro) + 1 render.
- **Commit:** `refactor(fe): unify email/phone verify buttons into a generic VerifyButton`
- **→ Review sênior.**

### Stage 2 — Unificar *ICP Sections* (3 × 820 → 1 + wrappers) 🟢
- Extrair `src/components/icps/EntityICPSection.tsx` parametrizado por `{ entityType, entityId, actions }`. `Lead/Partner/OrganizationICPSection` viram wrappers finos que injetam os server actions/endpoints certos.
- Extrair a lógica (fetch ICPs, marcar fit, campos de qualificação) para `useEntityICP()`.
- Teste do hook + render do genérico.
- **Commit:** `refactor(fe): single parametrized EntityICPSection (was 3 near-identical)`
- **→ Review sênior.**

### Stage 3 — Unificar *Cadence* (sections + Apply/Bulk modais) 🟢
- `EntityCadenceSection` + `ApplyCadenceModal` genérico (entity-aware) + manter `BulkApplyCadenceModal` compartilhando o mesmo núcleo.
- Extrair `useCadence()`.
- **Commit:** `refactor(fe): generic cadence section + apply modals (lead/partner)`
- **→ Review sênior.**

### Stage 4 — Unificar *Batch Check Modals* (3 → 1) 🟢
- `BatchCheckModal` genérico por `channel: email|phone|whatsapp` (progress + resultado + endpoint por canal).
- **Commit:** `refactor(fe): generic BatchCheckModal for email/phone/whatsapp`
- **→ Review sênior.**

### Stage 5 — Decompor os *mega-forms* (uma sub-etapa por form) 🟡 médio risco
Padrão por form (aplicar a cada um, **um commit + review por form**):
1. Extrair `useXxxForm(initial)` → todo o `useState`/validação/submit num hook.
2. Quebrar o JSX em **seções de campo** (`XxxIdentitySection`, `XxxContactSection`, `XxxAddressSection`, `XxxTechSection`, …) — subcomponentes controlados que recebem `value`/`onChange`.
3. O `XxxForm` vira o orquestrador (~150 linhas): monta o hook + as seções.
- Ordem (maior→menor, mas começar por 1 médio p/ calibrar o padrão): **PartnerForm (566)** → LeadForm (1393) → OrganizationForm (800) → ActivityForm (680) → DealForm (608) → ContactForm (460) → CadenceForm (425) → SectorForm (384).
- Reaproveitar seções entre forms quando os campos coincidem (ex.: endereço, contato, CNAE — já há `SecondaryCNAEsManager`).
- **Commit por form:** `refactor(fe): decompose <Xxx>Form into sections + useXxxForm`
- **→ Review sênior após cada form.**

### Stage 6 — Decompor *Activities Lists* (Lead 1377 + Partner 823) 🟡
- Extrair `<EntityActivitiesList>` + `useEntityActivities()` (fetch, filtros, ordenação, otimista). `SortableActivityItem` (766) entra aqui — quebrar item vs. lista vs. controles.
- Lead e Partner viram wrappers finos.
- **Commit:** `refactor(fe): shared EntityActivitiesList + useEntityActivities`
- **→ Review sênior.**

### Stage 7 — Decompor as *grandes views/modais restantes* 🟡 (uma por commit)
`EmailCampaignsView` (1179), `MeetingsList` (960), `ImportWizard` (895), `activities/ActivityCalendar` (803) + `admin/manager/ActivityCalendar` (454, compartilhar núcleo), `GoogleLeadsModal` (748), `LeadContactsList` (738), `WhatsAppMessageLog` (707), `BookingClient` (715 — extrair `i18n/dicionário` + `PhoneField` + seções), `DealsListView`, `WhatsAppSendModal`, `GmailComposeModal`, `ProposalsList`, `CampaignMetricsPanel`, `ProposalAgentModal`, `BotFlowEditor`, `ScheduleMeetingModal`…
- Cada um: extrair hook(s) de dados + subcomponentes de UI; **um commit + review por arquivo**.

### Stage 8 — Decompor as *páginas de detalhe grandes* 🟡
`app/(dashboard)/leads/[id]/page.tsx` (890), `partners/[id]` (608), `activities/page` (567), `organizations/[id]` (451), `meet-analyses/[id]` (374)…
- Extrair as **abas/seções** em componentes; a page vira Server Component fino que compõe as seções.
- **Commit + review por página.**

### Stage 9 — Varredura final + trava 🟢
- Percorrer o restante da faixa 200–500 que ainda ferir a DoD.
- Promover o `max-lines` do ESLint de **warning → error** para arquivos novos/alterados (não retroativo em massa).
- Atualizar `CLAUDE.md` com o padrão (hooks + seções, genéricos por entidade).
- **Commit:** `chore(fe): enforce component size budget + document conventions`
- **→ Review sênior final (varredura geral).**

---

## 5. Protocolo por etapa (obrigatório)

Cada etapa segue **exatamente**:
1. **Implementar** o refactor (sem mudar comportamento).
2. **Gates locais:** `npm run test:frontend` + `npx tsc --noEmit -p tsconfig.json` + `npm run build` verdes; **smoke visual** das telas tocadas (abrir no browser).
3. **Commit** com a mensagem da etapa (inglês, imperativo).
4. **Review sênior** — enviar o diff a um agente sênior com o handoff de §6. Aplicar o retorno **antes** de seguir para a próxima etapa (padrão do projeto: review ao fim de cada fase).
5. Só então iniciar a próxima etapa. **Não** empilhar etapas sem review no meio.

> Deploy: acumular várias etapas e subir em lotes (não precisa deploy por etapa — é refactor). CI verde na `main` é o gate; o usuário aprova o CD quando quiser publicar um lote.

---

## 6. Handoff para o agente sênior (template por etapa)

> Revise SOMENTE o diff desta etapa. É um **refactor sem mudança de comportamento** (quebrar arquivo grande / desduplicar). Aponte problemas por severidade (blocker/major/minor/nit) com `arquivo:linha` e correção em 1 linha. Não reescreva.
> Foque em: (1) **paridade de comportamento** — mesma UX, textos pt-BR, chamadas de API idênticas, nada de regressão; (2) **fronteira Server/Client** — `"use client"` só nas folhas interativas, não subiu à toa; (3) **estado nos hooks** correto (deps de efeito, closures, race em async); (4) **props e tipagem** (sem `any` novo, sem prop drilling excessivo); (5) **acessibilidade** preservada (labels, aria, foco); (6) **duplicação realmente eliminada** (não só movida); (7) **testes** cobrem o comportamento extraído. Diga "clean" se nada relevante.

---

## 7. Métricas de sucesso

Medir a cada etapa com `scripts/count-large-components.sh` (baseline no Stage 0):
- `.tsx > 200 linhas`: **112 → alvo < 40**.
- `.tsx > 500 linhas`: **32 → alvo 0**.
- `.tsx > 1000 linhas`: **3 → 0**.
- Clusters de duplicação (verify/ICP/cadence/batch): **eliminados** (1 genérico cada).
- **0** regressões (testes verdes + smoke visual em cada etapa).

---

## 8. Riscos e mitigação

| Risco | Prob. | Mitigação |
|---|---|---|
| Regressão de comportamento ao quebrar monólito | Média | Refactor puro + gates (test/tsc/build) + smoke visual + review sênior por etapa |
| "Genérico" que vira abstração errada (params demais) | Média | Só generalizar duplicação **comprovada** (≥3 usos ou near-identical); wrappers finos preservam call-sites |
| Quebra de fronteira Server/Client (hydration) | Baixa | Empurrar `"use client"` p/ folhas; revisar SSR das páginas de detalhe (ver bug de hydration do `/book`) |
| Escopo grande / cansaço de review | Alta | **Uma unidade por commit**; etapas pequenas e ordenadas por ROI; parar entre etapas é seguro |
| Conflito com features em andamento | Média | Fazer clusters de duplicação primeiro (rápidos); coordenar merges; não refatorar arquivo em edição ativa por outra frente |

---

## 9. Referências

- Convenções: `CLAUDE.md` (Server vs Client, forms com `useState`, Zod, `apiFetch`, errors, Sonner).
- Primitivos compartilhados: `src/components/shared/`.
- Validações: `src/lib/validations/`. Cliente de API: `src/lib/api-client.ts`.
- Padrão de review por fase: memória `feedback_senior_review_per_phase`.
- Baseline de tamanho (2026-07-16): 112 `.tsx` > 200 linhas (3 > 1000, 29 entre 500–1000).
