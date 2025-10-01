# API REST - Documentação

## Autenticação

Todas as rotas da API requerem autenticação via NextAuth.js.

### Como autenticar:

1. **Login:**
```bash
POST /api/auth/callback/credentials
Content-Type: application/json

{
  "email": "admin@wbcrm.com",
  "password": "123456"
}
```

2. **As requisições seguintes usarão cookies automaticamente** (mesma sessão do navegador)

## Base URL

```
Local: http://localhost:3000/api
```

---

## Contatos

### Listar todos os contatos

```http
GET /api/contacts
GET /api/contacts?search=termo
```

**Query Parameters:**
- `search` (opcional): Busca por nome ou email

**Resposta de sucesso (200):**
```json
[
  {
    "id": "clxxx123",
    "name": "João Silva",
    "email": "joao@example.com",
    "phone": "11999999999",
    "organizationId": "clxxx456",
    "organization": {
      "id": "clxxx456",
      "name": "Empresa XYZ"
    },
    "ownerId": "clxxx789",
    "createdAt": "2025-10-01T12:00:00.000Z",
    "updatedAt": "2025-10-01T12:00:00.000Z"
  }
]
```

### Buscar contato por ID

```http
GET /api/contacts/:id
```

**Resposta de sucesso (200):**
```json
{
  "id": "clxxx123",
  "name": "João Silva",
  "email": "joao@example.com",
  "phone": "11999999999",
  "organizationId": "clxxx456",
  "organization": {
    "id": "clxxx456",
    "name": "Empresa XYZ",
    "domain": "empresa.com",
    "phone": "1133333333",
    "address": "Rua ABC, 123"
  },
  "deals": [],
  "activities": [],
  "ownerId": "clxxx789",
  "createdAt": "2025-10-01T12:00:00.000Z",
  "updatedAt": "2025-10-01T12:00:00.000Z"
}
```

### Criar contato

```http
POST /api/contacts
Content-Type: application/json

{
  "name": "João Silva",
  "email": "joao@example.com",
  "phone": "11999999999",
  "organizationId": "clxxx456"  // opcional
}
```

**Resposta de sucesso (201):**
```json
{
  "id": "clxxx123",
  "name": "João Silva",
  "email": "joao@example.com",
  "phone": "11999999999",
  "organizationId": "clxxx456",
  "organization": {
    "id": "clxxx456",
    "name": "Empresa XYZ"
  },
  "ownerId": "clxxx789",
  "createdAt": "2025-10-01T12:00:00.000Z",
  "updatedAt": "2025-10-01T12:00:00.000Z"
}
```

### Atualizar contato

```http
PUT /api/contacts/:id
Content-Type: application/json

{
  "name": "João Silva Atualizado",
  "email": "joao.novo@example.com",
  "phone": "11888888888",
  "organizationId": "clxxx999"
}
```

**Resposta de sucesso (200):**
```json
{
  "id": "clxxx123",
  "name": "João Silva Atualizado",
  "email": "joao.novo@example.com",
  "phone": "11888888888",
  "organizationId": "clxxx999",
  "organization": {
    "id": "clxxx999",
    "name": "Nova Empresa"
  },
  "ownerId": "clxxx789",
  "createdAt": "2025-10-01T12:00:00.000Z",
  "updatedAt": "2025-10-01T13:00:00.000Z"
}
```

### Excluir contato

```http
DELETE /api/contacts/:id
```

**Resposta de sucesso (200):**
```json
{
  "message": "Contato excluído com sucesso"
}
```

---

## Organizações

### Listar todas as organizações

```http
GET /api/organizations
GET /api/organizations?search=termo
```

**Query Parameters:**
- `search` (opcional): Busca por nome ou domínio

**Resposta de sucesso (200):**
```json
[
  {
    "id": "clxxx456",
    "name": "Empresa XYZ",
    "domain": "empresa.com",
    "phone": "1133333333",
    "address": "Rua ABC, 123",
    "ownerId": "clxxx789",
    "_count": {
      "contacts": 5,
      "deals": 3
    },
    "createdAt": "2025-10-01T12:00:00.000Z",
    "updatedAt": "2025-10-01T12:00:00.000Z"
  }
]
```

### Buscar organização por ID

```http
GET /api/organizations/:id
```

**Resposta de sucesso (200):**
```json
{
  "id": "clxxx456",
  "name": "Empresa XYZ",
  "domain": "empresa.com",
  "phone": "1133333333",
  "address": "Rua ABC, 123",
  "ownerId": "clxxx789",
  "contacts": [
    {
      "id": "clxxx123",
      "name": "João Silva",
      "email": "joao@example.com",
      "phone": "11999999999"
    }
  ],
  "deals": [],
  "_count": {
    "contacts": 1,
    "deals": 0
  },
  "createdAt": "2025-10-01T12:00:00.000Z",
  "updatedAt": "2025-10-01T12:00:00.000Z"
}
```

### Criar organização

```http
POST /api/organizations
Content-Type: application/json

{
  "name": "Empresa XYZ",
  "domain": "empresa.com",
  "phone": "1133333333",
  "address": "Rua ABC, 123"
}
```

**Resposta de sucesso (201):**
```json
{
  "id": "clxxx456",
  "name": "Empresa XYZ",
  "domain": "empresa.com",
  "phone": "1133333333",
  "address": "Rua ABC, 123",
  "ownerId": "clxxx789",
  "_count": {
    "contacts": 0,
    "deals": 0
  },
  "createdAt": "2025-10-01T12:00:00.000Z",
  "updatedAt": "2025-10-01T12:00:00.000Z"
}
```

### Atualizar organização

```http
PUT /api/organizations/:id
Content-Type: application/json

{
  "name": "Empresa XYZ Atualizada",
  "domain": "empresa-nova.com",
  "phone": "1144444444",
  "address": "Rua XYZ, 456"
}
```

**Resposta de sucesso (200):**
```json
{
  "id": "clxxx456",
  "name": "Empresa XYZ Atualizada",
  "domain": "empresa-nova.com",
  "phone": "1144444444",
  "address": "Rua XYZ, 456",
  "ownerId": "clxxx789",
  "_count": {
    "contacts": 5,
    "deals": 3
  },
  "createdAt": "2025-10-01T12:00:00.000Z",
  "updatedAt": "2025-10-01T13:00:00.000Z"
}
```

### Excluir organização

```http
DELETE /api/organizations/:id
```

**Resposta de sucesso (200):**
```json
{
  "message": "Organização excluída com sucesso"
}
```

---

## Códigos de Erro

- `401 Unauthorized`: Não autenticado
- `404 Not Found`: Recurso não encontrado
- `400 Bad Request`: Dados inválidos
- `500 Internal Server Error`: Erro no servidor

---

## Exemplo de uso com fetch (JavaScript)

```javascript
// Listar contatos
const response = await fetch('http://localhost:3000/api/contacts', {
  credentials: 'include' // importante para enviar cookies
});
const contacts = await response.json();

// Criar contato
const response = await fetch('http://localhost:3000/api/contacts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  credentials: 'include',
  body: JSON.stringify({
    name: 'João Silva',
    email: 'joao@example.com',
    phone: '11999999999'
  })
});
const newContact = await response.json();

// Atualizar contato
const response = await fetch('http://localhost:3000/api/contacts/clxxx123', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json'
  },
  credentials: 'include',
  body: JSON.stringify({
    name: 'João Silva Atualizado'
  })
});
const updatedContact = await response.json();

// Excluir contato
const response = await fetch('http://localhost:3000/api/contacts/clxxx123', {
  method: 'DELETE',
  credentials: 'include'
});
const result = await response.json();
```

## Exemplo de uso com cURL

```bash
# Login
curl -X POST http://localhost:3000/api/auth/callback/credentials \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@wbcrm.com","password":"123456"}' \
  -c cookies.txt

# Listar contatos (usando cookies da sessão)
curl http://localhost:3000/api/contacts \
  -b cookies.txt

# Criar contato
curl -X POST http://localhost:3000/api/contacts \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"name":"João Silva","email":"joao@example.com"}'

# Buscar contato específico
curl http://localhost:3000/api/contacts/clxxx123 \
  -b cookies.txt

# Atualizar contato
curl -X PUT http://localhost:3000/api/contacts/clxxx123 \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"name":"João Silva Atualizado"}'

# Excluir contato
curl -X DELETE http://localhost:3000/api/contacts/clxxx123 \
  -b cookies.txt
```
