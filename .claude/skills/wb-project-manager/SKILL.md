---
name: wb-project-manager
description: Como gerenciar o board do projeto WB CRM no WB Project Manager via API REST — autenticar (API key), criar milestones e issues (individual ou bulk), atualizar status. Use SEMPRE que precisar registrar uma melhoria/correção/pendência do CRM como issue, mover status, ou consultar o board. Toda melhoria/correção do CRM deve virar issue aqui. Base: https://projects.wbdigitalsolutions.com.
---

# WB Project Manager — board do projeto "WB CRM"

Board de milestones/issues do CRM, gerido **inteiramente via API REST**. **Regra do projeto:** toda melhoria, correção ou pendência do CRM vira uma **issue** aqui, e o status é mantido em dia (In Progress ao começar, Done ao concluir).

Base: `https://projects.wbdigitalsolutions.com` · Docs interativos (Swagger): `/api/docs` (Authorize 🔓 → cola a key → Try it out) · Spec JSON: `/api/openapi` · Guia de auth: `scripts/API-KEY-AUTH.md` no repo do PM.

## Autenticação (API key única — sem "gerar token")
- Header em toda chamada: `Authorization: Bearer <key>`. O antigo `/api/generate-token` **foi removido**.
- A key fica **fora do repo**, em `~/.wb-project-manager-api-key` (perm 600). **Nunca** escrever a key em código, commit, doc ou log. Se não existir, pedir ao Bruno.
- Uso:
  ```bash
  KEY=$(cat ~/.wb-project-manager-api-key)
  BASE=https://projects.wbdigitalsolutions.com
  curl -s -H "Authorization: Bearer $KEY" "$BASE/api/issues?projectId=cmor7cfvd0001pa01jgypeqh0"
  ```
- Key errada → **401**. Não parsear o corpo do 401, confiar no status.
- (Admin, só o Bruno no servidor) key nova: `openssl rand -hex 32` → setar `API_KEY` **e** `API_KEY_USER_ID` (obrigatório, senão a key é rejeitada) no .env/vault → redeploy.

## IDs de referência (projeto WB CRM)
- `projectId`: `cmor7cfvd0001pa01jgypeqh0`
- `workspaceId`: `cmge96f200001wa7ouziczg0w`
- Opera como **Bruno Vieira** (assignee/creator padrão da key).

**Status** — ⚠️ no **GET** filtra por `status=<TYPE>`; no **POST/PATCH** usa `statusId=<cuid>`. São coisas diferentes:

| Nome | statusId | type (GET) |
|---|---|---|
| Backlog | `cmge9i3pt0005walququqw1rx` | `BACKLOG` |
| Todo | `cmge9i3pv0007walqv7is970v` | `TODO` |
| In Progress | `cmge9i3pv0009walqbwhmule6` | `IN_PROGRESS` |
| Done | `cmge9i3pw000bwalqn1glwrn4` | `DONE` |
| Canceled | `cmge9i3pw000dwalqi5qgpguo` | `CANCELED` |

`priority`: `URGENT | HIGH | MEDIUM | LOW | NO_PRIORITY` · `type`: `FEATURE | MAINTENANCE | BUG | IMPROVEMENT`.

## Antes de criar: listar (não duplicar)
```bash
curl -s -H "Authorization: Bearer $KEY" "$BASE/api/issues?projectId=cmor7cfvd0001pa01jgypeqh0"
# filtrar por status: ...&status=IN_PROGRESS   (TYPE, não o cuid)
```

## Criar MILESTONES (sprints/temas)
```bash
curl -X POST "$BASE/api/milestones" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" -d '{
  "name": "Sprint 1 — Correções críticas",
  "description": "...",
  "projectId": "cmor7cfvd0001pa01jgypeqh0",
  "targetDate": "2026-08-15T00:00:00.000Z"
}'
```
Guardar o `id` retornado → usar como `milestoneId` nas issues.

## Criar ISSUES
Obrigatórios: `title`, `workspaceId`, `statusId`. Úteis: `description`, `projectId`, `milestoneId`, `priority`, `type`.
- Uma: `POST /api/issues`.
- Em lote: `POST /api/issues/bulk` (**máx 100**):
  ```bash
  curl -X POST "$BASE/api/issues/bulk" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" -d '{
    "workspaceId": "cmge96f200001wa7ouziczg0w",
    "issues": [
      {"title":"...","description":"...","projectId":"cmor7cfvd0001pa01jgypeqh0","statusId":"cmge9i3pv0007walqv7is970v","type":"BUG","priority":"HIGH","milestoneId":"<MS_ID>"}
    ]
  }'
  ```

## Atualizar status (o app calcula o SLA sozinho na mudança)
```bash
curl -X PATCH "$BASE/api/issues/<ISSUE_ID>" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"statusId": "cmge9i3pv0009walqbwhmule6"}'   # In Progress
```
`milestoneId`/`assigneeId` aceitam `null` para desassociar.

## Gotchas
- **GET** = `status=<TYPE>`; **POST/PATCH** = `statusId=<cuid>`. Não confundir.
- Datas em **ISO 8601** (`...T00:00:00.000Z`).
- Bulk: **máx 100** issues/request.
- A **UI não atualiza sozinha** após criar via API — dar **refresh** na página pra ver.
- 401 = key errada; confiar no status, não no corpo.

## Fluxo típico
1. `GET /api/issues?projectId=...` (ver o que já existe).
2. Criar milestones por sprint/tema → guardar os `id`.
3. Criar issues (bulk) associadas ao `projectId` + `milestoneId` certo.
4. Ao trabalhar numa issue: PATCH → In Progress; ao concluir: PATCH → Done.
