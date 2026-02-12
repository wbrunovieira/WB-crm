# WB-CRM API - Documentação de Rotas (ICPs)

**Base URL:** `http://localhost:3000/api` (interno no servidor)

**Autenticação:** Todas as rotas requerem sessão autenticada via NextAuth.

---

## ICPs (Ideal Customer Profile)

ICPs são perfis de cliente ideal que podem ser vinculados a Leads e Organizations para categorização e qualificação.

---

### GET /api/icps
Lista todos os ICPs do usuário.

**Query Parameters:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `status` | string | Filtrar: `draft`, `active`, `archived` |
| `search` | string | Busca por nome ou conteúdo |

**Response 200:**
```json
[
  {
    "id": "cuid...",
    "name": "Startup de Tech",
    "slug": "startup-de-tech",
    "content": "# Descrição do ICP\n\nTexto rico com markdown...",
    "status": "active",
    "ownerId": "user-id",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-15T00:00:00.000Z",
    "owner": {
      "id": "user-id",
      "name": "Nome do Usuário"
    },
    "_count": {
      "leads": 15,
      "organizations": 5,
      "versions": 3
    }
  }
]
```

---

### GET /api/icps/{id}
Busca um ICP específico com todos os detalhes.

**Path Parameters:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | string | ID do ICP (CUID) |

**Response 200:**
```json
{
  "id": "cuid...",
  "name": "Startup de Tech",
  "slug": "startup-de-tech",
  "content": "# Perfil de Cliente Ideal\n\n## Características\n- Empresa de tecnologia\n- 10-50 funcionários\n- Faturamento R$ 1M - 10M\n\n## Dores Principais\n- Fragmentação de ferramentas\n- Dificuldade de escala\n\n## Gatilhos de Compra\n- Rodada de investimento\n- Contratação de novo CTO",
  "status": "active",
  "ownerId": "user-id",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-15T00:00:00.000Z",
  "owner": {
    "id": "user-id",
    "name": "Nome do Usuário",
    "email": "user@example.com"
  },
  "_count": {
    "leads": 15,
    "organizations": 5,
    "versions": 3
  },
  "leads": [
    {
      "id": "lead-icp-id",
      "leadId": "lead-id",
      "icpId": "icp-id",
      "matchScore": 85,
      "notes": "Bom fit - empresa em crescimento",
      "icpFitStatus": "ideal",
      "realDecisionMaker": "founder_ceo",
      "perceivedUrgency": ["current_need"],
      "businessMoment": ["growth"],
      "currentPlatforms": ["scattered_tools"],
      "fragmentationLevel": 7,
      "mainDeclaredPain": "operational_fragmentation",
      "strategicDesire": "unify_operation",
      "perceivedTechnicalComplexity": 3,
      "purchaseTrigger": "Acabou de receber investimento Serie A",
      "estimatedDecisionTime": "2_to_4_weeks",
      "expansionPotential": 4,
      "createdAt": "2024-01-10T00:00:00.000Z",
      "lead": {
        "id": "lead-id",
        "businessName": "TechStartup LTDA",
        "status": "qualified",
        "quality": "hot"
      }
    }
  ],
  "organizations": [
    {
      "id": "org-icp-id",
      "organizationId": "org-id",
      "icpId": "icp-id",
      "matchScore": 90,
      "notes": "Cliente ideal - já convertido",
      "createdAt": "2024-01-05T00:00:00.000Z",
      "organization": {
        "id": "org-id",
        "name": "Empresa Convertida LTDA"
      }
    }
  ],
  "versions": [
    {
      "id": "version-id",
      "icpId": "icp-id",
      "versionNumber": 3,
      "name": "Startup de Tech",
      "content": "...",
      "status": "active",
      "changedBy": "user-id",
      "changeReason": "Ajuste nos critérios de faturamento",
      "createdAt": "2024-01-15T00:00:00.000Z",
      "user": {
        "id": "user-id",
        "name": "Nome do Usuário"
      }
    },
    {
      "id": "version-id-2",
      "versionNumber": 2,
      "...": "..."
    }
  ]
}
```

**Response 404:**
```json
{
  "error": "ICP não encontrado"
}
```

---

## Códigos de Resposta

| Código | Descrição |
|--------|-----------|
| 200 | Sucesso |
| 401 | Não autorizado |
| 404 | Não encontrado |
| 500 | Erro interno |

---

## Campos do ICP

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | string | ID único (CUID) |
| `name` | string | Nome do ICP (2-100 chars) |
| `slug` | string | Slug URL-friendly (único) |
| `content` | string | Descrição completa (suporta Markdown) |
| `status` | enum | `draft` \| `active` \| `archived` |
| `ownerId` | string | ID do proprietário |
| `createdAt` | datetime | Data de criação |
| `updatedAt` | datetime | Data da última atualização |

---

## Campos do LeadICP (Vínculo Lead ↔ ICP)

### Campos Básicos
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | string | ID do vínculo |
| `leadId` | string | ID do Lead |
| `icpId` | string | ID do ICP |
| `matchScore` | number | Score de fit (0-100) |
| `notes` | string | Observações |

### Campos Essenciais
| Campo | Tipo | Valores |
|-------|------|---------|
| `icpFitStatus` | enum | `ideal`, `partial`, `out_of_icp` |
| `realDecisionMaker` | enum | `founder_ceo`, `tech_partner`, `commercial_partner`, `other` |
| `realDecisionMakerOther` | string | Especificar se "other" |
| `perceivedUrgency` | array | `curiosity`, `interest`, `future_need`, `current_need`, `active_pain` |
| `businessMoment` | array | `validation`, `growth`, `scale`, `consolidation` |

### Campos Específicos
| Campo | Tipo | Valores/Descrição |
|-------|------|-------------------|
| `currentPlatforms` | array | `hotmart`, `cademi`, `moodle`, `own_lms`, `scattered_tools`, `other` |
| `fragmentationLevel` | number | Nível de fragmentação (0-10) |
| `mainDeclaredPain` | enum | `student_experience`, `operational_fragmentation`, `lack_of_identity`, `growth_limitation`, `founder_emotional_pain` |
| `strategicDesire` | enum | `total_control`, `own_identity`, `scale_without_chaos`, `unify_operation`, `market_differentiation` |
| `perceivedTechnicalComplexity` | number | Complexidade percebida (1-5) |

### Campos Estratégicos
| Campo | Tipo | Valores/Descrição |
|-------|------|-------------------|
| `purchaseTrigger` | string | Gatilho de compra (texto livre, max 500 chars) |
| `nonClosingReason` | enum | `priority_changed`, `budget`, `timing`, `internal_decision`, `not_icp`, `other` |
| `estimatedDecisionTime` | enum | `less_than_2_weeks`, `2_to_4_weeks`, `1_to_2_months`, `3_plus_months` |
| `expansionPotential` | number | Potencial de expansão (1-5) |

---

## Exemplo: Buscar ICP com detalhes

```bash
# Listar todos ICPs ativos
curl -X GET "http://localhost:3000/api/icps?status=active" \
  -H "Cookie: next-auth.session-token=..."

# Buscar ICP específico
curl -X GET "http://localhost:3000/api/icps/cm123abc..." \
  -H "Cookie: next-auth.session-token=..."
```

---

## Versionamento

O sistema mantém histórico de versões de cada ICP. Cada alteração cria uma nova versão com:
- `versionNumber`: Número incremental da versão
- `name`, `content`, `status`: Snapshot dos dados no momento da alteração
- `changedBy`: ID do usuário que fez a alteração
- `changeReason`: Motivo da alteração (opcional)

As últimas 10 versões são retornadas na consulta por ID.
