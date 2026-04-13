# Operations Transfer — Client Post-Sale Handoff

## Objetivo

Quando um lead/organização fecha negócio e passa para o sistema de operações, as automações de comunicação (WhatsApp, Gmail, GoTo) devem parar de criar atividades no CRM automaticamente. O histórico é preservado. A transferência é reversível. Atividades manuais continuam funcionando independente do estado.

---

## Decisões de arquitetura

### Campo `inOperationsAt` na Organization e Lead

```prisma
// Organization
inOperationsAt  DateTime?   // null = active in CRM, set = transferred to operations

// Lead (caso ainda não convertido)
inOperationsAt  DateTime?
```

- `null` → fluxo normal, automações ativas
- `DateTime` → transferido para operações, automações ignoram este lead/org
- Reversível: setar de volta para `null`

### Campo `additionalDealIds` na Activity

Padrão já usado no projeto para `contactIds`:

```prisma
// Activity (existente)
dealId             String?   // deal primário (mantém)
additionalDealIds  String?   // JSON array de deal IDs secundários (novo)
```

Quando uma ligação/conversa envolver dois deals, o usuário pode vincular a atividade a ambos.

---

## Como os matchers serão afetados

Todos os três matchers devem verificar `inOperationsAt` antes de retornar uma entidade:

| Matcher | Arquivo | Mudança |
|---|---|---|
| WhatsApp | `src/lib/evolution/number-matcher.ts` | Retorna `null` se entidade tem `inOperationsAt` |
| GoTo | `src/lib/goto/number-matcher.ts` | Retorna `null` se entidade tem `inOperationsAt` |
| Gmail | `src/lib/google/email-activity-creator.ts` | Pula criação se entidade tem `inOperationsAt` |

Resultado: a mensagem/ligação chega, o matcher encontra o número/email, mas retorna `null` → nenhuma atividade criada → comportamento idêntico a "número desconhecido".

---

## Interface admin: `/admin/operations`

Nova sub-página no painel admin com:

1. **Campo de busca** — busca por nome de Lead, Organization ou Contact
2. **Card do resultado** — mostra nome, tipo (Lead/Organization), status atual
3. **Botão de ação** com toast de confirmação:
   - Se `inOperationsAt = null`: botão "Transfer to Operations" → confirmar → seta `inOperationsAt = now()`
   - Se `inOperationsAt != null`: botão "Revert to Sales" → confirmar → seta `inOperationsAt = null`
4. **Badge de status** — "In Operations since [data]" ou "Active in CRM"

Card na página `/admin` principal linkando para esta sub-página.

---

## Fase 1 — Schema + Matchers (TDD obrigatório)

### 1.1 — Migration de banco

**Arquivos a criar:**
- `prisma/migrations/YYYYMMDD_add_in_operations_at/migration.sql`

```sql
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "inOperationsAt" TIMESTAMP(3);
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "inOperationsAt" TIMESTAMP(3);
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "additionalDealIds" TEXT;

CREATE INDEX IF NOT EXISTS "organizations_inOperationsAt_idx" ON "organizations"("inOperationsAt");
CREATE INDEX IF NOT EXISTS "leads_inOperationsAt_idx" ON "leads"("inOperationsAt");
```

### 1.2 — Testes (escrever ANTES da implementação)

**`tests/unit/lib/evolution/number-matcher.test.ts`** (adicionar casos):
```
✓ returns null when matched organization has inOperationsAt set
✓ returns null when matched lead has inOperationsAt set
✓ returns entity normally when inOperationsAt is null
✓ returns entity normally when inOperationsAt does not exist on schema (safety)
```

**`tests/unit/lib/goto/number-matcher.test.ts`** (adicionar casos):
```
✓ returns null when matched organization has inOperationsAt set
✓ returns null when matched lead has inOperationsAt set
✓ returns entity normally when inOperationsAt is null
```

**`tests/unit/lib/google/email-activity-creator.test.ts`** (adicionar casos):
```
✓ does not create activity when matched entity has inOperationsAt set
✓ creates activity normally when inOperationsAt is null
```

### 1.3 — Implementação dos matchers

**`src/lib/evolution/number-matcher.ts`** — adicionar ao query de Contact/Lead/Partner:
```typescript
// Na busca de Contact:
where: { ..., organization: { inOperationsAt: null } }
// Na busca de Lead:
where: { ..., inOperationsAt: null }
```

**`src/lib/goto/number-matcher.ts`** — mesma lógica.

**`src/lib/google/email-activity-creator.ts`** — checar após match:
```typescript
if (match && (match.organization?.inOperationsAt || match.lead?.inOperationsAt)) {
  return; // skip — entity is in operations
}
```

---

## Fase 2 — Server Action (TDD obrigatório)

### Arquivo: `src/actions/operations-transfer.ts`

```typescript
"use server";

// searchEntitiesForTransfer(query: string)
// → busca Lead e Organization por nome, retorna lista com id, name, type, inOperationsAt

// transferToOperations(entityType: "lead" | "organization", entityId: string)
// → seta inOperationsAt = new Date()
// → apenas admin pode executar
// → revalidatePath

// revertFromOperations(entityType: "lead" | "organization", entityId: string)
// → seta inOperationsAt = null
// → apenas admin pode executar
// → revalidatePath
```

### Testes: `tests/unit/actions/operations-transfer.test.ts`

```
searchEntitiesForTransfer:
  ✓ returns leads and organizations matching the query
  ✓ includes inOperationsAt status in results
  ✓ returns empty array when no matches
  ✓ throws Unauthorized if not authenticated
  ✓ only admin can search (non-admin gets empty or throws)

transferToOperations:
  ✓ sets inOperationsAt to current date on organization
  ✓ sets inOperationsAt to current date on lead
  ✓ throws Unauthorized if not authenticated
  ✓ throws Forbidden if not admin
  ✓ throws NotFound if entity does not exist
  ✓ revalidates the correct path after transfer

revertFromOperations:
  ✓ sets inOperationsAt to null on organization
  ✓ sets inOperationsAt to null on lead
  ✓ throws Unauthorized if not authenticated
  ✓ throws Forbidden if not admin
  ✓ throws NotFound if entity does not exist
  ✓ revalidates the correct path after revert
```

---

## Fase 3 — UI Admin (após testes passando)

### `src/app/(dashboard)/admin/operations/page.tsx`

- Servidor (SSC): busca entidades via `searchEntitiesForTransfer` se `?q=` na URL
- Campo de busca (client) → submete via `router.push` com `?q=query`
- Lista de resultados com cards:
  - Nome e tipo (Lead / Organization)
  - Badge "In Operations" (roxo) ou "Active in CRM" (verde)
  - Data de transferência se aplicável
  - Botão de ação com toast de confirmação (client component `OperationsTransferButton`)

### `src/components/admin/OperationsTransferButton.tsx`

```typescript
// Props: entityType, entityId, entityName, inOperationsAt
// Estado: loading, confirmando
// Fluxo:
//   1. Clique → toast.custom com "Confirm transfer?" + botões Confirm/Cancel
//   2. Confirm → chama action → toast.success
//   3. router.refresh() para atualizar badge
```

### Badge na página de Lead e Organization

Quando `inOperationsAt != null`, exibir banner no topo da página:

```tsx
<div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
  <span className="font-semibold text-amber-800">In Operations</span>
  <span className="text-amber-700 ml-2">since {formatDate(inOperationsAt)}</span>
  <span className="text-amber-600 ml-2 text-sm">
    — automated communication activities are paused
  </span>
</div>
```

### Card no `/admin` principal

Adicionar card "Operations Transfer" com link para `/admin/operations`.

---

## Fase 4 — `additionalDealIds` na Activity (separado)

### Migration

```sql
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "additionalDealIds" TEXT;
```

### UI

- No card de atividade de uma ligação/chamada: botão "Link to another Deal"
- Modal simples com busca de deals do mesmo owner
- Selecionar deal → salva no JSON array `additionalDealIds`
- Activity aparece na timeline de todos os deals vinculados

### Testes: `tests/unit/actions/activities.test.ts` (adicionar)

```
✓ linkActivityToDeal adds dealId to additionalDealIds without removing primary dealId
✓ linkActivityToDeal prevents duplicate dealIds
✓ linkActivityToDeal throws if activity does not belong to current user
✓ getActivitiesForDeal returns activities where dealId OR additionalDealIds includes dealId
```

---

## Dependências entre fases

```
Fase 1 (Schema + Matchers) ──► Fase 2 (Action) ──► Fase 3 (UI)
Fase 4 (additionalDealIds)  ──► independente, pode ser feita em paralelo
```

---

## Status das fases

| Fase | Descrição | Status |
|---|---|---|
| 1 | Schema migration + matchers respeitam inOperationsAt (TDD) | ✅ Concluída (2026-04-13) |
| 2 | Server action: search, transfer, revert (TDD) | ✅ Concluída (2026-04-13) |
| 3 | UI admin /admin/operations + badge nas páginas | ✅ Concluída (2026-04-13) |
| 4 | additionalDealIds na Activity + UI de vínculo | ✅ Concluída (2026-04-13) |

---

## Deploy

```bash
# Fase 1+2+3 juntas (têm migration)
git add . && git commit -m "feat: operations transfer — inOperationsAt flag + admin UI" && git push
cd deploy/ansible && ansible-playbook -i inventory/production.yml playbooks/deploy-with-migrations.yml

# Fase 4 (tem migration separada)
git add . && git commit -m "feat: activity linked to multiple deals via additionalDealIds" && git push
cd deploy/ansible && ansible-playbook -i inventory/production.yml playbooks/deploy-with-migrations.yml
```
