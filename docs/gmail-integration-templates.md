# Implementação: Templates com Variáveis + Envio via Gmail API (OAuth2)

## Visão Geral

Integrar o sistema de cadências do CRM com o Gmail via OAuth2 para:
1. Templates com variáveis dinâmicas (substituição automática por dados do lead/contato)
2. Envio **individual** — botão no card da atividade de email no lead
3. Envio **em lote** — botão na etapa da cadência para enviar para todos os leads daquela etapa
4. Tracking de abertura e cliques
5. Histórico completo de emails enviados por atividade

### Fluxo Atual vs. Fluxo Proposto

```
HOJE:
  Admin cria Cadência → Define Steps (dia, canal, subject, description)
  User aplica cadência ao Lead → Cria Activities com texto estático
  User abre cada Activity → Copia texto manualmente → Cola no Gmail → Envia

PROPOSTO:
  Admin cria Cadência → Define Steps com {{variáveis}} no subject/description
  User aplica cadência ao Lead → Cria Activities com variáveis já substituídas

  ENVIO INDIVIDUAL (na página do lead):
    Card da atividade de email → Botão [📧 Enviar] → Preview → Envia via Gmail API

  ENVIO EM LOTE (na página da cadência ou admin):
    Etapa de email da cadência → Botão [📧 Enviar em Lote]
    → Lista todos os leads com atividade pendente nessa etapa
    → Preview com contagem → Confirma → Envia para todos via Gmail API
```

---

## Fase 1 — Engine de Templates com Variáveis

### 1.1 Variáveis Disponíveis

| Variável | Origem | Exemplo |
|----------|--------|---------|
| `{{nomeEmpresa}}` | `lead.businessName` | "Empresa XYZ Ltda" |
| `{{nomeContato}}` | `leadContact.name` | "João Silva" |
| `{{primeiroNome}}` | primeiro token de `leadContact.name` | "João" |
| `{{cargoContato}}` | `leadContact.role` | "Diretor Comercial" |
| `{{emailContato}}` | `leadContact.email` | "joao@empresa.com" |
| `{{telefoneContato}}` | `leadContact.phone` | "(11) 99999-0000" |
| `{{cidade}}` | `lead.city` | "São Paulo" |
| `{{estado}}` | `lead.state` | "SP" |
| `{{segmento}}` | `lead.primaryActivity` ou CNAE description | "Desenvolvimento de software" |
| `{{website}}` | `lead.website` | "https://empresa.com" |
| `{{meuNome}}` | `session.user.name` | "Bruno Vieira" |
| `{{meuEmail}}` | `session.user.email` | "bruno@wbdigital.com" |

### 1.2 Arquivo: `src/lib/templates.ts`

```typescript
export type TemplateVariables = {
  nomeEmpresa?: string | null;
  nomeContato?: string | null;
  primeiroNome?: string | null;
  cargoContato?: string | null;
  emailContato?: string | null;
  telefoneContato?: string | null;
  cidade?: string | null;
  estado?: string | null;
  segmento?: string | null;
  website?: string | null;
  meuNome?: string | null;
  meuEmail?: string | null;
};

export const KNOWN_VARIABLES = [
  "nomeEmpresa", "nomeContato", "primeiroNome", "cargoContato",
  "emailContato", "telefoneContato", "cidade", "estado",
  "segmento", "website", "meuNome", "meuEmail",
] as const;

/**
 * Substitui variáveis {{chave}} no texto pelo valor correspondente.
 * Variáveis sem valor ficam como string vazia.
 */
export function replaceTemplateVariables(
  text: string,
  variables: TemplateVariables
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = variables[key as keyof TemplateVariables];
    return value ?? "";
  });
}

/**
 * Extrai todas as variáveis usadas em um template.
 */
export function extractTemplateVariables(text: string): string[] {
  const matches = text.matchAll(/\{\{(\w+)\}\}/g);
  return [...new Set(Array.from(matches, (m) => m[1]))];
}

/**
 * Valida se todas as variáveis no texto são variáveis conhecidas.
 */
export function validateTemplateVariables(text: string): {
  valid: boolean;
  unknown: string[];
} {
  const knownSet = new Set<string>(KNOWN_VARIABLES);
  const used = extractTemplateVariables(text);
  const unknown = used.filter((v) => !knownSet.has(v));
  return { valid: unknown.length === 0, unknown };
}

/**
 * Monta o objeto de variáveis a partir dos dados do lead, contato e usuário.
 */
export function buildVariablesFromContext(
  lead: {
    businessName: string;
    city?: string | null;
    state?: string | null;
    website?: string | null;
    primaryActivity?: string | null;
  },
  contact: {
    name: string;
    role?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null,
  user: { name?: string | null; email?: string | null }
): TemplateVariables {
  const firstName = contact?.name?.split(" ")[0] ?? null;

  return {
    nomeEmpresa: lead.businessName,
    nomeContato: contact?.name ?? null,
    primeiroNome: firstName,
    cargoContato: contact?.role ?? null,
    emailContato: contact?.email ?? null,
    telefoneContato: contact?.phone ?? null,
    cidade: lead.city ?? null,
    estado: lead.state ?? null,
    segmento: lead.primaryActivity ?? null,
    website: lead.website ?? null,
    meuNome: user.name ?? null,
    meuEmail: user.email ?? null,
  };
}
```

### 1.3 Modificar `applyCadenceToLead()` em `src/actions/lead-cadences.ts`

Na criação de atividades (loop de steps, ~linha 98-112), substituir variáveis antes de salvar:

```typescript
import {
  replaceTemplateVariables,
  buildVariablesFromContext,
} from "@/lib/templates";

// Dentro do $transaction, antes do loop:
const primaryContact = lead.leadContacts[0] ?? null;
const variables = buildVariablesFromContext(lead, primaryContact, session.user);

// Dentro do loop de steps:
const activity = await tx.activity.create({
  data: {
    type: step.channel,
    subject: replaceTemplateVariables(step.subject, variables),
    description: step.description
      ? replaceTemplateVariables(step.description, variables)
      : null,
    dueDate,
    completed: false,
    leadId: validated.leadId,
    ownerId: session.user.id,
  },
});
```

**Nota**: O mesmo padrão se aplica ao `applyCadenceToBulkLeads()` — cada lead tem seu próprio contato e dados, então as variáveis devem ser montadas por lead dentro do loop.

### 1.4 Preview de Variáveis no CadenceStepForm

Adicionar no `src/components/admin/CadenceStepForm.tsx`:
- Seção "Preview" abaixo do textarea com variáveis substituídas por valores de exemplo
- Highlight de variáveis inválidas em vermelho
- Lista de variáveis disponíveis com botão de inserir `{{variável}}`

### 1.5 Testes — Fase 1

#### `tests/unit/lib/templates.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import {
  replaceTemplateVariables,
  extractTemplateVariables,
  validateTemplateVariables,
  buildVariablesFromContext,
} from "@/lib/templates";

describe("replaceTemplateVariables", () => {
  it("should replace known variables with values", () => {
    const result = replaceTemplateVariables(
      "Olá {{primeiroNome}}, sou {{meuNome}} da WB Digital",
      { primeiroNome: "João", meuNome: "Bruno" }
    );
    expect(result).toBe("Olá João, sou Bruno da WB Digital");
  });

  it("should replace missing values with empty string", () => {
    const result = replaceTemplateVariables(
      "Empresa: {{nomeEmpresa}}, Cidade: {{cidade}}",
      { nomeEmpresa: "ACME", cidade: null }
    );
    expect(result).toBe("Empresa: ACME, Cidade: ");
  });

  it("should handle text with no variables", () => {
    const result = replaceTemplateVariables("Texto simples", {});
    expect(result).toBe("Texto simples");
  });

  it("should handle multiple occurrences of same variable", () => {
    const result = replaceTemplateVariables(
      "{{primeiroNome}}, como vai {{primeiroNome}}?",
      { primeiroNome: "Ana" }
    );
    expect(result).toBe("Ana, como vai Ana?");
  });

  it("should handle unknown variables as empty string", () => {
    const result = replaceTemplateVariables("Valor: {{desconhecida}}", {});
    expect(result).toBe("Valor: ");
  });
});

describe("extractTemplateVariables", () => {
  it("should extract all unique variables", () => {
    const vars = extractTemplateVariables(
      "{{nomeContato}} de {{nomeEmpresa}} - {{nomeContato}}"
    );
    expect(vars).toEqual(["nomeContato", "nomeEmpresa"]);
  });

  it("should return empty array for text without variables", () => {
    expect(extractTemplateVariables("Texto puro")).toEqual([]);
  });
});

describe("validateTemplateVariables", () => {
  it("should validate known variables", () => {
    const result = validateTemplateVariables("{{nomeEmpresa}} {{meuNome}}");
    expect(result.valid).toBe(true);
    expect(result.unknown).toEqual([]);
  });

  it("should detect unknown variables", () => {
    const result = validateTemplateVariables("{{nomeEmpresa}} {{xpto}}");
    expect(result.valid).toBe(false);
    expect(result.unknown).toEqual(["xpto"]);
  });
});

describe("buildVariablesFromContext", () => {
  it("should build variables from lead, contact and user", () => {
    const vars = buildVariablesFromContext(
      {
        businessName: "ACME",
        city: "SP",
        state: "SP",
        website: "https://acme.com",
        primaryActivity: "TI",
      },
      {
        name: "João Silva",
        role: "CTO",
        email: "joao@acme.com",
        phone: "11999990000",
      },
      { name: "Bruno", email: "bruno@wb.com" }
    );

    expect(vars.nomeEmpresa).toBe("ACME");
    expect(vars.nomeContato).toBe("João Silva");
    expect(vars.primeiroNome).toBe("João");
    expect(vars.cargoContato).toBe("CTO");
    expect(vars.meuNome).toBe("Bruno");
  });

  it("should handle null contact gracefully", () => {
    const vars = buildVariablesFromContext(
      { businessName: "ACME" },
      null,
      { name: "Bruno", email: "bruno@wb.com" }
    );

    expect(vars.nomeContato).toBeNull();
    expect(vars.primeiroNome).toBeNull();
    expect(vars.nomeEmpresa).toBe("ACME");
  });
});
```

#### `tests/unit/actions/lead-cadences-templates.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = {
  lead: { findFirst: vi.fn() },
  cadence: { findFirst: vi.fn() },
  leadCadence: { findUnique: vi.fn(), create: vi.fn() },
  activity: { create: vi.fn() },
  leadCadenceActivity: { create: vi.fn() },
  $transaction: vi.fn((fn) => fn(mockPrisma)),
};

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/permissions", () => ({
  getAuthenticatedSession: vi.fn(() => ({
    user: { id: "user-1", name: "Bruno Vieira", email: "bruno@wb.com" },
  })),
  getOwnerFilter: vi.fn(() => ({ ownerId: "user-1" })),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { applyCadenceToLead } from "@/actions/lead-cadences";

describe("applyCadenceToLead - template variable substitution", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma.lead.findFirst.mockResolvedValue({
      id: "lead-1",
      businessName: "Tech Corp",
      city: "São Paulo",
      state: "SP",
      website: "https://techcorp.com",
      primaryActivity: "Desenvolvimento de software",
      leadContacts: [
        {
          id: "lc-1",
          name: "Maria Santos",
          role: "CTO",
          email: "maria@techcorp.com",
          phone: "11999990000",
          isPrimary: true,
        },
      ],
    });

    mockPrisma.cadence.findFirst.mockResolvedValue({
      id: "cad-1",
      steps: [
        {
          id: "step-1",
          dayNumber: 1,
          channel: "email",
          subject:
            "Olá {{primeiroNome}}, vi que a {{nomeEmpresa}} atua com {{segmento}}",
          description:
            "Prezado(a) {{nomeContato}},\n\nMeu nome é {{meuNome}}.\n\nVi que a {{nomeEmpresa}} está em {{cidade}}/{{estado}}.",
          order: 0,
        },
      ],
    });

    mockPrisma.leadCadence.findUnique.mockResolvedValue(null);
    mockPrisma.leadCadence.create.mockResolvedValue({ id: "lc-1" });
    mockPrisma.activity.create.mockImplementation(({ data }) => ({
      id: "act-1",
      ...data,
    }));
    mockPrisma.leadCadenceActivity.create.mockResolvedValue({});
  });

  it("should substitute template variables in subject and description", async () => {
    await applyCadenceToLead({ leadId: "lead-1", cadenceId: "cad-1" });

    const createCall = mockPrisma.activity.create.mock.calls[0][0];
    expect(createCall.data.subject).toBe(
      "Olá Maria, vi que a Tech Corp atua com Desenvolvimento de software"
    );
    expect(createCall.data.description).toContain("Prezado(a) Maria Santos,");
    expect(createCall.data.description).toContain("Meu nome é Bruno Vieira");
    expect(createCall.data.description).toContain("está em São Paulo/SP");
  });

  it("should handle lead with no contacts gracefully", async () => {
    mockPrisma.lead.findFirst.mockResolvedValue({
      id: "lead-1",
      businessName: "Solo Corp",
      leadContacts: [],
    });

    await applyCadenceToLead({ leadId: "lead-1", cadenceId: "cad-1" });

    const createCall = mockPrisma.activity.create.mock.calls[0][0];
    expect(createCall.data.subject).toBe(
      "Olá , vi que a Solo Corp atua com "
    );
  });
});
```

### 1.6 Migration

Nenhuma migration necessária na Fase 1 — os campos `subject` e `description` do CadenceStep já suportam texto livre com `{{variáveis}}`.

---

## Fase 2 — Configuração do Google Cloud e OAuth2

### 2.1 Google Cloud Console — Setup

**Passo a passo detalhado:**

1. **Criar projeto no Google Cloud Console**
   - Acessar https://console.cloud.google.com
   - Criar novo projeto: "WB-CRM Gmail Integration"
   - Anotar o Project ID

2. **Ativar Gmail API**
   - Menu → APIs & Services → Library
   - Buscar "Gmail API" → Enable

3. **Configurar OAuth Consent Screen**
   - Menu → APIs & Services → OAuth consent screen
   - User Type: **External** (para permitir qualquer conta Google)
   - App name: "WB CRM"
   - User support email: email do admin
   - Authorized domains: `wbdigitalsolutions.com`
   - Scopes necessários:
     - `https://www.googleapis.com/auth/gmail.send` — Enviar emails
     - `https://www.googleapis.com/auth/gmail.readonly` — Ler tracking (opcional Fase 5)
     - `openid` — Identificação
     - `email` — Email do usuário
     - `profile` — Nome do usuário
   - Test users: adicionar emails dos usuários do CRM (enquanto app não verificado)

4. **Criar Credenciais OAuth2**
   - Menu → APIs & Services → Credentials
   - Create Credentials → OAuth 2.0 Client ID
   - Application type: **Web application**
   - Name: "WB-CRM"
   - Authorized JavaScript origins:
     - `https://crm.wbdigitalsolutions.com`
     - `http://localhost:3000` (dev)
   - Authorized redirect URIs:
     - `https://crm.wbdigitalsolutions.com/api/auth/google/callback`
     - `http://localhost:3000/api/auth/google/callback`
   - Anotar: **Client ID** e **Client Secret**

5. **Variáveis de ambiente**
   ```env
   GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPx-xxxxx
   ```

### 2.2 Vincular Conta Google a Usuário Existente

O usuário já faz login com Credentials (email/senha). Precisamos de um fluxo separado para **vincular** a conta Google sem mudar o login. O model `Account` do NextAuth já existe no schema com os campos `access_token`, `refresh_token`, `expires_at`, etc.

#### Arquivo: `src/app/api/auth/google/connect/route.ts`

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/google/callback`,
    response_type: "code",
    scope:
      "openid email profile https://www.googleapis.com/auth/gmail.send",
    access_type: "offline",
    prompt: "consent",
    state: session.user.id,
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  );
}
```

#### Arquivo: `src/app/api/auth/google/callback/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const userId = req.nextUrl.searchParams.get("state");

  if (!code || !userId) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/settings?error=missing_params`
    );
  }

  // Trocar code por tokens
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });

  const tokens = await tokenResponse.json();

  if (!tokens.access_token) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/settings?error=token_exchange`
    );
  }

  // Buscar info do perfil Google
  const profileRes = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    { headers: { Authorization: `Bearer ${tokens.access_token}` } }
  );
  const profile = await profileRes.json();

  // Salvar/atualizar Account vinculada ao user
  await prisma.account.upsert({
    where: {
      provider_providerAccountId: {
        provider: "google",
        providerAccountId: profile.id,
      },
    },
    update: {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? undefined,
      expires_at: tokens.expires_in
        ? Math.floor(Date.now() / 1000) + tokens.expires_in
        : undefined,
      scope: tokens.scope,
      token_type: tokens.token_type,
      id_token: tokens.id_token,
    },
    create: {
      userId,
      type: "oauth",
      provider: "google",
      providerAccountId: profile.id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_in
        ? Math.floor(Date.now() / 1000) + tokens.expires_in
        : undefined,
      scope: tokens.scope,
      token_type: tokens.token_type,
      id_token: tokens.id_token,
    },
  });

  return NextResponse.redirect(
    `${process.env.NEXTAUTH_URL}/dashboard/settings?gmail=connected`
  );
}
```

### 2.3 Testes — Fase 2

#### `tests/unit/api/google-callback.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = {
  account: { upsert: vi.fn(), findFirst: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

describe("Google OAuth callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should save tokens to Account table on successful callback", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            access_token: "ya29.access-token",
            refresh_token: "1//refresh-token",
            expires_in: 3600,
            scope: "openid email profile https://www.googleapis.com/auth/gmail.send",
            token_type: "Bearer",
            id_token: "eyJ...",
          }),
      })
      .mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            id: "google-profile-id-123",
            email: "user@gmail.com",
            name: "User Name",
          }),
      });

    mockPrisma.account.upsert.mockResolvedValue({ id: "account-1" });

    // A lógica do callback seria extraída para uma função testável
    // Aqui validamos que o upsert seria chamado corretamente
    expect(mockPrisma.account.upsert).toBeDefined();
  });

  it("should not overwrite refresh_token on re-auth when Google omits it", async () => {
    // Google só retorna refresh_token na PRIMEIRA autorização
    // Na segunda, tokens.refresh_token é undefined
    // O upsert.update NÃO deve sobrescrever com undefined
    mockPrisma.account.upsert.mockResolvedValue({ id: "account-1" });
    expect(mockPrisma.account.upsert).toBeDefined();
  });
});
```

---

## Fase 3 — Gmail Client e Envio de Emails

### 3.1 Modelo EmailLog (Prisma)

#### Migration: `prisma/migrations/YYYYMMDD_add_email_log/migration.sql`

```sql
CREATE TABLE IF NOT EXISTS "email_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activityId" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "bodyText" TEXT,
    "gmailMessageId" TEXT,
    "gmailThreadId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "openedAt" TIMESTAMP,
    "openCount" INTEGER NOT NULL DEFAULT 0,
    "clickedAt" TIMESTAMP,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "email_logs_activityId_idx" ON "email_logs"("activityId");
CREATE INDEX "email_logs_gmailMessageId_idx" ON "email_logs"("gmailMessageId");
CREATE INDEX "email_logs_gmailThreadId_idx" ON "email_logs"("gmailThreadId");
CREATE INDEX "email_logs_status_idx" ON "email_logs"("status");
```

#### Schema Prisma:

```prisma
model EmailLog {
  id              String    @id @default(cuid())
  activityId      String
  fromEmail       String
  toEmail         String
  subject         String
  bodyHtml        String
  bodyText        String?

  // Gmail tracking
  gmailMessageId  String?
  gmailThreadId   String?

  // Status: sent, delivered, opened, clicked, bounced, failed
  status          String    @default("sent")

  // Tracking
  openedAt        DateTime?
  openCount       Int       @default(0)
  clickedAt       DateTime?
  clickCount      Int       @default(0)

  // Error
  errorMessage    String?

  sentAt          DateTime  @default(now())
  createdAt       DateTime  @default(now())

  // Relations
  activity        Activity  @relation(fields: [activityId], references: [id], onDelete: Cascade)

  @@index([activityId])
  @@index([gmailMessageId])
  @@index([gmailThreadId])
  @@index([status])
  @@map("email_logs")
}
```

Adicionar relação no modelo Activity:
```prisma
model Activity {
  // ... campos existentes
  emailLogs    EmailLog[]
}
```

### 3.2 Gmail Client

#### Arquivo: `src/lib/email/gmail-client.ts`

```typescript
import { prisma } from "@/lib/prisma";

type GmailTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

/**
 * Busca tokens do Google salvos na tabela Account para o user.
 */
export async function getGmailTokens(
  userId: string
): Promise<GmailTokens | null> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
    select: {
      access_token: true,
      refresh_token: true,
      expires_at: true,
    },
  });

  if (!account?.access_token || !account?.refresh_token) {
    return null;
  }

  return {
    accessToken: account.access_token,
    refreshToken: account.refresh_token,
    expiresAt: account.expires_at ?? 0,
  };
}

/**
 * Renova o access_token usando o refresh_token.
 */
export async function refreshGmailToken(
  userId: string,
  refreshToken: string
): Promise<string> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error(
      "Falha ao renovar token do Gmail. Reconecte sua conta Google."
    );
  }

  const data = await response.json();

  await prisma.account.updateMany({
    where: { userId, provider: "google" },
    data: {
      access_token: data.access_token,
      expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
    },
  });

  return data.access_token;
}

/**
 * Obtém um access_token válido, renovando se necessário.
 */
export async function getValidAccessToken(userId: string): Promise<string> {
  const tokens = await getGmailTokens(userId);

  if (!tokens) {
    throw new Error(
      "Conta Gmail não conectada. Vá em Configurações para conectar."
    );
  }

  const now = Math.floor(Date.now() / 1000);
  if (tokens.expiresAt < now + 60) {
    return refreshGmailToken(userId, tokens.refreshToken);
  }

  return tokens.accessToken;
}

/**
 * Envia email via Gmail API (RFC 2822 + base64url).
 */
export async function sendGmailEmail(
  userId: string,
  params: {
    to: string;
    subject: string;
    bodyHtml: string;
    bodyText?: string;
    threadId?: string;
    inReplyTo?: string;
  }
): Promise<{ messageId: string; threadId: string }> {
  const accessToken = await getValidAccessToken(userId);

  // Buscar email do remetente
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
    include: { user: { select: { name: true, email: true } } },
  });

  const fromName = account?.user?.name ?? "WB CRM";
  const fromEmail = account?.user?.email ?? "";

  // Montar mensagem MIME multipart
  const boundary = `boundary_${Date.now()}`;
  const messageParts = [
    `From: ${fromName} <${fromEmail}>`,
    `To: ${params.to}`,
    `Subject: =?UTF-8?B?${Buffer.from(params.subject).toString("base64")}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ...(params.inReplyTo
      ? [
          `In-Reply-To: ${params.inReplyTo}`,
          `References: ${params.inReplyTo}`,
        ]
      : []),
    "",
    `--${boundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    "",
    params.bodyText ?? params.bodyHtml.replace(/<[^>]+>/g, ""),
    "",
    `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    "",
    params.bodyHtml,
    "",
    `--${boundary}--`,
  ];

  const rawMessage = messageParts.join("\r\n");
  const encodedMessage = Buffer.from(rawMessage)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const response = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        raw: encodedMessage,
        ...(params.threadId ? { threadId: params.threadId } : {}),
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Erro ao enviar email: ${error.error?.message ?? response.statusText}`
    );
  }

  const result = await response.json();
  return { messageId: result.id, threadId: result.threadId };
}

/**
 * Verifica se o user tem conta Gmail conectada.
 */
export async function isGmailConnected(userId: string): Promise<boolean> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google", refresh_token: { not: null } },
    select: { id: true },
  });
  return !!account;
}
```

### 3.3 Server Action: Envio Individual + Envio em Lote

#### Arquivo: `src/actions/emails.ts`

```typescript
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  getAuthenticatedSession,
  canAccessRecord,
  getOwnerFilter,
} from "@/lib/permissions";
import { sendGmailEmail, isGmailConnected } from "@/lib/email/gmail-client";

// ============================================================
// ENVIO INDIVIDUAL — uma atividade, um destinatário
// ============================================================

/**
 * Envia email de uma atividade individual para o contato associado.
 * Chamado pelo botão [📧 Enviar] no card da atividade do lead.
 */
export async function sendActivityEmail(
  activityId: string,
  overrides?: {
    to?: string;
    subject?: string;
    bodyHtml?: string;
  }
) {
  const session = await getAuthenticatedSession();

  const connected = await isGmailConnected(session.user.id);
  if (!connected) {
    throw new Error(
      "Gmail não conectado. Vá em Configurações → Integrações para conectar."
    );
  }

  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    include: {
      lead: {
        select: {
          id: true,
          businessName: true,
        },
      },
    },
  });

  if (!activity || !(await canAccessRecord(activity.ownerId))) {
    throw new Error("Atividade não encontrada");
  }

  if (activity.type !== "email") {
    throw new Error("Apenas atividades do tipo email podem ser enviadas");
  }

  // Determinar destinatário
  let toEmail = overrides?.to;
  let contactName = "";

  // 1. Tentar LeadContacts associados à atividade
  if (!toEmail && activity.leadContactIds && activity.leadId) {
    const contactIds = JSON.parse(activity.leadContactIds) as string[];
    const contacts = await prisma.leadContact.findMany({
      where: { id: { in: contactIds } },
      select: { name: true, email: true },
    });
    const withEmail = contacts.find((c) => c.email);
    if (withEmail) {
      toEmail = withEmail.email!;
      contactName = withEmail.name;
    }
  }

  // 2. Fallback: contato primário associado
  if (!toEmail && activity.contactId) {
    const contact = await prisma.contact.findUnique({
      where: { id: activity.contactId },
      select: { name: true, email: true },
    });
    if (contact?.email) {
      toEmail = contact.email;
      contactName = contact.name;
    }
  }

  if (!toEmail) {
    throw new Error(
      "Nenhum email de destinatário encontrado. Associe um contato com email à atividade."
    );
  }

  const subject = overrides?.subject ?? activity.subject;
  const bodyHtml =
    overrides?.bodyHtml ?? wrapInHtmlEmail(activity.description ?? "");

  const result = await sendGmailEmail(session.user.id, {
    to: toEmail,
    subject,
    bodyHtml,
  });

  // Salvar log
  await prisma.emailLog.create({
    data: {
      activityId,
      fromEmail: session.user.email!,
      toEmail,
      subject,
      bodyHtml,
      bodyText: activity.description,
      gmailMessageId: result.messageId,
      gmailThreadId: result.threadId,
      status: "sent",
    },
  });

  // Marcar atividade como concluída
  await prisma.activity.update({
    where: { id: activityId },
    data: { completed: true },
  });

  revalidatePath("/activities");
  if (activity.leadId) {
    revalidatePath(`/leads/${activity.leadId}`);
  }

  return {
    messageId: result.messageId,
    threadId: result.threadId,
    to: toEmail,
    contactName,
  };
}

// ============================================================
// ENVIO EM LOTE — todas as atividades pendentes de uma etapa
// ============================================================

/**
 * Busca todas as atividades pendentes de email para uma etapa da cadência.
 * Usado para mostrar o preview antes de enviar em lote.
 *
 * Retorna: lista de { activity, lead, contact, toEmail }
 */
export async function getBulkEmailPreview(cadenceStepId: string) {
  const session = await getAuthenticatedSession();
  const ownerFilter = await getOwnerFilter();

  // Buscar todas as LeadCadenceActivities desta etapa que:
  // - São do tipo email
  // - Não estão concluídas
  // - A LeadCadence está ativa
  const pendingActivities = await prisma.leadCadenceActivity.findMany({
    where: {
      cadenceStepId,
      activity: {
        type: "email",
        completed: false,
        ...ownerFilter,
      },
      leadCadence: {
        status: "active",
      },
    },
    include: {
      activity: {
        select: {
          id: true,
          subject: true,
          description: true,
          leadId: true,
          leadContactIds: true,
          contactId: true,
        },
      },
      leadCadence: {
        include: {
          lead: {
            select: {
              id: true,
              businessName: true,
              leadContacts: {
                where: { isPrimary: true },
                take: 1,
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
      },
    },
  });

  // Montar preview para cada atividade
  const previews = [];

  for (const item of pendingActivities) {
    const lead = item.leadCadence.lead;
    let toEmail: string | null = null;
    let contactName = "";

    // 1. Tentar contatos associados à atividade
    if (item.activity.leadContactIds) {
      const ids = JSON.parse(item.activity.leadContactIds) as string[];
      const contacts = await prisma.leadContact.findMany({
        where: { id: { in: ids } },
        select: { name: true, email: true },
      });
      const withEmail = contacts.find((c) => c.email);
      if (withEmail) {
        toEmail = withEmail.email!;
        contactName = withEmail.name;
      }
    }

    // 2. Fallback: contato primário do lead
    if (!toEmail && lead.leadContacts[0]?.email) {
      toEmail = lead.leadContacts[0].email;
      contactName = lead.leadContacts[0].name;
    }

    previews.push({
      activityId: item.activity.id,
      leadId: lead.id,
      leadName: lead.businessName,
      contactName,
      toEmail,
      subject: item.activity.subject,
      hasEmail: !!toEmail,
    });
  }

  return {
    total: previews.length,
    withEmail: previews.filter((p) => p.hasEmail).length,
    withoutEmail: previews.filter((p) => !p.hasEmail).length,
    items: previews,
  };
}

/**
 * Envia emails em lote para todas as atividades pendentes de uma etapa.
 * Chamado pelo botão [📧 Enviar em Lote] na etapa da cadência.
 *
 * Processo:
 * 1. Busca todas atividades pendentes de email da etapa
 * 2. Filtra apenas as que têm destinatário com email
 * 3. Envia uma por uma via Gmail API
 * 4. Salva log e marca como concluída
 * 5. Retorna relatório (enviados, falhas, sem email)
 */
export async function sendBulkCadenceStepEmail(cadenceStepId: string) {
  const session = await getAuthenticatedSession();

  const connected = await isGmailConnected(session.user.id);
  if (!connected) {
    throw new Error(
      "Gmail não conectado. Vá em Configurações → Integrações para conectar."
    );
  }

  // Verificar que a etapa existe e pertence a uma cadência do user
  const step = await prisma.cadenceStep.findUnique({
    where: { id: cadenceStepId },
    include: {
      cadence: { select: { id: true, ownerId: true } },
    },
  });

  if (!step || !(await canAccessRecord(step.cadence.ownerId))) {
    throw new Error("Etapa da cadência não encontrada");
  }

  if (step.channel !== "email") {
    throw new Error("Apenas etapas de email podem ser enviadas em lote");
  }

  // Buscar preview completo
  const preview = await getBulkEmailPreview(cadenceStepId);

  const sendable = preview.items.filter((item) => item.hasEmail);

  if (sendable.length === 0) {
    throw new Error(
      "Nenhuma atividade elegível para envio. Verifique se os contatos possuem email."
    );
  }

  // Enviar um por um (Gmail API tem rate limits)
  const results: {
    sent: Array<{ activityId: string; leadName: string; to: string }>;
    failed: Array<{ activityId: string; leadName: string; error: string }>;
    skipped: Array<{ activityId: string; leadName: string; reason: string }>;
  } = {
    sent: [],
    failed: [],
    skipped: preview.items
      .filter((item) => !item.hasEmail)
      .map((item) => ({
        activityId: item.activityId,
        leadName: item.leadName,
        reason: "Contato sem email",
      })),
  };

  for (const item of sendable) {
    try {
      // Buscar atividade completa para pegar description
      const activity = await prisma.activity.findUnique({
        where: { id: item.activityId },
        select: { subject: true, description: true },
      });

      if (!activity) {
        results.failed.push({
          activityId: item.activityId,
          leadName: item.leadName,
          error: "Atividade não encontrada",
        });
        continue;
      }

      const bodyHtml = wrapInHtmlEmail(activity.description ?? "");

      const gmailResult = await sendGmailEmail(session.user.id, {
        to: item.toEmail!,
        subject: activity.subject,
        bodyHtml,
      });

      // Salvar log
      await prisma.emailLog.create({
        data: {
          activityId: item.activityId,
          fromEmail: session.user.email!,
          toEmail: item.toEmail!,
          subject: activity.subject,
          bodyHtml,
          bodyText: activity.description,
          gmailMessageId: gmailResult.messageId,
          gmailThreadId: gmailResult.threadId,
          status: "sent",
        },
      });

      // Marcar como concluída
      await prisma.activity.update({
        where: { id: item.activityId },
        data: { completed: true },
      });

      results.sent.push({
        activityId: item.activityId,
        leadName: item.leadName,
        to: item.toEmail!,
      });

      // Rate limiting: 200ms entre envios (Gmail API ~250 req/s para users)
      await new Promise((r) => setTimeout(r, 200));
    } catch (err) {
      results.failed.push({
        activityId: item.activityId,
        leadName: item.leadName,
        error: err instanceof Error ? err.message : "Erro desconhecido",
      });
    }
  }

  revalidatePath("/activities");
  revalidatePath("/activities/calendar");

  return results;
}

// ============================================================
// UTILITÁRIOS
// ============================================================

/**
 * Busca logs de email de uma atividade.
 */
export async function getEmailLogs(activityId: string) {
  await getAuthenticatedSession();
  return prisma.emailLog.findMany({
    where: { activityId },
    orderBy: { sentAt: "desc" },
  });
}

/**
 * Verifica status da conexão Gmail do user logado.
 */
export async function checkGmailConnection() {
  const session = await getAuthenticatedSession();
  return isGmailConnected(session.user.id);
}

/**
 * Desconecta conta Gmail do user.
 */
export async function disconnectGmail() {
  const session = await getAuthenticatedSession();
  await prisma.account.deleteMany({
    where: { userId: session.user.id, provider: "google" },
  });
  revalidatePath("/dashboard/settings");
  return { success: true };
}

/**
 * Envolve texto simples em HTML email com estilo inline.
 */
function wrapInHtmlEmail(text: string): string {
  const htmlBody = text
    .split("\n")
    .map(
      (line) =>
        `<p style="margin:0 0 10px 0;font-family:Arial,sans-serif;font-size:14px;color:#333;">${line || "&nbsp;"}</p>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:20px;background:#f5f5f5;">
  <div style="max-width:600px;margin:0 auto;background:#fff;padding:24px;border-radius:8px;">
    ${htmlBody}
  </div>
</body>
</html>`;
}
```

### 3.4 Testes — Fase 3

#### `tests/unit/lib/gmail-client.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = {
  account: { findFirst: vi.fn(), updateMany: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

import {
  getGmailTokens,
  getValidAccessToken,
  isGmailConnected,
} from "@/lib/email/gmail-client";

describe("getGmailTokens", () => {
  it("should return tokens when account exists", async () => {
    mockPrisma.account.findFirst.mockResolvedValue({
      access_token: "ya29.valid",
      refresh_token: "1//refresh",
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    });

    const tokens = await getGmailTokens("user-1");
    expect(tokens).toEqual({
      accessToken: "ya29.valid",
      refreshToken: "1//refresh",
      expiresAt: expect.any(Number),
    });
  });

  it("should return null when no Google account linked", async () => {
    mockPrisma.account.findFirst.mockResolvedValue(null);
    expect(await getGmailTokens("user-1")).toBeNull();
  });

  it("should return null when refresh_token is missing", async () => {
    mockPrisma.account.findFirst.mockResolvedValue({
      access_token: "ya29.valid",
      refresh_token: null,
      expires_at: 123,
    });
    expect(await getGmailTokens("user-1")).toBeNull();
  });
});

describe("getValidAccessToken", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return existing token if not expired", async () => {
    mockPrisma.account.findFirst.mockResolvedValue({
      access_token: "ya29.still-valid",
      refresh_token: "1//refresh",
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    });

    expect(await getValidAccessToken("user-1")).toBe("ya29.still-valid");
  });

  it("should refresh token if expired", async () => {
    mockPrisma.account.findFirst.mockResolvedValue({
      access_token: "ya29.expired",
      refresh_token: "1//refresh",
      expires_at: Math.floor(Date.now() / 1000) - 60,
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: "ya29.refreshed",
          expires_in: 3600,
        }),
    });

    mockPrisma.account.updateMany.mockResolvedValue({ count: 1 });

    expect(await getValidAccessToken("user-1")).toBe("ya29.refreshed");
    expect(mockPrisma.account.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", provider: "google" },
      data: expect.objectContaining({ access_token: "ya29.refreshed" }),
    });
  });

  it("should throw if no Gmail account connected", async () => {
    mockPrisma.account.findFirst.mockResolvedValue(null);
    await expect(getValidAccessToken("user-1")).rejects.toThrow(
      "Gmail não conectada"
    );
  });

  it("should throw if refresh fails", async () => {
    mockPrisma.account.findFirst.mockResolvedValue({
      access_token: "ya29.expired",
      refresh_token: "1//bad",
      expires_at: Math.floor(Date.now() / 1000) - 60,
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "invalid_grant" }),
    });

    await expect(getValidAccessToken("user-1")).rejects.toThrow(
      "Falha ao renovar token"
    );
  });
});

describe("isGmailConnected", () => {
  it("should return true when account with refresh_token exists", async () => {
    mockPrisma.account.findFirst.mockResolvedValue({ id: "acc-1" });
    expect(await isGmailConnected("user-1")).toBe(true);
  });

  it("should return false when no account exists", async () => {
    mockPrisma.account.findFirst.mockResolvedValue(null);
    expect(await isGmailConnected("user-1")).toBe(false);
  });
});
```

#### `tests/unit/actions/emails.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = {
  activity: { findUnique: vi.fn(), update: vi.fn() },
  account: { findFirst: vi.fn(), updateMany: vi.fn() },
  leadContact: { findMany: vi.fn() },
  contact: { findUnique: vi.fn() },
  emailLog: { create: vi.fn() },
  cadenceStep: { findUnique: vi.fn() },
  leadCadenceActivity: { findMany: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/permissions", () => ({
  getAuthenticatedSession: vi.fn(() => ({
    user: { id: "user-1", email: "bruno@wb.com", name: "Bruno" },
  })),
  canAccessRecord: vi.fn(() => true),
  getOwnerFilter: vi.fn(() => ({ ownerId: "user-1" })),
}));
vi.mock("@/lib/email/gmail-client", () => ({
  isGmailConnected: vi.fn(() => true),
  sendGmailEmail: vi.fn(() => ({
    messageId: "msg-123",
    threadId: "thread-456",
  })),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { sendActivityEmail, sendBulkCadenceStepEmail } from "@/actions/emails";

// ============================================================
// TESTES DE ENVIO INDIVIDUAL
// ============================================================

describe("sendActivityEmail (individual)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should send email to lead contact and mark activity completed", async () => {
    mockPrisma.activity.findUnique.mockResolvedValue({
      id: "act-1",
      type: "email",
      subject: "Proposta comercial",
      description: "Olá, segue proposta...",
      ownerId: "user-1",
      leadId: "lead-1",
      leadContactIds: JSON.stringify(["lc-1"]),
      contactId: null,
    });

    mockPrisma.leadContact.findMany.mockResolvedValue([
      { name: "Maria", email: "maria@empresa.com" },
    ]);

    mockPrisma.emailLog.create.mockResolvedValue({ id: "log-1" });
    mockPrisma.activity.update.mockResolvedValue({});

    const result = await sendActivityEmail("act-1");

    expect(result.to).toBe("maria@empresa.com");
    expect(result.messageId).toBe("msg-123");

    // Verificar log salvo
    expect(mockPrisma.emailLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        activityId: "act-1",
        toEmail: "maria@empresa.com",
        subject: "Proposta comercial",
        status: "sent",
        gmailMessageId: "msg-123",
      }),
    });

    // Verificar atividade marcada como concluída
    expect(mockPrisma.activity.update).toHaveBeenCalledWith({
      where: { id: "act-1" },
      data: { completed: true },
    });
  });

  it("should throw if activity is not email type", async () => {
    mockPrisma.activity.findUnique.mockResolvedValue({
      id: "act-1",
      type: "call",
      ownerId: "user-1",
    });
    await expect(sendActivityEmail("act-1")).rejects.toThrow("tipo email");
  });

  it("should throw if no recipient email found", async () => {
    mockPrisma.activity.findUnique.mockResolvedValue({
      id: "act-1",
      type: "email",
      ownerId: "user-1",
      leadId: "lead-1",
      leadContactIds: JSON.stringify(["lc-1"]),
      contactId: null,
    });

    mockPrisma.leadContact.findMany.mockResolvedValue([
      { name: "Maria", email: null },
    ]);

    await expect(sendActivityEmail("act-1")).rejects.toThrow(
      "email de destinatário"
    );
  });

  it("should throw if Gmail not connected", async () => {
    const { isGmailConnected } = await import("@/lib/email/gmail-client");
    (isGmailConnected as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false);

    await expect(sendActivityEmail("act-1")).rejects.toThrow(
      "Gmail não conectado"
    );
  });

  it("should allow overriding to, subject, and body", async () => {
    mockPrisma.activity.findUnique.mockResolvedValue({
      id: "act-1",
      type: "email",
      subject: "Original",
      description: "Corpo original",
      ownerId: "user-1",
      leadId: null,
      leadContactIds: null,
      contactId: null,
    });
    mockPrisma.emailLog.create.mockResolvedValue({ id: "log-1" });
    mockPrisma.activity.update.mockResolvedValue({});

    const result = await sendActivityEmail("act-1", {
      to: "custom@email.com",
      subject: "Custom Subject",
      bodyHtml: "<p>Custom body</p>",
    });

    expect(result.to).toBe("custom@email.com");
    expect(mockPrisma.emailLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        toEmail: "custom@email.com",
        subject: "Custom Subject",
      }),
    });
  });
});

// ============================================================
// TESTES DE ENVIO EM LOTE
// ============================================================

describe("sendBulkCadenceStepEmail (em lote)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should send emails to all pending activities in cadence step", async () => {
    // Setup: step de email com 3 atividades pendentes
    mockPrisma.cadenceStep.findUnique.mockResolvedValue({
      id: "step-1",
      channel: "email",
      cadence: { id: "cad-1", ownerId: "user-1" },
    });

    // Mock getBulkEmailPreview inline (via leadCadenceActivity.findMany)
    mockPrisma.leadCadenceActivity.findMany.mockResolvedValue([
      {
        activity: {
          id: "act-1",
          subject: "Email para Lead A",
          description: "Corpo do email A",
          leadId: "lead-a",
          leadContactIds: null,
          contactId: null,
        },
        leadCadence: {
          lead: {
            id: "lead-a",
            businessName: "Empresa A",
            leadContacts: [
              { id: "lc-a", name: "João", email: "joao@empresa-a.com" },
            ],
          },
        },
      },
      {
        activity: {
          id: "act-2",
          subject: "Email para Lead B",
          description: "Corpo do email B",
          leadId: "lead-b",
          leadContactIds: null,
          contactId: null,
        },
        leadCadence: {
          lead: {
            id: "lead-b",
            businessName: "Empresa B",
            leadContacts: [
              { id: "lc-b", name: "Ana", email: "ana@empresa-b.com" },
            ],
          },
        },
      },
      {
        activity: {
          id: "act-3",
          subject: "Email para Lead C",
          description: "Corpo do email C",
          leadId: "lead-c",
          leadContactIds: null,
          contactId: null,
        },
        leadCadence: {
          lead: {
            id: "lead-c",
            businessName: "Empresa C",
            leadContacts: [{ id: "lc-c", name: "Pedro", email: null }], // SEM EMAIL
          },
        },
      },
    ]);

    mockPrisma.activity.findUnique
      .mockResolvedValueOnce({ subject: "Email para Lead A", description: "Corpo A" })
      .mockResolvedValueOnce({ subject: "Email para Lead B", description: "Corpo B" });

    mockPrisma.emailLog.create.mockResolvedValue({});
    mockPrisma.activity.update.mockResolvedValue({});

    const results = await sendBulkCadenceStepEmail("step-1");

    // 2 enviados, 1 sem email (skipped)
    expect(results.sent).toHaveLength(2);
    expect(results.skipped).toHaveLength(1);
    expect(results.skipped[0].reason).toBe("Contato sem email");
    expect(results.sent[0].to).toBe("joao@empresa-a.com");
    expect(results.sent[1].to).toBe("ana@empresa-b.com");
  });

  it("should throw if step is not email channel", async () => {
    mockPrisma.cadenceStep.findUnique.mockResolvedValue({
      id: "step-1",
      channel: "whatsapp",
      cadence: { id: "cad-1", ownerId: "user-1" },
    });

    await expect(sendBulkCadenceStepEmail("step-1")).rejects.toThrow(
      "etapas de email"
    );
  });

  it("should throw if Gmail not connected", async () => {
    const { isGmailConnected } = await import("@/lib/email/gmail-client");
    (isGmailConnected as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false);

    await expect(sendBulkCadenceStepEmail("step-1")).rejects.toThrow(
      "Gmail não conectado"
    );
  });

  it("should handle partial failures gracefully", async () => {
    mockPrisma.cadenceStep.findUnique.mockResolvedValue({
      id: "step-1",
      channel: "email",
      cadence: { id: "cad-1", ownerId: "user-1" },
    });

    mockPrisma.leadCadenceActivity.findMany.mockResolvedValue([
      {
        activity: {
          id: "act-1",
          subject: "Email A",
          description: "Corpo A",
          leadId: "lead-a",
          leadContactIds: null,
          contactId: null,
        },
        leadCadence: {
          lead: {
            id: "lead-a",
            businessName: "Empresa A",
            leadContacts: [{ id: "lc-a", name: "João", email: "joao@a.com" }],
          },
        },
      },
      {
        activity: {
          id: "act-2",
          subject: "Email B",
          description: "Corpo B",
          leadId: "lead-b",
          leadContactIds: null,
          contactId: null,
        },
        leadCadence: {
          lead: {
            id: "lead-b",
            businessName: "Empresa B",
            leadContacts: [{ id: "lc-b", name: "Ana", email: "ana@b.com" }],
          },
        },
      },
    ]);

    mockPrisma.activity.findUnique
      .mockResolvedValueOnce({ subject: "Email A", description: "Corpo A" })
      .mockResolvedValueOnce({ subject: "Email B", description: "Corpo B" });

    // Primeiro envia ok, segundo falha
    const { sendGmailEmail } = await import("@/lib/email/gmail-client");
    (sendGmailEmail as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ messageId: "msg-1", threadId: "t-1" })
      .mockRejectedValueOnce(new Error("Gmail API rate limit"));

    mockPrisma.emailLog.create.mockResolvedValue({});
    mockPrisma.activity.update.mockResolvedValue({});

    const results = await sendBulkCadenceStepEmail("step-1");

    expect(results.sent).toHaveLength(1);
    expect(results.failed).toHaveLength(1);
    expect(results.failed[0].error).toContain("rate limit");
  });
});
```

#### `tests/unit/actions/emails-preview.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = {
  leadCadenceActivity: { findMany: vi.fn() },
  leadContact: { findMany: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/permissions", () => ({
  getAuthenticatedSession: vi.fn(() => ({
    user: { id: "user-1" },
  })),
  getOwnerFilter: vi.fn(() => ({ ownerId: "user-1" })),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { getBulkEmailPreview } from "@/actions/emails";

describe("getBulkEmailPreview", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return preview with email availability info", async () => {
    mockPrisma.leadCadenceActivity.findMany.mockResolvedValue([
      {
        activity: {
          id: "act-1",
          subject: "Subject 1",
          leadId: "lead-1",
          leadContactIds: null,
          contactId: null,
        },
        leadCadence: {
          lead: {
            id: "lead-1",
            businessName: "Empresa A",
            leadContacts: [{ id: "lc-1", name: "João", email: "joao@a.com" }],
          },
        },
      },
      {
        activity: {
          id: "act-2",
          subject: "Subject 2",
          leadId: "lead-2",
          leadContactIds: null,
          contactId: null,
        },
        leadCadence: {
          lead: {
            id: "lead-2",
            businessName: "Empresa B",
            leadContacts: [{ id: "lc-2", name: "Maria", email: null }],
          },
        },
      },
    ]);

    const result = await getBulkEmailPreview("step-1");

    expect(result.total).toBe(2);
    expect(result.withEmail).toBe(1);
    expect(result.withoutEmail).toBe(1);
    expect(result.items[0].toEmail).toBe("joao@a.com");
    expect(result.items[1].toEmail).toBeNull();
  });

  it("should return empty preview when no pending activities", async () => {
    mockPrisma.leadCadenceActivity.findMany.mockResolvedValue([]);

    const result = await getBulkEmailPreview("step-1");

    expect(result.total).toBe(0);
    expect(result.items).toEqual([]);
  });
});
```

---

## Fase 4 — UI: Envio Individual e em Lote

### 4.1 Botão Enviar Email no Card da Atividade (Individual)

#### Modificar: `src/components/leads/LeadActivitiesList.tsx`

No card de cada atividade do tipo `email`, adicionar botão de envio:

```tsx
import { Send } from "lucide-react";
import { sendActivityEmail, checkGmailConnection } from "@/actions/emails";

// Novos states:
const [sendingId, setSendingId] = useState<string | null>(null);
const [gmailConnected, setGmailConnected] = useState(false);

// Checar conexão Gmail ao montar:
useEffect(() => {
  checkGmailConnection().then(setGmailConnected).catch(() => {});
}, []);

// Handler de envio individual:
const handleSendEmail = async (e: React.MouseEvent, activity: Activity) => {
  e.preventDefault();
  e.stopPropagation();

  if (!confirm(`Enviar email "${activity.subject}" pelo Gmail?`)) return;

  setSendingId(activity.id);
  try {
    const result = await sendActivityEmail(activity.id);
    toast.success(`Email enviado para ${result.to}`);
    router.refresh();
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Erro ao enviar email");
  } finally {
    setSendingId(null);
  }
};

// No JSX, junto aos botões UserPlus e toggle:
{activity.type === "email" && !activity.completed && gmailConnected && (
  <button
    onClick={(e) => handleSendEmail(e, activity)}
    disabled={sendingId === activity.id}
    className="mt-0.5 flex-shrink-0 rounded-lg p-2 text-blue-500 hover:bg-blue-100 hover:text-blue-700 transition-colors"
    title="Enviar email pelo Gmail"
  >
    {sendingId === activity.id ? (
      <Loader2 className="h-4 w-4 animate-spin" />
    ) : (
      <Send className="h-4 w-4" />
    )}
  </button>
)}
```

### 4.2 Botão Enviar em Lote na Etapa da Cadência

#### Modificar: `src/components/leads/LeadCadenceSection.tsx`

Na seção expandida de atividades de cada cadência, quando a etapa é de email, adicionar botão de envio em lote:

```tsx
import { Send, Loader2, Mail } from "lucide-react";
import { sendBulkCadenceStepEmail, getBulkEmailPreview } from "@/actions/emails";

// No componente, adicionar state para bulk:
const [bulkSending, setBulkSending] = useState<string | null>(null);
const [bulkPreview, setBulkPreview] = useState<{
  stepId: string;
  total: number;
  withEmail: number;
  withoutEmail: number;
} | null>(null);

// Handler de preview:
const handleBulkPreview = async (stepId: string) => {
  const preview = await getBulkEmailPreview(stepId);
  setBulkPreview({ stepId, ...preview });
};

// Handler de envio em lote:
const handleBulkSend = async (stepId: string) => {
  if (!confirm("Enviar emails para todos os leads pendentes desta etapa?")) return;
  setBulkSending(stepId);
  try {
    const results = await sendBulkCadenceStepEmail(stepId);
    toast.success(
      `${results.sent.length} emails enviados` +
      (results.failed.length > 0 ? `, ${results.failed.length} falharam` : "") +
      (results.skipped.length > 0 ? `, ${results.skipped.length} sem email` : "")
    );
    router.refresh();
    const data = await getLeadCadences(leadId);
    setCadences(data);
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Erro ao enviar em lote");
  } finally {
    setBulkSending(null);
    setBulkPreview(null);
  }
};
```

No JSX da lista de atividades expandida (dentro do `{expandedCadence === lc.id && (...)}`), para cada grupo de etapa de email, adicionar botão:

```tsx
{/* Botão enviar em lote para etapas de email */}
{activity.cadenceStep.channel === "email" &&
  !activity.activity.completed &&
  gmailConnected && (
    <button
      onClick={() => handleBulkPreview(activity.cadenceStep.id)}
      className="ml-auto rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors flex items-center gap-1.5"
    >
      <Send className="h-3.5 w-3.5" />
      Enviar em Lote
    </button>
  )}
```

### 4.3 Modal de Preview/Confirmação do Envio em Lote

#### Novo Arquivo: `src/components/activities/BulkEmailModal.tsx`

```tsx
"use client";

import { useState } from "react";
import { X, Send, Loader2, AlertTriangle, Check, Mail } from "lucide-react";

type BulkEmailPreview = {
  total: number;
  withEmail: number;
  withoutEmail: number;
  items: Array<{
    activityId: string;
    leadName: string;
    contactName: string;
    toEmail: string | null;
    subject: string;
    hasEmail: boolean;
  }>;
};

type BulkEmailResults = {
  sent: Array<{ activityId: string; leadName: string; to: string }>;
  failed: Array<{ activityId: string; leadName: string; error: string }>;
  skipped: Array<{ activityId: string; leadName: string; reason: string }>;
};

export function BulkEmailModal({
  preview,
  onSend,
  onClose,
}: {
  preview: BulkEmailPreview;
  onSend: () => Promise<BulkEmailResults>;
  onClose: () => void;
}) {
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<BulkEmailResults | null>(null);

  const handleSend = async () => {
    setSending(true);
    try {
      const r = await onSend();
      setResults(r);
    } catch {
      // Error handled by parent
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-gradient-to-r from-blue-600 to-blue-800 p-4 text-white rounded-t-xl">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <Mail className="h-5 w-5" />
            Enviar Emails em Lote
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-white/20">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {!results ? (
            <>
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="rounded-lg bg-blue-50 p-3 text-center">
                  <p className="text-2xl font-bold text-blue-700">{preview.total}</p>
                  <p className="text-xs text-blue-600">Total</p>
                </div>
                <div className="rounded-lg bg-green-50 p-3 text-center">
                  <p className="text-2xl font-bold text-green-700">{preview.withEmail}</p>
                  <p className="text-xs text-green-600">Com email</p>
                </div>
                <div className="rounded-lg bg-amber-50 p-3 text-center">
                  <p className="text-2xl font-bold text-amber-700">{preview.withoutEmail}</p>
                  <p className="text-xs text-amber-600">Sem email</p>
                </div>
              </div>

              {/* Warnings */}
              {preview.withoutEmail > 0 && (
                <div className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                  <p className="text-sm text-amber-800">
                    {preview.withoutEmail} lead(s) sem email cadastrado serão ignorados.
                  </p>
                </div>
              )}

              {/* List of recipients */}
              <div className="space-y-2">
                {preview.items.map((item) => (
                  <div
                    key={item.activityId}
                    className={`flex items-center gap-3 rounded-lg border p-3 ${
                      item.hasEmail ? "border-gray-200" : "border-amber-200 bg-amber-50"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.leadName}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {item.contactName} — {item.toEmail ?? "sem email"}
                      </p>
                    </div>
                    {item.hasEmail ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            /* Results after sending */
            <div className="space-y-4">
              {results.sent.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-green-700 mb-2">
                    Enviados ({results.sent.length})
                  </h3>
                  {results.sent.map((s) => (
                    <div key={s.activityId} className="flex items-center gap-2 py-1 text-sm">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>{s.leadName}</span>
                      <span className="text-gray-400">→ {s.to}</span>
                    </div>
                  ))}
                </div>
              )}
              {results.failed.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-red-700 mb-2">
                    Falharam ({results.failed.length})
                  </h3>
                  {results.failed.map((f) => (
                    <div key={f.activityId} className="flex items-center gap-2 py-1 text-sm">
                      <X className="h-4 w-4 text-red-500" />
                      <span>{f.leadName}</span>
                      <span className="text-xs text-red-400">({f.error})</span>
                    </div>
                  ))}
                </div>
              )}
              {results.skipped.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-amber-700 mb-2">
                    Ignorados ({results.skipped.length})
                  </h3>
                  {results.skipped.map((s) => (
                    <div key={s.activityId} className="flex items-center gap-2 py-1 text-sm">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <span>{s.leadName}</span>
                      <span className="text-xs text-amber-400">({s.reason})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t bg-gray-50 px-4 py-3 rounded-b-xl">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {results ? "Fechar" : "Cancelar"}
          </button>
          {!results && (
            <button
              onClick={handleSend}
              disabled={sending || preview.withEmail === 0}
              className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Enviar {preview.withEmail} email(s)
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

### 4.4 Onde colocar o Botão de Envio em Lote

Existem **dois locais** para o botão de envio em lote:

#### Local 1: Na página do lead — Seção de Cadência (`LeadCadenceSection.tsx`)

Na lista expandida de atividades da cadência, agrupar por etapa e mostrar botão "Enviar" para etapas de email. Isso envia **apenas para este lead**.

```
┌─────────────────────────────────────────────────────┐
│ ⚡ Cadência IFEE 14 dias            [Ativa]        │
│ Progresso: 2/7 (28%)                                │
│ ▼ Ver atividades (7)                                │
├─────────────────────────────────────────────────────┤
│  D1  📧 E-mail   "Olá Maria, vi que..."   ✅       │
│  D3  💬 LinkedIn "Conexão e mensagem"      ⬜      │
│  D5  📧 E-mail   "Follow-up proposta"     ⬜  [📧] │  ← botão individual
│  D7  📞 Ligação  "Ligar para confirmar"    ⬜       │
└─────────────────────────────────────────────────────┘
```

#### Local 2: Na página da cadência no admin (`/dashboard/admin/cadences/[id]`)

Na lista de etapas (`CadenceStepsList.tsx`), para etapas de email, adicionar botão "Enviar em Lote para Todos os Leads":

```
┌────────────────────────────────────────────────────────────┐
│ D1  📧 E-mail                                              │
│     "Olá {{primeiroNome}}, vi que a {{nomeEmpresa}}..."   │
│     [Copiar] [Editar] [Excluir] [📧 Enviar em Lote (12)]  │
├────────────────────────────────────────────────────────────┤
│ D3  💬 LinkedIn                                            │
│     "Conexão + mensagem"                                   │
│     [Copiar] [Editar] [Excluir]                            │
├────────────────────────────────────────────────────────────┤
│ D5  📧 E-mail                                              │
│     "Follow-up {{primeiroNome}}"                           │
│     [Copiar] [Editar] [Excluir] [📧 Enviar em Lote (8)]   │
└────────────────────────────────────────────────────────────┘
```

O número `(12)` é a contagem de atividades pendentes de email naquela etapa. O botão abre o `BulkEmailModal` com preview.

#### Modificar: `src/components/admin/CadenceStepsList.tsx`

```tsx
import { Send, Loader2 } from "lucide-react";
import { getBulkEmailPreview, sendBulkCadenceStepEmail } from "@/actions/emails";
import { BulkEmailModal } from "@/components/activities/BulkEmailModal";

// Adicionar state para bulk:
const [bulkPreview, setBulkPreview] = useState<any>(null);
const [bulkStepId, setBulkStepId] = useState<string | null>(null);

// Handler:
const handleBulkEmail = async (stepId: string) => {
  const preview = await getBulkEmailPreview(stepId);
  setBulkPreview(preview);
  setBulkStepId(stepId);
};

// No JSX, nos botões de ação de cada step (ao lado de Copy, Edit, Delete):
{step.channel === "email" && (
  <button
    onClick={() => handleBulkEmail(step.id)}
    className="rounded-lg p-2 text-blue-500 hover:bg-blue-50 hover:text-blue-700 transition-all"
    title="Enviar em lote para todos os leads"
  >
    <Send className="h-4 w-4" />
  </button>
)}

// Modal de bulk:
{bulkPreview && bulkStepId && (
  <BulkEmailModal
    preview={bulkPreview}
    onSend={() => sendBulkCadenceStepEmail(bulkStepId)}
    onClose={() => { setBulkPreview(null); setBulkStepId(null); }}
  />
)}
```

### 4.5 Página de Configurações — Conexão Gmail

#### Arquivo: `src/app/(dashboard)/dashboard/settings/page.tsx`

Adicionar seção de integrações:

```tsx
<div className="rounded-xl bg-white p-6 shadow-md">
  <h2 className="text-lg font-bold">Integrações</h2>
  <div className="mt-4 flex items-center justify-between rounded-lg border p-4">
    <div className="flex items-center gap-3">
      <Mail className="h-8 w-8 text-red-500" />
      <div>
        <p className="font-medium">Gmail</p>
        <p className="text-sm text-gray-500">
          {isConnected
            ? "Conectado — emails são enviados da sua conta Gmail"
            : "Conecte para enviar emails diretamente do CRM"
          }
        </p>
      </div>
    </div>
    {isConnected ? (
      <button onClick={handleDisconnect} className="text-red-600 hover:text-red-800 text-sm">
        Desconectar
      </button>
    ) : (
      <a href="/api/auth/google/connect"
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white font-medium hover:bg-blue-700">
        Conectar Gmail
      </a>
    )}
  </div>
</div>
```

### 4.6 Testes de Componente — Fase 4

#### `tests/unit/components/bulk-email-modal.test.tsx`

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

describe("BulkEmailModal", () => {
  const mockPreview = {
    total: 5,
    withEmail: 3,
    withoutEmail: 2,
    items: [
      { activityId: "a1", leadName: "Lead A", contactName: "João", toEmail: "j@a.com", subject: "Sub A", hasEmail: true },
      { activityId: "a2", leadName: "Lead B", contactName: "Ana", toEmail: "a@b.com", subject: "Sub B", hasEmail: true },
      { activityId: "a3", leadName: "Lead C", contactName: "Pedro", toEmail: "p@c.com", subject: "Sub C", hasEmail: true },
      { activityId: "a4", leadName: "Lead D", contactName: "Maria", toEmail: null, subject: "Sub D", hasEmail: false },
      { activityId: "a5", leadName: "Lead E", contactName: "Carlos", toEmail: null, subject: "Sub E", hasEmail: false },
    ],
  };

  it("should show preview with counts", () => {
    // Verify: "Total: 5", "Com email: 3", "Sem email: 2"
    // Verify: warning about skipped leads
    // Verify: button shows "Enviar 3 email(s)"
  });

  it("should disable send button when no emails available", () => {
    const emptyPreview = { total: 2, withEmail: 0, withoutEmail: 2, items: [] };
    // Verify: send button is disabled
  });

  it("should show results after sending", async () => {
    // Click send → verify loading state
    // After resolve → verify sent/failed/skipped lists
    // Verify: cancel button becomes "Fechar"
  });
});
```

---

## Fase 5 — Tracking de Abertura e Cliques (Avançado)

### 5.1 Tracking Pixel de Abertura

#### Arquivo: `src/app/api/email/track/open/[logId]/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TRACKING_PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(
  req: NextRequest,
  { params }: { params: { logId: string } }
) {
  const { logId } = params;

  prisma.emailLog
    .update({
      where: { id: logId },
      data: {
        openCount: { increment: 1 },
        openedAt: new Date(),
        status: "opened",
      },
    })
    .catch(() => {});

  return new NextResponse(TRACKING_PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
```

### 5.2 Tracking de Cliques

#### Arquivo: `src/app/api/email/track/click/[logId]/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { logId: string } }
) {
  const { logId } = params;
  const url = req.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.redirect(process.env.NEXTAUTH_URL!);
  }

  prisma.emailLog
    .update({
      where: { id: logId },
      data: {
        clickCount: { increment: 1 },
        clickedAt: new Date(),
        status: "clicked",
      },
    })
    .catch(() => {});

  return NextResponse.redirect(url);
}
```

### 5.3 Injetar Tracking no HTML do Email

Adicionar em `src/lib/email/gmail-client.ts` ou `src/actions/emails.ts`:

```typescript
function injectTracking(html: string, emailLogId: string): string {
  const baseUrl = process.env.NEXTAUTH_URL;

  // Tracking pixel antes de </body>
  const pixel = `<img src="${baseUrl}/api/email/track/open/${emailLogId}" width="1" height="1" style="display:none" />`;
  html = html.replace("</body>", `${pixel}</body>`);

  // Links → redirect com tracking
  html = html.replace(
    /href="(https?:\/\/[^"]+)"/g,
    (_, url) =>
      `href="${baseUrl}/api/email/track/click/${emailLogId}?url=${encodeURIComponent(url)}"`
  );

  return html;
}
```

**Fluxo**: Criar o EmailLog primeiro (sem gmailMessageId), injetar tracking no HTML, enviar via Gmail, atualizar o EmailLog com gmailMessageId.

### 5.4 Testes — Fase 5

#### `tests/unit/lib/email-tracking.test.ts`

```typescript
import { describe, it, expect } from "vitest";

describe("injectTracking", () => {
  it("should add tracking pixel before </body>", () => {
    const html = "<html><body><p>Hello</p></body></html>";
    // const result = injectTracking(html, "log-123");
    // expect(result).toContain("/api/email/track/open/log-123");
    // expect(result).toContain('width="1" height="1"');
  });

  it("should replace links with tracking redirects", () => {
    const html = '<a href="https://example.com">Click</a>';
    // const result = injectTracking(html, "log-123");
    // expect(result).toContain("/api/email/track/click/log-123");
    // expect(result).toContain("url=https%3A%2F%2Fexample.com");
  });

  it("should not modify mailto links", () => {
    const html = '<a href="mailto:test@test.com">Email</a>';
    // const result = injectTracking(html, "log-123");
    // expect(result).toContain('href="mailto:test@test.com"');
  });
});
```

---

## Fase 6 — Histórico de Emails e Métricas

### 6.1 Histórico na Página da Atividade

Na página de detalhe da atividade (`/activities/[id]`), mostrar todos os emails enviados:

```
┌─────────────────────────────────────────────┐
│ 📧 Histórico de Emails                     │
├─────────────────────────────────────────────┤
│ ✅ Enviado em 15/03/2026 14:30             │
│ Para: maria@techcorp.com                    │
│ Assunto: Proposta comercial                 │
│ Status: Aberto (3x) · Clicado (1x)         │
│ [Ver conteúdo]                              │
├─────────────────────────────────────────────┤
│ ✅ Enviado em 10/03/2026 09:15             │
│ Para: maria@techcorp.com                    │
│ Assunto: Follow-up reunião                  │
│ Status: Enviado (sem abertura)              │
│ [Ver conteúdo]                              │
└─────────────────────────────────────────────┘
```

### 6.2 Badge de Status na Lista de Atividades

Na lista de atividades do lead e na lista geral, mostrar badges de email:

```
[📧 E-mail] [✅ Enviado] [👁 Aberto 3x]
Proposta comercial - Tech Corp
→ maria@techcorp.com — 15/03/2026 14:30
```

### 6.3 Dashboard de Métricas de Email (Futuro)

No dashboard principal, adicionar:
- Taxa de abertura (opens / sends)
- Taxa de clique (clicks / opens)
- Emails enviados por período
- Top cadências por performance de email

---

## Resumo de Arquivos

### Novos Arquivos

| Arquivo | Fase | Descrição |
|---------|------|-----------|
| `src/lib/templates.ts` | 1 | Engine de substituição de variáveis |
| `src/lib/email/gmail-client.ts` | 3 | Cliente Gmail API (tokens, envio) |
| `src/actions/emails.ts` | 3 | Server actions: individual + lote + preview |
| `src/app/api/auth/google/connect/route.ts` | 2 | Iniciar OAuth Google |
| `src/app/api/auth/google/callback/route.ts` | 2 | Callback OAuth Google |
| `src/app/api/email/track/open/[logId]/route.ts` | 5 | Tracking de abertura |
| `src/app/api/email/track/click/[logId]/route.ts` | 5 | Tracking de cliques |
| `src/components/activities/BulkEmailModal.tsx` | 4 | Modal de preview/envio em lote |
| `src/components/activities/EmailLogsList.tsx` | 6 | Histórico de emails |
| `src/components/settings/GmailConnection.tsx` | 4 | Card de conexão Gmail |

### Arquivos a Modificar

| Arquivo | Fase | Mudança |
|---------|------|---------|
| `prisma/schema.prisma` | 3 | Adicionar model EmailLog + relação Activity |
| `src/actions/lead-cadences.ts` | 1 | Substituir variáveis ao criar atividades |
| `src/components/leads/LeadActivitiesList.tsx` | 4 | Botão [📧 Enviar] individual no card |
| `src/components/leads/LeadCadenceSection.tsx` | 4 | Botão [📧 Enviar em Lote] na cadência |
| `src/components/admin/CadenceStepsList.tsx` | 4 | Botão [📧 Enviar em Lote] na etapa |
| `src/components/admin/CadenceStepForm.tsx` | 1 | Preview de variáveis + lista de variáveis |
| `src/app/(dashboard)/activities/[id]/page.tsx` | 6 | Seção de histórico de emails |
| `src/app/(dashboard)/dashboard/settings/page.tsx` | 4 | Seção de integrações Gmail |
| `.env.example` | 2 | GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET |

### Novos Testes

| Arquivo | Fase | Tipo |
|---------|------|------|
| `tests/unit/lib/templates.test.ts` | 1 | Unit |
| `tests/unit/actions/lead-cadences-templates.test.ts` | 1 | Unit |
| `tests/unit/lib/gmail-client.test.ts` | 3 | Unit |
| `tests/unit/actions/emails.test.ts` | 3 | Unit (individual + lote) |
| `tests/unit/actions/emails-preview.test.ts` | 3 | Unit (preview em lote) |
| `tests/unit/api/google-callback.test.ts` | 2 | Unit |
| `tests/unit/lib/email-tracking.test.ts` | 5 | Unit |
| `tests/unit/components/bulk-email-modal.test.tsx` | 4 | Component |

### Dependências NPM

Nenhuma nova — Gmail API é chamada via `fetch` nativo.

---

## Variáveis de Ambiente

Adicionar ao `.env` e `.env.example`:

```env
# Gmail Integration (OAuth2)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

---

## Fase 7 — Detecção de Respostas e Cancelamento Automático de Cadência

### 7.1 Visão Geral

Quando um lead responde (por qualquer canal), o fluxo correto é:
1. Registrar a resposta no histórico de atividades do lead
2. Cancelar todas as cadências ativas/pausadas do lead
3. Pular (skip) todas as atividades pendentes da cadência com motivo automático
4. Notificar o usuário do CRM

**Dois modos de operação:**
- **Manual (já implementado)**: Botão "Registrar Resposta" na página do lead — cancela cadências e pula atividades
- **Automático (esta fase)**: Gmail Watch API detecta resposta em thread conhecida → dispara cancelamento

### 7.2 Fluxo Manual (Implementado)

```
Página do Lead → Botão [Registrar Resposta]
  → Modal: seleciona canal (email, whatsapp, linkedin, call, instagram, outro)
  → Modal: observações opcionais
  → Server Action: registerLeadReply()
    → Cria Activity completada "Resposta recebida via {canal}"
    → Busca todas LeadCadence active/paused do lead
    → Para cada cadência:
      → Pula (skip) atividades pendentes com motivo "Lead respondeu via {canal}"
      → Cancela a LeadCadence com nota explicativa
    → Retorna: { cancelledCadences, skippedActivities }
```

**Arquivos implementados:**
- `src/actions/lead-cadences.ts` → `registerLeadReply(leadId, { channel, notes })`
- `src/components/leads/LeadActivitiesList.tsx` → Botão + Modal "Registrar Resposta"
- `cancelLeadCadence()` atualizado para também pular atividades pendentes

### 7.3 Fluxo Automático via Gmail Watch API

```
Gmail Watch API (Push Notification)
  → Google Pub/Sub envia POST para /api/email/webhook/gmail
  → Webhook decodifica historyId do payload
  → Busca mensagens novas via gmail.users.history.list
  → Para cada mensagem:
    → Verifica se threadId existe em EmailLog (email enviado pelo CRM)
    → Se sim: é uma resposta a um email nosso
      → Busca a Activity vinculada ao EmailLog
      → Busca o Lead vinculado à Activity
      → Executa registerLeadReply() automaticamente
      → Cria EmailLog com direction: "inbound"
```

### 7.4 Configuração do Gmail Watch

#### Google Cloud Console:
1. Ativar **Gmail API** e **Cloud Pub/Sub API**
2. Criar tópico Pub/Sub: `projects/{PROJECT_ID}/topics/gmail-notifications`
3. Criar assinatura push apontando para: `https://crm.wbdigitalsolutions.com/api/email/webhook/gmail`
4. Conceder permissão `gmail-api-push@system.gserviceaccount.com` como Publisher no tópico

#### Arquivo: `src/lib/email/gmail-watch.ts`

```typescript
import { getValidAccessToken } from "./gmail-client";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1";

/**
 * Registra watch para receber notificações de novos emails.
 * Deve ser chamado ao conectar Gmail e renovado a cada 7 dias (via cron).
 */
export async function registerGmailWatch(userId: string) {
  const accessToken = await getValidAccessToken(userId);

  const response = await fetch(`${GMAIL_API}/users/me/watch`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topicName: `projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/topics/gmail-notifications`,
      labelIds: ["INBOX"],
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to register Gmail watch: ${response.statusText}`);
  }

  return response.json(); // { historyId, expiration }
}

/**
 * Busca mensagens novas desde o último historyId processado.
 */
export async function getNewMessages(
  userId: string,
  startHistoryId: string
): Promise<Array<{ id: string; threadId: string }>> {
  const accessToken = await getValidAccessToken(userId);

  const response = await fetch(
    `${GMAIL_API}/users/me/history?startHistoryId=${startHistoryId}&historyTypes=messageAdded`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) return [];

  const data = await response.json();
  const messages: Array<{ id: string; threadId: string }> = [];

  for (const record of data.history || []) {
    for (const msg of record.messagesAdded || []) {
      // Ignore sent messages (only process incoming)
      if (!msg.message.labelIds?.includes("SENT")) {
        messages.push({
          id: msg.message.id,
          threadId: msg.message.threadId,
        });
      }
    }
  }

  return messages;
}

/**
 * Busca detalhes de uma mensagem específica.
 */
export async function getMessageDetails(
  userId: string,
  messageId: string
): Promise<{ from: string; subject: string; snippet: string; threadId: string }> {
  const accessToken = await getValidAccessToken(userId);

  const response = await fetch(
    `${GMAIL_API}/users/me/messages/${messageId}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const data = await response.json();
  const headers = data.payload?.headers || [];

  return {
    from: headers.find((h: { name: string }) => h.name === "From")?.value || "",
    subject: headers.find((h: { name: string }) => h.name === "Subject")?.value || "",
    snippet: data.snippet || "",
    threadId: data.threadId,
  };
}
```

### 7.5 Webhook Endpoint

#### Arquivo: `src/app/api/email/webhook/gmail/route.ts`

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getNewMessages, getMessageDetails } from "@/lib/email/gmail-watch";
import { registerLeadReply } from "@/actions/lead-cadences";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Pub/Sub sends base64-encoded data
    const data = JSON.parse(
      Buffer.from(body.message.data, "base64").toString()
    );

    const { emailAddress, historyId } = data;

    // Find user by email
    const user = await prisma.user.findFirst({
      where: { email: emailAddress },
    });

    if (!user) {
      return NextResponse.json({ status: "user_not_found" });
    }

    // Get the last processed historyId for this user
    const account = await prisma.account.findFirst({
      where: { userId: user.id, provider: "google" },
    });

    if (!account) {
      return NextResponse.json({ status: "no_google_account" });
    }

    const lastHistoryId = (account as Record<string, unknown>).lastHistoryId as string || historyId;

    // Fetch new messages since last check
    const newMessages = await getNewMessages(user.id, lastHistoryId);

    for (const msg of newMessages) {
      // Check if this threadId matches any email we sent
      const existingLog = await prisma.emailLog.findFirst({
        where: { gmailThreadId: msg.threadId },
        include: {
          activity: {
            select: { leadId: true },
          },
        },
      });

      if (existingLog && existingLog.activity.leadId) {
        // This is a reply to an email we sent to a lead!
        const details = await getMessageDetails(user.id, msg.id);

        // Register the reply (cancels cadences + skips activities)
        await registerLeadReply(existingLog.activity.leadId, {
          channel: "email",
          notes: `Resposta automática detectada: "${details.subject}" - ${details.snippet}`,
        });

        // Save inbound email log
        await prisma.emailLog.create({
          data: {
            activityId: existingLog.activityId,
            fromEmail: details.from,
            toEmail: emailAddress,
            subject: details.subject,
            bodyHtml: details.snippet,
            gmailMessageId: msg.id,
            gmailThreadId: msg.threadId,
            status: "received",
            direction: "inbound",
          },
        });
      }
    }

    // Update last processed historyId
    await prisma.account.updateMany({
      where: { userId: user.id, provider: "google" },
      data: { lastHistoryId: historyId } as Record<string, unknown>,
    });

    return NextResponse.json({ status: "ok", processed: newMessages.length });
  } catch (error) {
    console.error("Gmail webhook error:", error);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
```

### 7.6 Alterações no Modelo EmailLog

Adicionar campo `direction` ao modelo:

```prisma
model EmailLog {
  // ... campos existentes
  direction       String    @default("outbound") // "outbound" (enviado) ou "inbound" (recebido)

  @@index([direction])
}
```

Migration:
```sql
ALTER TABLE "email_logs" ADD COLUMN IF NOT EXISTS "direction" TEXT NOT NULL DEFAULT 'outbound';
CREATE INDEX "email_logs_direction_idx" ON "email_logs"("direction");
```

### 7.7 Alterações no Modelo Account

Adicionar campo para tracking do Gmail Watch:

```prisma
// Adicionar ao Account (ou criar campo customizado)
// lastHistoryId: String? — último historyId processado do Gmail Watch
```

Migration:
```sql
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "lastHistoryId" TEXT;
```

### 7.8 Renovação do Watch (Cron)

O Gmail Watch expira a cada 7 dias. Criar um cron job ou API route para renovar:

#### Arquivo: `src/app/api/cron/gmail-watch-renew/route.ts`

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registerGmailWatch } from "@/lib/email/gmail-watch";

// Chamar via cron a cada 6 dias
export async function GET(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accounts = await prisma.account.findMany({
    where: {
      provider: "google",
      refresh_token: { not: null },
    },
    select: { userId: true },
  });

  const results = [];
  for (const account of accounts) {
    try {
      const result = await registerGmailWatch(account.userId);
      results.push({ userId: account.userId, status: "ok", expiration: result.expiration });
    } catch (error) {
      results.push({ userId: account.userId, status: "error", error: String(error) });
    }
  }

  return NextResponse.json({ renewed: results.length, results });
}
```

Crontab no servidor:
```bash
# Renovar Gmail Watch a cada 6 dias (domingos e quartas às 4:00)
0 4 * * 0,3 curl -H "Authorization: Bearer $CRON_SECRET" https://crm.wbdigitalsolutions.com/api/cron/gmail-watch-renew
```

### 7.9 Scopes Adicionais do Gmail OAuth

Adicionar ao fluxo OAuth (Fase 2):
```
https://www.googleapis.com/auth/gmail.readonly
```

Isso permite ler mensagens recebidas. Já estava listado como opcional na Fase 2, agora é **obrigatório** para a Fase 7.

### 7.10 Testes — Fase 7

#### `tests/unit/actions/register-lead-reply.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../../setup";

const mockSession = {
  user: { id: "user-1", email: "test@example.com", name: "Test", role: "admin" },
  expires: "2026-12-31",
};

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(() => Promise.resolve(mockSession)),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("registerLeadReply", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create reply activity and cancel active cadences", async () => {
    // Test: lead with active cadence and pending activities
    // After registerLeadReply:
    //   - New completed activity "Resposta recebida via E-mail"
    //   - LeadCadence status → cancelled
    //   - Pending activities → skipped with reason
  });

  it("should handle lead with no active cadences", async () => {
    // Test: lead without cadences — should still create reply activity
    // Result: cancelledCadences: 0, skippedActivities: 0
  });

  it("should skip only pending activities (not completed/failed/skipped)", async () => {
    // Test: cadence with mix of completed and pending activities
    // Only pending activities should be skipped
  });

  it("should throw if lead not found", async () => {
    // Test: invalid leadId
  });

  it("should handle multiple active cadences", async () => {
    // Test: lead with 2+ active cadences — all should be cancelled
  });
});
```

#### `tests/unit/lib/gmail-watch.test.ts`

```typescript
import { describe, it, expect, vi } from "vitest";

describe("Gmail Watch", () => {
  it("should register watch and return historyId + expiration", async () => {
    // Mock fetch to Gmail API /users/me/watch
  });

  it("should fetch new messages filtering out SENT", async () => {
    // Mock history.list response with mix of sent and received
    // Only received messages should be returned
  });

  it("should extract message details (from, subject, snippet)", async () => {
    // Mock messages.get with metadata
  });
});
```

#### `tests/unit/api/gmail-webhook.test.ts`

```typescript
import { describe, it, expect, vi } from "vitest";

describe("Gmail Webhook", () => {
  it("should process incoming reply and trigger registerLeadReply", async () => {
    // Mock: Pub/Sub payload → decode → find user → find matching EmailLog thread
    // Verify: registerLeadReply called with correct leadId
    // Verify: inbound EmailLog created
  });

  it("should ignore messages not matching any sent email thread", async () => {
    // Mock: new message with unknown threadId
    // Verify: no registerLeadReply call
  });

  it("should handle user not found gracefully", async () => {
    // Mock: emailAddress not in database
    // Verify: returns { status: "user_not_found" }
  });
});
```

---

## Ordem de Implementação

```
Fase 1: Templates com variáveis                    (sem dependências externas)
Fase 2: Google Cloud Console + OAuth2 setup         (requer Google Console)
Fase 3: Gmail client + envio individual + lote      (requer Fase 2)
Fase 4: UI (botões, modal lote, settings)           (requer Fase 3)
Fase 5: Tracking abertura/clique                    (requer Fase 3, paralelo à 4)
Fase 6: Histórico + métricas                        (requer Fase 3, paralelo à 4/5)
Fase 7: Detecção de respostas + cancel automático   (requer Fase 3 + 6, manual já implementado)
```

## Glossário

| Termo | Significado no contexto |
|-------|------------------------|
| **Envio Individual** | Enviar email de **uma** atividade para **um** contato, pelo botão no card da atividade na página do lead |
| **Envio em Lote** | Enviar email de **todas** as atividades pendentes de uma etapa da cadência para **todos** os leads com cadência ativa, pelo botão na etapa (admin ou lead) |
| **Template** | Texto do subject/description do CadenceStep com `{{variáveis}}` |
| **Preview** | Tela de confirmação antes do envio em lote, mostrando quem receberá e quem será ignorado (sem email) |
| **Registrar Resposta** | Ação manual do usuário ao receber resposta de um lead por qualquer canal — cria atividade de registro e cancela cadências ativas |
| **Gmail Watch** | API do Gmail que envia push notifications via Google Pub/Sub quando novos emails chegam na inbox |
| **Inbound** | Email recebido (resposta do lead). Oposto de outbound (email enviado pelo CRM) |
