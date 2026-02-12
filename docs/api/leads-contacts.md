# WB-CRM API - Documentação de Rotas (Leads e Contatos)

**Base URL:** `http://localhost:3000/api` (interno no servidor)

**Autenticação:** Todas as rotas requerem sessão autenticada via NextAuth. Para uso externo, você precisará passar cookies de sessão ou implementar autenticação via token.

---

## 1. LEADS

### GET /api/leads
Lista todos os leads do usuário.

**Query Parameters:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `search` | string | Busca por businessName, registeredName ou email |
| `status` | string | Filtrar: `new`, `contacted`, `qualified`, `disqualified` |
| `quality` | string | Filtrar: `cold`, `warm`, `hot` |

**Response 200:**
```json
[
  {
    "id": "cuid...",
    "businessName": "Empresa LTDA",
    "registeredName": "Razão Social",
    "email": "contato@empresa.com",
    "phone": "+5511999999999",
    "status": "new",
    "quality": "hot",
    "leadContacts": [...],
    "owner": { "id": "...", "name": "..." },
    "labels": [...],
    "_count": { "leadContacts": 2, "activities": 5 }
  }
]
```

---

### POST /api/leads
Cria um novo lead.

**Request Body:**
```json
{
  "businessName": "Empresa LTDA",          // OBRIGATÓRIO (min 2 chars)
  "registeredName": "Razão Social",        // opcional
  "foundationDate": "2020-01-15",          // opcional (ISO date string)
  "companyRegistrationID": "12.345.678/0001-90", // CNPJ
  "address": "Rua Example, 123",
  "city": "São Paulo",
  "state": "SP",
  "country": "Brasil",
  "zipCode": "01234-567",
  "phone": "+5511999999999",
  "whatsapp": "+5511999999999",
  "website": "https://empresa.com",
  "email": "contato@empresa.com",
  "instagram": "@empresa",
  "linkedin": "company/empresa",
  "facebook": "empresa",
  "twitter": "@empresa",
  "tiktok": "@empresa",
  "companyOwner": "João Silva",
  "companySize": "Médio Porte",
  "revenue": 5000000,
  "employeesCount": 50,
  "description": "Descrição da empresa",
  "source": "Google Places",
  "quality": "hot",                        // cold | warm | hot
  "status": "new"                          // new | contacted | qualified | disqualified
}
```

**Response 201:** Lead criado com seus dados completos.

---

### GET /api/leads/{id}
Busca um lead específico com todos os detalhes.

**Response 200:**
```json
{
  "id": "cuid...",
  "businessName": "Empresa LTDA",
  "leadContacts": [
    {
      "id": "...",
      "name": "João Silva",
      "role": "CEO",
      "email": "joao@empresa.com",
      "phone": "+5511988888888",
      "whatsapp": "+5511988888888",
      "linkedin": "in/joaosilva",
      "instagram": "@joaosilva",
      "isPrimary": true
    }
  ],
  "activities": [...],
  "labels": [...],
  "primaryCNAE": {...},
  "convertedOrganization": null,
  "owner": { "id": "...", "name": "...", "email": "..." }
}
```

---

### PUT /api/leads/{id}
Atualiza um lead existente.

**Request Body:** Mesmos campos do POST (todos opcionais exceto businessName).

**Response 200:** Lead atualizado.

---

### DELETE /api/leads/{id}
Exclui um lead.

**Response 200:** `{ "message": "Lead excluído com sucesso" }`

**Response 409:** Lead já convertido não pode ser excluído.

---

## 2. LEAD CONTACTS (Contatos do Lead)

### GET /api/leads/{id}/contacts
Lista todos os contatos de um lead.

**Response 200:**
```json
[
  {
    "id": "...",
    "leadId": "...",
    "name": "João Silva",
    "role": "CEO",
    "email": "joao@empresa.com",
    "phone": "+5511988888888",
    "whatsapp": "+5511988888888",
    "linkedin": "in/joaosilva",
    "instagram": "@joaosilva",
    "isPrimary": true,
    "convertedToContactId": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### POST /api/leads/{id}/contacts
Cria um contato para o lead.

**Request Body:**
```json
{
  "name": "João Silva",           // OBRIGATÓRIO (min 2 chars)
  "role": "CEO",                  // opcional
  "email": "joao@empresa.com",    // opcional (válido se fornecido)
  "phone": "+5511988888888",      // opcional
  "whatsapp": "+5511988888888",   // opcional
  "linkedin": "in/joaosilva",     // opcional
  "instagram": "@joaosilva",      // opcional
  "isPrimary": true               // opcional (default: false)
}
```

**Response 201:** Contato criado.

**Nota:** Se `isPrimary: true`, outros contatos do lead são desmarcados como primário automaticamente.

---

### GET /api/leads/{id}/contacts/{contactId}
Busca um contato específico do lead.

**Response 200:** Objeto do contato.

---

### PUT /api/leads/{id}/contacts/{contactId}
Atualiza um contato do lead.

**Request Body:** Mesmos campos do POST.

**Response 200:** Contato atualizado.

---

### DELETE /api/leads/{id}/contacts/{contactId}
Exclui um contato do lead.

**Response 200:** `{ "message": "Contato excluído com sucesso" }`

**Response 409:** Contato já convertido não pode ser excluído.

---

## 3. CONTACTS (Contatos Gerais - vinculados a Organization/Lead/Partner)

### GET /api/contacts
Lista contatos do usuário.

**Query Parameters:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `search` | string | Busca por name ou email |

**Response 200:** Array de contatos com organization incluída.

---

### POST /api/contacts
Cria um contato vinculado a uma entidade.

**Request Body:**
```json
{
  "name": "João Silva",                    // OBRIGATÓRIO
  "email": "joao@empresa.com",             // opcional
  "phone": "+5511999999999",               // opcional
  "companyId": "cuid-da-entidade",         // opcional
  "companyType": "lead"                    // "lead" | "organization" | "partner"
}
```

**Response 201:** Contato criado.

---

### GET /api/contacts/{id}
Busca um contato com organização, deals e atividades.

---

### PUT /api/contacts/{id}
Atualiza um contato.

---

### DELETE /api/contacts/{id}
Exclui um contato.

---

## Códigos de Resposta

| Código | Descrição |
|--------|-----------|
| 200 | Sucesso |
| 201 | Criado com sucesso |
| 400 | Dados inválidos (validação falhou) |
| 401 | Não autorizado |
| 404 | Não encontrado |
| 409 | Conflito (ex: não pode excluir lead convertido) |
| 500 | Erro interno |

---

## Exemplo: Criar Lead com Contato (2 chamadas)

```bash
# 1. Criar Lead
curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=..." \
  -d '{
    "businessName": "Nova Empresa LTDA",
    "email": "contato@novaempresa.com",
    "phone": "+5511999999999",
    "status": "new",
    "quality": "hot"
  }'

# Resposta: { "id": "cm123abc...", ... }

# 2. Criar Contato do Lead
curl -X POST http://localhost:3000/api/leads/cm123abc.../contacts \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=..." \
  -d '{
    "name": "João Silva",
    "role": "Diretor",
    "email": "joao@novaempresa.com",
    "phone": "+5511988888888",
    "whatsapp": "+5511988888888",
    "linkedin": "in/joaosilva",
    "instagram": "@joaosilva",
    "isPrimary": true
  }'
```

---

## Integração Server-to-Server

Para acesso de outro app no mesmo servidor, você pode:

1. **Compartilhar sessão de autenticação** - Passar cookies de sessão
2. **Criar rota interna com token fixo** - Implementar middleware de autenticação por API key para comunicação server-to-server
3. **Usar Prisma Client diretamente** - Se ambos apps acessam o mesmo banco de dados, importar o Prisma Client diretamente

### Exemplo com API Key (recomendado para server-to-server)

Para implementar autenticação via API key, adicione um middleware que verifica o header `X-API-Key`:

```typescript
// Verificar no início da rota
const apiKey = request.headers.get("X-API-Key");
if (apiKey === process.env.INTERNAL_API_KEY) {
  // Prosseguir com userId fixo ou do header X-User-Id
}
```

---

## Campos Completos do Lead

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `businessName` | string | Nome comercial (OBRIGATÓRIO) |
| `registeredName` | string | Razão social |
| `foundationDate` | date | Data de fundação |
| `companyRegistrationID` | string | CNPJ |
| `address` | string | Endereço |
| `city` | string | Cidade |
| `state` | string | Estado (UF) |
| `country` | string | País |
| `zipCode` | string | CEP |
| `vicinity` | string | Bairro/Região |
| `phone` | string | Telefone |
| `whatsapp` | string | WhatsApp |
| `website` | string | Website |
| `email` | string | Email |
| `instagram` | string | Instagram (@usuario) |
| `linkedin` | string | LinkedIn (URL ou slug) |
| `facebook` | string | Facebook |
| `twitter` | string | Twitter |
| `tiktok` | string | TikTok |
| `companyOwner` | string | Nome do proprietário |
| `companySize` | string | Porte da empresa |
| `revenue` | number | Faturamento anual |
| `employeesCount` | number | Número de funcionários |
| `description` | string | Descrição |
| `equityCapital` | number | Capital social |
| `businessStatus` | string | Status do negócio |
| `source` | string | Origem do lead |
| `quality` | enum | `cold` \| `warm` \| `hot` |
| `status` | enum | `new` \| `contacted` \| `qualified` \| `disqualified` |
| `primaryCNAEId` | string | ID do CNAE principal |
| `internationalActivity` | string | Atividade (empresas internacionais) |

## Campos do LeadContact

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `name` | string | Nome (OBRIGATÓRIO, min 2 chars) |
| `role` | string | Cargo/função |
| `email` | string | Email |
| `phone` | string | Telefone |
| `whatsapp` | string | WhatsApp |
| `linkedin` | string | LinkedIn |
| `instagram` | string | Instagram |
| `isPrimary` | boolean | Contato principal (default: false) |
