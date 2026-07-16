---
name: crm-icp
description: Como consultar e criar ICP (Ideal Customer Profile / Perfil de Cliente Ideal) no WB-crm via API, e como vincular um ICP a um lead com os campos de qualificação. Use sempre que um bot/agente precisar criar ICPs, listar/ler ICPs, ou marcar o fit de um lead a um ICP. Endpoints sob https://crm-api.wbdigitalsolutions.com, auth JWT (ver skill crm-bot-api).
---

# ICP (Perfil de Cliente Ideal) — API

ICP no WB-crm = um **perfil/segmento alvo** com nome, slug e um **conteúdo em markdown** descrevendo o cliente ideal (características, dores, solução). É **user-scoped** (`ownerId`): cada ICP pertence a quem criou; só o dono vincula/edita (checagem estrita, sem bypass de admin). Lead↔ICP é **N:N** (junção `LeadICP`) com campos ricos de qualificação. Auth: JWT Bearer (ver [[reference_jwt_backend_admin]] / skill `crm-bot-api`). Base `https://crm-api.wbdigitalsolutions.com`.

## CRUD do ICP
| Ação | Rota | Body | Resposta |
|---|---|---|---|
| Criar | `POST /icps` | `{ "name":"...", "content":"<markdown>", "slug"?, "status"? }` | `{id,name,slug,content,status,createdAt}` (201) |
| Listar | `GET /icps?status=` | — | `[{id,name,slug,status}]` (status opcional: draft/active/archived) |
| Ler | `GET /icps/:id` | — | `{id,name,slug,content,status}` |
| Editar | `PATCH /icps/:id` | `{name?,slug?,content?,status?}` | objeto atualizado |
| Apagar | `DELETE /icps/:id` | — | 204 |
| Versões | `GET /icps/:id/versions` · `POST /icps/:id/versions/restore {versionId}` | | |

- **Obrigatórios p/ criar: `name` + `content`.** `slug` é auto-gerado do nome se omitido (minúsculas, hífens; único). `status` default `draft` → use `active` p/ aparecer como utilizável.
- Validação: name 2-100 chars, content ≤10000 chars.

Exemplo de criação:
```json
POST /icps
{ "name":"PME Serra Fluminense sem site",
  "content":"# ICP — PME sem presença digital\n\n## Quem é\n- Comércio/serviço local em Petrópolis/Teresópolis\n- 2-30 funcionários, fatura R$ 200k-3M/ano\n- Sem site ou só Instagram\n\n## Dores\n- Depende de indicação; some no Google\n- Concorrente com site aparece primeiro\n\n## Nossa solução\n- Site/landing + Google Meu Negócio + automação de leads",
  "status":"active" }
```

## Vincular ICP a um lead (com qualificação)
Duas formas:
1. **No create do lead** (vínculo simples): `POST /leads { ..., "icpId":"<id>" }`.
2. **Vínculo rico** (recomendado): `POST /icps/leads/:leadId/:icpId` com `ICPLinkData` no body. Atualizar: `PATCH /icps/leads/:leadId/:icpId`. Remover: `DELETE /icps/leads/:leadId/:icpId`. Listar ICPs do lead: `GET /icps/leads/:leadId`. (Org: `…/icps/organizations/:orgId/:icpId`.)

`ICPLinkData` (todos opcionais; arrays vão como JSON array):
```json
{ "matchScore": 0-100, "notes": "texto",
  "icpFitStatus": "ideal|partial|out_of_icp",
  "realDecisionMaker": "founder_ceo|tech_partner|commercial_partner|other",
  "realDecisionMakerOther": "texto se other",
  "perceivedUrgency": ["curiosity","interest","future_need","current_need","active_pain"],
  "businessMoment": ["validation","growth","scale","consolidation"],
  "currentPlatforms": ["..."],
  "fragmentationLevel": 0-10,
  "mainDeclaredPain": "...",
  "strategicDesire": "...",
  "perceivedTechnicalComplexity": 1-5,
  "purchaseTrigger": "texto curto",
  "nonClosingReason": "priority_changed|budget|timing|...",
  "estimatedDecisionTime": "less_than_2_weeks|2_to_4_weeks|1_to_2_months|3_plus_months",
  "expansionPotential": 1-5 }
```
`perceivedUrgency` é o melhor preditor de fechamento (escala curiosidade→dor ativa). `icpFitStatus` resume o fit. Os demais são diagnóstico/estratégia — preencher o que souber.

## Receita do bot
1. Criar o(s) ICP(s) uma vez: `POST /icps` (status `active`). Guardar o `id` retornado.
2. Ao prospectar/criar lead: `POST /leads { ..., "icpId":"<id>" }` **ou** depois `POST /icps/leads/:leadId/:icpId` com o fit.
3. Conferir: `GET /icps/leads/:leadId`.

Validado 2026-06-27 com o token do Bot Prospector (CRUD ok, 201/200/204). Leads/atividades/Google Places: skill `crm-bot-api`.
