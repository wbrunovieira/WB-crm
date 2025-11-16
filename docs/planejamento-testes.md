# Planejamento de Implementação de Testes - WB-CRM

## Visão Geral

Este documento detalha o planejamento completo para implementação de testes unitários e E2E no sistema WB-CRM usando **Vitest**.

### Análise do Backend Atual

- **150+ Server Actions** distribuídas em 20 arquivos (~5.599 linhas)
- **11 API endpoints** REST para integrações externas
- **11 Schemas de validação** Zod complexos
- **50+ modelos** de banco de dados com relações complexas
- **1 integração externa** (API de projetos)
- **Multi-tenancy crítico** via `ownerId` filtering

### Objetivos

1. **Cobertura de testes**: 80%+ de código crítico
2. **Testes unitários**: Server Actions, validações, lógica de negócio
3. **Testes E2E**: Fluxos completos de usuário
4. **Testes de integração**: API routes e banco de dados
5. **Performance**: Suite de testes < 30s

---

## FASE 1: Setup e Configuração (Semana 1) ✅ COMPLETA

**Status**: ✅ 100% Implementada
**Data de Conclusão**: 16/11/2024
**Testes Criados**: 13 testes passando
**Arquivos Criados**: 14 arquivos

### Resumo da Implementação

- ✅ Todas as dependências instaladas
- ✅ Vitest configurado com coverage
- ✅ Estrutura de diretórios criada
- ✅ Mocks globais configurados
- ✅ 30+ fixtures criados
- ✅ 7 scripts npm adicionados
- ✅ 2 arquivos de teste de validação
- ✅ Documentação completa

**Resultado**: 13/13 testes passando em ~400ms

Para detalhes completos, veja: [Fase 1 - Setup Completo](./fase1-setup-completo.md)

---

### 1.1 Instalação de Dependências ✅

```bash
npm install -D vitest @vitest/ui @vitest/coverage-v8
npm install -D @testing-library/react @testing-library/jest-dom
npm install -D @testing-library/user-event
npm install -D happy-dom # DOM environment para testes
npm install -D msw # Mock Service Worker para API mocking
npm install -D prisma-mock # Mock para Prisma Client
```

### 1.2 Configuração do Vitest

**Arquivo: `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.{js,ts}',
        '**/types/**',
        '**/*.d.ts',
      ],
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80,
    },
    mockReset: true,
    restoreMocks: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### 1.3 Estrutura de Diretórios de Testes

```
tests/
├── setup.ts                          # Configuração global
├── fixtures/                         # Dados de teste reutilizáveis
│   ├── users.ts
│   ├── leads.ts
│   ├── organizations.ts
│   ├── deals.ts
│   ├── contacts.ts
│   └── activities.ts
├── mocks/                            # Mocks globais
│   ├── prisma.ts                     # Mock do Prisma Client
│   ├── next-auth.ts                  # Mock de sessão
│   └── external-api.ts               # Mock da API externa
├── unit/                             # Testes unitários
│   ├── actions/
│   │   ├── leads.test.ts
│   │   ├── organizations.test.ts
│   │   ├── deals.test.ts
│   │   ├── contacts.test.ts
│   │   ├── activities.test.ts
│   │   ├── partners.test.ts
│   │   ├── products.test.ts
│   │   ├── tech-stack.test.ts
│   │   └── conversion.test.ts        # Lead → Org conversion
│   ├── validations/
│   │   ├── lead.test.ts
│   │   ├── organization.test.ts
│   │   ├── deal.test.ts
│   │   └── product.test.ts
│   └── lib/
│       ├── auth.test.ts
│       └── utils.test.ts
├── integration/                      # Testes de integração
│   ├── api/
│   │   ├── contacts.test.ts
│   │   ├── deals.test.ts
│   │   ├── activities.test.ts
│   │   └── register.test.ts
│   └── database/
│       ├── lead-conversion.test.ts
│       └── cascade-deletes.test.ts
└── e2e/                              # Testes E2E
    ├── auth-flow.test.ts
    ├── lead-to-deal-pipeline.test.ts
    ├── activity-management.test.ts
    └── tech-stack-tracking.test.ts
```

### 1.4 Arquivo de Setup Global

**Arquivo: `tests/setup.ts`**

```typescript
import { beforeAll, afterEach, afterAll, vi } from 'vitest';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import type { PrismaClient } from '@prisma/client';

// Mock Prisma Client
export const prismaMock = mockDeep<PrismaClient>();

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}));

// Mock NextAuth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

// Mock revalidatePath
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

beforeAll(() => {
  // Setup global antes de todos os testes
});

afterEach(() => {
  // Limpar mocks após cada teste
  mockReset(prismaMock);
  vi.clearAllMocks();
});

afterAll(() => {
  // Cleanup após todos os testes
});
```

### 1.5 Scripts no package.json ✅

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:e2e": "vitest run tests/e2e",
    "test:watch": "vitest watch"
  }
}
```

**Status**: ✅ Implementado

### 1.6 Métricas de Sucesso - Fase 1 ✅

**Todas as metas foram atingidas:**

- [x] Vitest instalado e configurado
- [x] Estrutura de diretórios criada
- [x] Mocks globais funcionando (Prisma, NextAuth, Next.js)
- [x] 30+ fixtures criados para todos os modelos principais
- [x] 7 scripts npm adicionados ao package.json
- [x] 2 arquivos de teste de validação criados
- [x] 13 testes passando (100% de sucesso)
- [x] Documentação completa (README.md + fase1-setup-completo.md)
- [x] .gitignore atualizado

**Arquivos Criados**: 14
**Fixtures Criados**: 30+
**Testes Passando**: 13/13 ✅
**Tempo de Execução**: ~400ms
**Coverage**: 0% (esperado - ainda sem testes de código de produção)

**Status Final**: ✅ FASE 1 COMPLETA - PRONTA PARA FASE 2

---

## FASE 2: Testes Unitários - Validações (Semana 2)

### Prioridade: ALTA
Testes de schemas Zod são rápidos e garantem validação de entrada.

### 2.1 Testes de Validação - Lead Schema

**Arquivo: `tests/unit/validations/lead.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { leadSchema } from '@/lib/validations/lead';

describe('Lead Validation Schema', () => {
  describe('businessName validation', () => {
    it('should accept valid business name', () => {
      const data = { businessName: 'Empresa Teste LTDA' };
      const result = leadSchema.parse(data);
      expect(result.businessName).toBe('Empresa Teste LTDA');
    });

    it('should reject business name with less than 2 characters', () => {
      const data = { businessName: 'A' };
      expect(() => leadSchema.parse(data)).toThrow();
    });

    it('should reject empty business name', () => {
      const data = { businessName: '' };
      expect(() => leadSchema.parse(data)).toThrow();
    });
  });

  describe('email validation', () => {
    it('should accept valid email', () => {
      const data = {
        businessName: 'Test',
        email: 'test@example.com'
      };
      const result = leadSchema.parse(data);
      expect(result.email).toBe('test@example.com');
    });

    it('should accept empty string for email', () => {
      const data = {
        businessName: 'Test',
        email: ''
      };
      const result = leadSchema.parse(data);
      expect(result.email).toBe('');
    });

    it('should reject invalid email format', () => {
      const data = {
        businessName: 'Test',
        email: 'invalid-email'
      };
      expect(() => leadSchema.parse(data)).toThrow();
    });
  });

  describe('quality enum validation', () => {
    it('should accept valid quality values', () => {
      const qualities = ['cold', 'warm', 'hot'];

      qualities.forEach(quality => {
        const data = { businessName: 'Test', quality };
        const result = leadSchema.parse(data);
        expect(result.quality).toBe(quality);
      });
    });

    it('should reject invalid quality value', () => {
      const data = {
        businessName: 'Test',
        quality: 'invalid'
      };
      expect(() => leadSchema.parse(data)).toThrow();
    });
  });

  describe('status enum validation', () => {
    it('should accept valid status values', () => {
      const statuses = ['new', 'contacted', 'qualified', 'disqualified'];

      statuses.forEach(status => {
        const data = { businessName: 'Test', status };
        const result = leadSchema.parse(data);
        expect(result.status).toBe(status);
      });
    });
  });

  describe('Google Places fields validation', () => {
    it('should accept valid rating (0-5)', () => {
      const data = {
        businessName: 'Test',
        rating: 4.5
      };
      const result = leadSchema.parse(data);
      expect(result.rating).toBe(4.5);
    });

    it('should accept valid priceLevel (0-4)', () => {
      const data = {
        businessName: 'Test',
        priceLevel: 2
      };
      const result = leadSchema.parse(data);
      expect(result.priceLevel).toBe(2);
    });

    it('should accept userRatingsTotal', () => {
      const data = {
        businessName: 'Test',
        userRatingsTotal: 150
      };
      const result = leadSchema.parse(data);
      expect(result.userRatingsTotal).toBe(150);
    });

    it('should accept permanentlyClosed boolean', () => {
      const data = {
        businessName: 'Test',
        permanentlyClosed: true
      };
      const result = leadSchema.parse(data);
      expect(result.permanentlyClosed).toBe(true);
    });
  });

  describe('optional fields', () => {
    it('should accept lead with minimal required fields', () => {
      const data = { businessName: 'Test' };
      const result = leadSchema.parse(data);
      expect(result.businessName).toBe('Test');
    });

    it('should accept lead with all fields', () => {
      const data = {
        businessName: 'Test Company',
        registeredName: 'Test Company LTDA',
        email: 'test@test.com',
        phone: '+5511999999999',
        whatsapp: '+5511999999999',
        website: 'https://test.com',
        address: 'Rua Test, 123',
        city: 'São Paulo',
        state: 'SP',
        country: 'Brasil',
        zipCode: '01234-567',
        instagram: '@test',
        linkedin: 'company/test',
        quality: 'hot',
        status: 'qualified',
      };

      const result = leadSchema.parse(data);
      expect(result).toMatchObject(data);
    });
  });
});
```

### 2.2 Testes de Validação - Deal Schema

**Arquivo: `tests/unit/validations/deal.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { dealSchema } from '@/lib/validations/deal';

describe('Deal Validation Schema', () => {
  it('should accept valid deal with required fields', () => {
    const data = {
      title: 'Deal Test',
      stageId: 'stage-123',
      value: 10000,
    };
    const result = dealSchema.parse(data);
    expect(result).toMatchObject(data);
  });

  it('should reject deal without title', () => {
    const data = { stageId: 'stage-123' };
    expect(() => dealSchema.parse(data)).toThrow();
  });

  it('should reject negative value', () => {
    const data = {
      title: 'Test',
      stageId: 'stage-123',
      value: -100,
    };
    expect(() => dealSchema.parse(data)).toThrow();
  });

  it('should accept valid currency codes', () => {
    const currencies = ['BRL', 'USD', 'EUR'];

    currencies.forEach(currency => {
      const data = {
        title: 'Test',
        stageId: 'stage-123',
        currency,
      };
      const result = dealSchema.parse(data);
      expect(result.currency).toBe(currency);
    });
  });

  it('should accept valid status values', () => {
    const statuses = ['open', 'won', 'lost'];

    statuses.forEach(status => {
      const data = {
        title: 'Test',
        stageId: 'stage-123',
        status,
      };
      const result = dealSchema.parse(data);
      expect(result.status).toBe(status);
    });
  });

  it('should accept optional contactId and organizationId', () => {
    const data = {
      title: 'Test',
      stageId: 'stage-123',
      contactId: 'contact-123',
      organizationId: 'org-123',
    };
    const result = dealSchema.parse(data);
    expect(result.contactId).toBe('contact-123');
    expect(result.organizationId).toBe('org-123');
  });
});
```

### 2.3 Métricas de Sucesso - Fase 2

- [ ] 100% de cobertura dos schemas de validação
- [ ] Testes para todos os campos obrigatórios
- [ ] Testes para todos os enums
- [ ] Testes para validações de formato (email, URL)
- [ ] Testes para ranges numéricos
- [ ] Testes de edge cases (strings vazias, null, undefined)

**Estimativa de Testes:** ~150 test cases para 11 schemas

---

## FASE 3: Testes Unitários - Server Actions Simples (Semana 3)

### Prioridade: ALTA
CRUD básico de entidades principais.

### 3.1 Exemplo: Testes de Contacts Actions

**Arquivo: `tests/unit/actions/contacts.test.ts`**

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getServerSession } from 'next-auth';
import { prismaMock } from '../../setup';
import {
  getContacts,
  getContactById,
  createContact,
  updateContact,
  deleteContact,
} from '@/actions/contacts';

// Mock session
const mockSession = {
  user: {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
  },
  expires: '2024-12-31',
};

vi.mocked(getServerSession).mockResolvedValue(mockSession);

describe('Contacts Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getContacts', () => {
    it('should return contacts for authenticated user', async () => {
      const mockContacts = [
        {
          id: 'contact-1',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+5511999999999',
          ownerId: 'user-123',
          organizationId: 'org-1',
          organization: { id: 'org-1', name: 'Company A' },
        },
      ];

      prismaMock.contact.findMany.mockResolvedValue(mockContacts as any);

      const result = await getContacts();

      expect(result).toEqual(mockContacts);
      expect(prismaMock.contact.findMany).toHaveBeenCalledWith({
        where: { ownerId: 'user-123' },
        include: { organization: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter contacts by search term', async () => {
      prismaMock.contact.findMany.mockResolvedValue([]);

      await getContacts({ search: 'John' });

      expect(prismaMock.contact.findMany).toHaveBeenCalledWith({
        where: {
          ownerId: 'user-123',
          OR: [
            { name: { contains: 'John' } },
            { email: { contains: 'John' } },
          ],
        },
        include: { organization: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should throw error if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      await expect(getContacts()).rejects.toThrow('Não autorizado');
    });
  });

  describe('getContactById', () => {
    it('should return contact by id', async () => {
      const mockContact = {
        id: 'contact-1',
        name: 'John Doe',
        email: 'john@example.com',
        ownerId: 'user-123',
      };

      prismaMock.contact.findUnique.mockResolvedValue(mockContact as any);

      const result = await getContactById('contact-1');

      expect(result).toEqual(mockContact);
      expect(prismaMock.contact.findUnique).toHaveBeenCalledWith({
        where: { id: 'contact-1' },
        include: expect.any(Object),
      });
    });

    it('should throw error if contact not found', async () => {
      prismaMock.contact.findUnique.mockResolvedValue(null);

      await expect(getContactById('invalid-id')).rejects.toThrow(
        'Contato não encontrado'
      );
    });

    it('should throw error if contact belongs to another user', async () => {
      const mockContact = {
        id: 'contact-1',
        ownerId: 'other-user',
      };

      prismaMock.contact.findUnique.mockResolvedValue(mockContact as any);

      await expect(getContactById('contact-1')).rejects.toThrow(
        'Não autorizado'
      );
    });
  });

  describe('createContact', () => {
    it('should create contact with valid data', async () => {
      const contactData = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '+5511888888888',
        organizationId: 'org-1',
      };

      const createdContact = {
        id: 'contact-new',
        ...contactData,
        ownerId: 'user-123',
      };

      prismaMock.contact.create.mockResolvedValue(createdContact as any);

      const result = await createContact(contactData);

      expect(result).toEqual(createdContact);
      expect(prismaMock.contact.create).toHaveBeenCalledWith({
        data: {
          ...contactData,
          ownerId: 'user-123',
        },
      });
    });

    it('should throw validation error for invalid data', async () => {
      const invalidData = { name: '' }; // Missing required field

      await expect(createContact(invalidData as any)).rejects.toThrow();
    });
  });

  describe('updateContact', () => {
    it('should update contact with valid data', async () => {
      const existingContact = {
        id: 'contact-1',
        ownerId: 'user-123',
      };

      const updateData = {
        name: 'John Updated',
        email: 'john.updated@example.com',
      };

      const updatedContact = {
        ...existingContact,
        ...updateData,
      };

      prismaMock.contact.findUnique.mockResolvedValue(existingContact as any);
      prismaMock.contact.update.mockResolvedValue(updatedContact as any);

      const result = await updateContact('contact-1', updateData);

      expect(result).toEqual(updatedContact);
      expect(prismaMock.contact.update).toHaveBeenCalledWith({
        where: { id: 'contact-1' },
        data: updateData,
      });
    });

    it('should throw error if trying to update another users contact', async () => {
      const existingContact = {
        id: 'contact-1',
        ownerId: 'other-user',
      };

      prismaMock.contact.findUnique.mockResolvedValue(existingContact as any);

      await expect(
        updateContact('contact-1', { name: 'Test' })
      ).rejects.toThrow('Não autorizado');
    });
  });

  describe('deleteContact', () => {
    it('should delete contact', async () => {
      const existingContact = {
        id: 'contact-1',
        ownerId: 'user-123',
      };

      prismaMock.contact.findUnique.mockResolvedValue(existingContact as any);
      prismaMock.contact.delete.mockResolvedValue(existingContact as any);

      await deleteContact('contact-1');

      expect(prismaMock.contact.delete).toHaveBeenCalledWith({
        where: { id: 'contact-1' },
      });
    });

    it('should throw error if trying to delete another users contact', async () => {
      const existingContact = {
        id: 'contact-1',
        ownerId: 'other-user',
      };

      prismaMock.contact.findUnique.mockResolvedValue(existingContact as any);

      await expect(deleteContact('contact-1')).rejects.toThrow(
        'Não autorizado'
      );
    });
  });
});
```

### 3.2 Métricas de Sucesso - Fase 3

- [ ] Testes para CRUD de Contacts (5 actions)
- [ ] Testes para CRUD de Organizations (5 actions)
- [ ] Testes para CRUD de Leads (5 actions)
- [ ] Testes para CRUD de Deals (6 actions)
- [ ] Testes para CRUD de Activities (6 actions)
- [ ] Testes para CRUD de Partners (5 actions)
- [ ] Validação de autenticação em todas as actions
- [ ] Validação de ownership (ownerId) em todas as actions

**Estimativa de Testes:** ~200 test cases para CRUDs básicos

---

## FASE 4: Testes Unitários - Lógica de Negócio Complexa (Semana 4-5)

### Prioridade: CRÍTICA
Testes da lógica mais complexa e crítica do sistema.

### 4.1 Testes de Conversão Lead → Organization

**Arquivo: `tests/unit/actions/conversion.test.ts`**

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getServerSession } from 'next-auth';
import { prismaMock } from '../../setup';
import { convertLeadToOrganization } from '@/actions/leads';

const mockSession = {
  user: { id: 'user-123', email: 'test@test.com', name: 'Test', role: 'user' },
  expires: '2024-12-31',
};

vi.mocked(getServerSession).mockResolvedValue(mockSession);

describe('Lead to Organization Conversion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('convertLeadToOrganization', () => {
    it('should convert lead with contacts to organization', async () => {
      const mockLead = {
        id: 'lead-1',
        businessName: 'Test Company',
        email: 'test@company.com',
        phone: '+5511999999999',
        website: 'https://test.com',
        ownerId: 'user-123',
        convertedToOrganizationId: null,
        leadContacts: [
          {
            id: 'lead-contact-1',
            name: 'John Doe',
            email: 'john@test.com',
            role: 'CEO',
            isPrimary: true,
          },
          {
            id: 'lead-contact-2',
            name: 'Jane Smith',
            email: 'jane@test.com',
            role: 'CTO',
            isPrimary: false,
          },
        ],
      };

      const mockOrganization = {
        id: 'org-new',
        name: 'Test Company',
        email: 'test@company.com',
        phone: '+5511999999999',
        website: 'https://test.com',
        ownerId: 'user-123',
        sourceLeadId: 'lead-1',
      };

      const mockContacts = [
        {
          id: 'contact-1',
          name: 'John Doe',
          email: 'john@test.com',
          role: 'CEO',
          isPrimary: true,
          organizationId: 'org-new',
          sourceLeadContactId: 'lead-contact-1',
        },
        {
          id: 'contact-2',
          name: 'Jane Smith',
          email: 'jane@test.com',
          role: 'CTO',
          isPrimary: false,
          organizationId: 'org-new',
          sourceLeadContactId: 'lead-contact-2',
        },
      ];

      // Mock transaction
      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        // Mock dentro da transação
        prismaMock.lead.findUnique.mockResolvedValue(mockLead as any);
        prismaMock.organization.create.mockResolvedValue(mockOrganization as any);
        prismaMock.contact.create
          .mockResolvedValueOnce(mockContacts[0] as any)
          .mockResolvedValueOnce(mockContacts[1] as any);
        prismaMock.leadContact.update.mockResolvedValue({} as any);
        prismaMock.lead.update.mockResolvedValue({
          ...mockLead,
          convertedToOrganizationId: 'org-new',
        } as any);

        return callback(prismaMock);
      });

      const result = await convertLeadToOrganization('lead-1');

      expect(result).toMatchObject({
        organization: mockOrganization,
        contacts: expect.arrayContaining([
          expect.objectContaining({ name: 'John Doe' }),
          expect.objectContaining({ name: 'Jane Smith' }),
        ]),
      });
    });

    it('should throw error if lead has no contacts', async () => {
      const mockLead = {
        id: 'lead-1',
        businessName: 'Test',
        ownerId: 'user-123',
        leadContacts: [],
      };

      prismaMock.lead.findUnique.mockResolvedValue(mockLead as any);

      await expect(convertLeadToOrganization('lead-1')).rejects.toThrow(
        'Lead deve ter pelo menos um contato'
      );
    });

    it('should throw error if lead already converted', async () => {
      const mockLead = {
        id: 'lead-1',
        businessName: 'Test',
        ownerId: 'user-123',
        convertedToOrganizationId: 'org-existing',
        leadContacts: [{ id: 'lc-1', name: 'Test' }],
      };

      prismaMock.lead.findUnique.mockResolvedValue(mockLead as any);

      await expect(convertLeadToOrganization('lead-1')).rejects.toThrow(
        'Lead já foi convertido'
      );
    });

    it('should migrate tech profile from lead to organization', async () => {
      const mockLead = {
        id: 'lead-1',
        businessName: 'Test',
        ownerId: 'user-123',
        primaryCNAEId: 'cnae-123',
        leadContacts: [{ id: 'lc-1', name: 'Test' }],
        leadLanguages: [
          { languageId: 'lang-1' },
          { languageId: 'lang-2' },
        ],
        leadFrameworks: [{ frameworkId: 'fw-1' }],
        secondaryCNAEs: [
          { cnaeId: 'cnae-456' },
          { cnaeId: 'cnae-789' },
        ],
      };

      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        prismaMock.lead.findUnique.mockResolvedValue(mockLead as any);
        prismaMock.organization.create.mockResolvedValue({ id: 'org-1' } as any);
        prismaMock.contact.create.mockResolvedValue({ id: 'contact-1' } as any);
        prismaMock.leadContact.update.mockResolvedValue({} as any);
        prismaMock.organizationLanguage.createMany.mockResolvedValue({ count: 2 } as any);
        prismaMock.organizationFramework.createMany.mockResolvedValue({ count: 1 } as any);
        prismaMock.organizationSecondaryCNAE.createMany.mockResolvedValue({ count: 2 } as any);
        prismaMock.lead.update.mockResolvedValue({} as any);

        return callback(prismaMock);
      });

      await convertLeadToOrganization('lead-1');

      expect(prismaMock.organization.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          primaryCNAEId: 'cnae-123',
        }),
      });
    });

    it('should rollback on error during conversion', async () => {
      const mockLead = {
        id: 'lead-1',
        businessName: 'Test',
        ownerId: 'user-123',
        leadContacts: [{ id: 'lc-1', name: 'Test' }],
      };

      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        prismaMock.lead.findUnique.mockResolvedValue(mockLead as any);
        prismaMock.organization.create.mockRejectedValue(
          new Error('Database error')
        );

        return callback(prismaMock);
      });

      await expect(convertLeadToOrganization('lead-1')).rejects.toThrow();

      // Verify rollback - nothing was persisted
      expect(prismaMock.lead.update).not.toHaveBeenCalled();
    });
  });
});
```

### 4.2 Testes de Product Links com Cálculos

**Arquivo: `tests/unit/actions/product-links.test.ts`**

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getServerSession } from 'next-auth';
import { prismaMock } from '../../setup';
import {
  addProductToDeal,
  updateDealProduct,
  getDealProducts,
} from '@/actions/product-links';

const mockSession = {
  user: { id: 'user-123', email: 'test@test.com', name: 'Test', role: 'user' },
  expires: '2024-12-31',
};

vi.mocked(getServerSession).mockResolvedValue(mockSession);

describe('Deal Product Links', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addProductToDeal', () => {
    it('should add product to deal with correct total calculation', async () => {
      const dealProductData = {
        dealId: 'deal-1',
        productId: 'product-1',
        quantity: 3,
        unitPrice: 1000,
        discount: 150,
        description: 'Custom e-commerce',
        deliveryTime: 30,
      };

      // totalValue = (quantity × unitPrice) - discount
      // totalValue = (3 × 1000) - 150 = 2850
      const expectedTotal = 2850;

      const mockDeal = {
        id: 'deal-1',
        ownerId: 'user-123',
      };

      const mockProduct = {
        id: 'product-1',
        name: 'E-commerce',
        isActive: true,
      };

      const mockDealProduct = {
        id: 'dp-1',
        ...dealProductData,
        totalValue: expectedTotal,
      };

      prismaMock.deal.findUnique.mockResolvedValue(mockDeal as any);
      prismaMock.product.findUnique.mockResolvedValue(mockProduct as any);
      prismaMock.dealProduct.create.mockResolvedValue(mockDealProduct as any);

      const result = await addProductToDeal(dealProductData);

      expect(result.totalValue).toBe(expectedTotal);
      expect(prismaMock.dealProduct.create).toHaveBeenCalledWith({
        data: {
          ...dealProductData,
          totalValue: expectedTotal,
        },
        include: { product: true },
      });
    });

    it('should prevent adding same product twice to deal', async () => {
      const dealProductData = {
        dealId: 'deal-1',
        productId: 'product-1',
        quantity: 1,
        unitPrice: 1000,
      };

      const mockDeal = { id: 'deal-1', ownerId: 'user-123' };
      const mockProduct = { id: 'product-1', isActive: true };

      prismaMock.deal.findUnique.mockResolvedValue(mockDeal as any);
      prismaMock.product.findUnique.mockResolvedValue(mockProduct as any);
      prismaMock.dealProduct.create.mockRejectedValue(
        new Error('Unique constraint failed')
      );

      await expect(addProductToDeal(dealProductData)).rejects.toThrow();
    });

    it('should throw error if product is inactive', async () => {
      const dealProductData = {
        dealId: 'deal-1',
        productId: 'product-1',
        quantity: 1,
        unitPrice: 1000,
      };

      const mockDeal = { id: 'deal-1', ownerId: 'user-123' };
      const mockProduct = { id: 'product-1', isActive: false };

      prismaMock.deal.findUnique.mockResolvedValue(mockDeal as any);
      prismaMock.product.findUnique.mockResolvedValue(mockProduct as any);

      await expect(addProductToDeal(dealProductData)).rejects.toThrow(
        'Produto inativo'
      );
    });
  });

  describe('updateDealProduct', () => {
    it('should recalculate total when quantity changes', async () => {
      const updateData = {
        quantity: 5, // changed from 3 to 5
        unitPrice: 1000,
        discount: 150,
      };

      // New total: (5 × 1000) - 150 = 4850
      const expectedTotal = 4850;

      const existingDealProduct = {
        id: 'dp-1',
        dealId: 'deal-1',
        productId: 'product-1',
        quantity: 3,
        unitPrice: 1000,
        discount: 150,
        totalValue: 2850,
        deal: { ownerId: 'user-123' },
      };

      prismaMock.dealProduct.findUnique.mockResolvedValue(
        existingDealProduct as any
      );
      prismaMock.dealProduct.update.mockResolvedValue({
        ...existingDealProduct,
        ...updateData,
        totalValue: expectedTotal,
      } as any);

      const result = await updateDealProduct('dp-1', updateData);

      expect(result.totalValue).toBe(expectedTotal);
    });

    it('should recalculate total when discount changes', async () => {
      const updateData = {
        quantity: 3,
        unitPrice: 1000,
        discount: 300, // changed from 150 to 300
      };

      // New total: (3 × 1000) - 300 = 2700
      const expectedTotal = 2700;

      const existingDealProduct = {
        id: 'dp-1',
        dealId: 'deal-1',
        deal: { ownerId: 'user-123' },
      };

      prismaMock.dealProduct.findUnique.mockResolvedValue(
        existingDealProduct as any
      );
      prismaMock.dealProduct.update.mockResolvedValue({
        ...updateData,
        totalValue: expectedTotal,
      } as any);

      const result = await updateDealProduct('dp-1', updateData);

      expect(result.totalValue).toBe(expectedTotal);
    });
  });
});
```

### 4.3 Testes de Tech Stack Management

**Arquivo: `tests/unit/actions/tech-stack.test.ts`**

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getServerSession } from 'next-auth';
import { prismaMock } from '../../setup';
import {
  addLanguageToDeal,
  setPrimaryLanguage,
  removeLanguageFromDeal,
  getDealTechStack,
} from '@/actions/deal-tech-stack';

const mockSession = {
  user: { id: 'user-123', email: 'test@test.com', name: 'Test', role: 'user' },
  expires: '2024-12-31',
};

vi.mocked(getServerSession).mockResolvedValue(mockSession);

describe('Deal Tech Stack Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addLanguageToDeal', () => {
    it('should add language to deal', async () => {
      const mockDeal = { id: 'deal-1', ownerId: 'user-123' };
      const mockLanguage = { id: 'lang-1', name: 'JavaScript', isActive: true };
      const mockDealLanguage = {
        id: 'dl-1',
        dealId: 'deal-1',
        languageId: 'lang-1',
        isPrimary: false,
      };

      prismaMock.deal.findUnique.mockResolvedValue(mockDeal as any);
      prismaMock.techLanguage.findUnique.mockResolvedValue(mockLanguage as any);
      prismaMock.dealLanguage.create.mockResolvedValue(mockDealLanguage as any);

      const result = await addLanguageToDeal('deal-1', 'lang-1');

      expect(result).toMatchObject(mockDealLanguage);
      expect(prismaMock.dealLanguage.create).toHaveBeenCalledWith({
        data: {
          dealId: 'deal-1',
          languageId: 'lang-1',
          isPrimary: false,
        },
        include: { language: true },
      });
    });

    it('should prevent adding duplicate language to deal', async () => {
      const mockDeal = { id: 'deal-1', ownerId: 'user-123' };
      const mockLanguage = { id: 'lang-1', isActive: true };

      prismaMock.deal.findUnique.mockResolvedValue(mockDeal as any);
      prismaMock.techLanguage.findUnique.mockResolvedValue(mockLanguage as any);
      prismaMock.dealLanguage.create.mockRejectedValue(
        new Error('Unique constraint failed')
      );

      await expect(addLanguageToDeal('deal-1', 'lang-1')).rejects.toThrow();
    });
  });

  describe('setPrimaryLanguage', () => {
    it('should set language as primary and unset others', async () => {
      const mockDeal = { id: 'deal-1', ownerId: 'user-123' };
      const mockDealLanguages = [
        { id: 'dl-1', dealId: 'deal-1', languageId: 'lang-1', isPrimary: true },
        { id: 'dl-2', dealId: 'deal-1', languageId: 'lang-2', isPrimary: false },
      ];

      prismaMock.deal.findUnique.mockResolvedValue(mockDeal as any);
      prismaMock.dealLanguage.findUnique.mockResolvedValue(
        mockDealLanguages[1] as any
      );
      prismaMock.dealLanguage.updateMany.mockResolvedValue({ count: 1 } as any);
      prismaMock.dealLanguage.update.mockResolvedValue({
        ...mockDealLanguages[1],
        isPrimary: true,
      } as any);

      const result = await setPrimaryLanguage('deal-1', 'lang-2');

      // Should unset all as primary first
      expect(prismaMock.dealLanguage.updateMany).toHaveBeenCalledWith({
        where: { dealId: 'deal-1' },
        data: { isPrimary: false },
      });

      // Then set the specific one as primary
      expect(prismaMock.dealLanguage.update).toHaveBeenCalledWith({
        where: { id: 'dl-2' },
        data: { isPrimary: true },
      });

      expect(result.isPrimary).toBe(true);
    });
  });

  describe('getDealTechStack', () => {
    it('should return complete tech stack for deal', async () => {
      const mockDeal = {
        id: 'deal-1',
        ownerId: 'user-123',
        dealTechStacks: [
          { techCategory: { id: 'cat-1', name: 'Frontend' } },
        ],
        dealLanguages: [
          {
            language: { id: 'lang-1', name: 'JavaScript' },
            isPrimary: true,
          },
          {
            language: { id: 'lang-2', name: 'TypeScript' },
            isPrimary: false,
          },
        ],
        dealFrameworks: [
          { framework: { id: 'fw-1', name: 'React' } },
          { framework: { id: 'fw-2', name: 'Next.js' } },
        ],
      };

      prismaMock.deal.findUnique.mockResolvedValue(mockDeal as any);

      const result = await getDealTechStack('deal-1');

      expect(result).toMatchObject({
        categories: [{ id: 'cat-1', name: 'Frontend' }],
        languages: [
          { id: 'lang-1', name: 'JavaScript', isPrimary: true },
          { id: 'lang-2', name: 'TypeScript', isPrimary: false },
        ],
        frameworks: [
          { id: 'fw-1', name: 'React' },
          { id: 'fw-2', name: 'Next.js' },
        ],
      });
    });
  });
});
```

### 4.4 Métricas de Sucesso - Fase 4

- [ ] 100% cobertura de convertLeadToOrganization
- [ ] Testes de rollback em transações
- [ ] Testes de cálculos de produtos (totalValue)
- [ ] Testes de tech stack (add/remove/primary)
- [ ] Testes de CNAE (search, add/remove secondary)
- [ ] Testes de external project links (JSON array manipulation)
- [ ] Testes de activity multi-entity linking
- [ ] Testes de cascade deletes

**Estimativa de Testes:** ~100 test cases para lógica complexa

---

## FASE 5: Testes de Integração - API Routes (Semana 6)

### Prioridade: MÉDIA
Testes de endpoints REST com banco de dados.

### 5.1 Setup para Testes de Integração

**Arquivo: `tests/integration/setup.ts`**

```typescript
import { beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';

// Usar banco SQLite separado para testes
process.env.DATABASE_URL = 'file:./test.db';

beforeAll(async () => {
  // Criar schema de teste
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  execSync('npx prisma db push', { stdio: 'inherit' });
});

afterAll(async () => {
  // Limpar banco de teste
  execSync('rm -f ./test.db', { stdio: 'inherit' });
});
```

### 5.2 Exemplo: Testes de API de Contacts

**Arquivo: `tests/integration/api/contacts.test.ts`**

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GET, POST } from '@/app/api/contacts/route';
import { GET as GET_BY_ID, PATCH, DELETE } from '@/app/api/contacts/[id]/route';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { vi } from 'vitest';

// Mock session
const mockSession = {
  user: { id: 'user-test', email: 'test@test.com', name: 'Test', role: 'user' },
  expires: '2024-12-31',
};

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

describe('Contacts API Integration', () => {
  let testUserId: string;
  let testContactId: string;

  beforeEach(async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);

    // Criar usuário de teste
    const user = await prisma.user.create({
      data: {
        id: 'user-test',
        email: 'test@test.com',
        name: 'Test User',
        password: 'hashed',
      },
    });
    testUserId = user.id;
  });

  afterEach(async () => {
    // Limpar dados de teste
    await prisma.contact.deleteMany({ where: { ownerId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
  });

  describe('GET /api/contacts', () => {
    it('should return contacts for authenticated user', async () => {
      // Criar contatos de teste
      await prisma.contact.createMany({
        data: [
          {
            name: 'John Doe',
            email: 'john@example.com',
            ownerId: testUserId,
          },
          {
            name: 'Jane Smith',
            email: 'jane@example.com',
            ownerId: testUserId,
          },
        ],
      });

      const request = new Request('http://localhost:3000/api/contacts');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(2);
      expect(data[0]).toHaveProperty('name');
      expect(data[0]).toHaveProperty('email');
    });

    it('should filter contacts by search query', async () => {
      await prisma.contact.createMany({
        data: [
          { name: 'John Doe', email: 'john@example.com', ownerId: testUserId },
          { name: 'Jane Smith', email: 'jane@example.com', ownerId: testUserId },
        ],
      });

      const request = new Request('http://localhost:3000/api/contacts?search=John');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe('John Doe');
    });

    it('should return empty array if no contacts', async () => {
      const request = new Request('http://localhost:3000/api/contacts');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
    });

    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const request = new Request('http://localhost:3000/api/contacts');
      const response = await GET(request);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/contacts', () => {
    it('should create contact with valid data', async () => {
      const contactData = {
        name: 'New Contact',
        email: 'new@example.com',
        phone: '+5511999999999',
      };

      const request = new Request('http://localhost:3000/api/contacts', {
        method: 'POST',
        body: JSON.stringify(contactData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toMatchObject(contactData);
      expect(data.ownerId).toBe(testUserId);

      // Verificar no banco
      const dbContact = await prisma.contact.findUnique({
        where: { id: data.id },
      });
      expect(dbContact).toBeTruthy();
      expect(dbContact?.name).toBe('New Contact');
    });

    it('should return 400 for invalid data', async () => {
      const invalidData = { name: '' }; // Name too short

      const request = new Request('http://localhost:3000/api/contacts', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/contacts/[id]', () => {
    beforeEach(async () => {
      const contact = await prisma.contact.create({
        data: {
          name: 'Test Contact',
          email: 'test@example.com',
          ownerId: testUserId,
        },
      });
      testContactId = contact.id;
    });

    it('should return contact by id', async () => {
      const request = new Request(
        `http://localhost:3000/api/contacts/${testContactId}`
      );
      const response = await GET_BY_ID(request, {
        params: { id: testContactId },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(testContactId);
      expect(data.name).toBe('Test Contact');
    });

    it('should return 404 for non-existent contact', async () => {
      const request = new Request(
        'http://localhost:3000/api/contacts/non-existent'
      );
      const response = await GET_BY_ID(request, {
        params: { id: 'non-existent' },
      });

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/contacts/[id]', () => {
    beforeEach(async () => {
      const contact = await prisma.contact.create({
        data: {
          name: 'Old Name',
          email: 'old@example.com',
          ownerId: testUserId,
        },
      });
      testContactId = contact.id;
    });

    it('should update contact', async () => {
      const updateData = {
        name: 'New Name',
        email: 'new@example.com',
      };

      const request = new Request(
        `http://localhost:3000/api/contacts/${testContactId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(updateData),
        }
      );

      const response = await PATCH(request, {
        params: { id: testContactId },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe('New Name');
      expect(data.email).toBe('new@example.com');

      // Verificar no banco
      const dbContact = await prisma.contact.findUnique({
        where: { id: testContactId },
      });
      expect(dbContact?.name).toBe('New Name');
    });
  });

  describe('DELETE /api/contacts/[id]', () => {
    beforeEach(async () => {
      const contact = await prisma.contact.create({
        data: {
          name: 'To Delete',
          email: 'delete@example.com',
          ownerId: testUserId,
        },
      });
      testContactId = contact.id;
    });

    it('should delete contact', async () => {
      const request = new Request(
        `http://localhost:3000/api/contacts/${testContactId}`,
        { method: 'DELETE' }
      );

      const response = await DELETE(request, {
        params: { id: testContactId },
      });

      expect(response.status).toBe(204);

      // Verificar que foi deletado
      const dbContact = await prisma.contact.findUnique({
        where: { id: testContactId },
      });
      expect(dbContact).toBeNull();
    });
  });
});
```

### 5.3 Métricas de Sucesso - Fase 5

- [ ] Testes para GET /api/contacts (list + search)
- [ ] Testes para POST /api/contacts (create)
- [ ] Testes para GET /api/contacts/[id] (get by id)
- [ ] Testes para PATCH /api/contacts/[id] (update)
- [ ] Testes para DELETE /api/contacts/[id] (delete)
- [ ] Testes similares para deals, activities, organizations
- [ ] Testes de autenticação (401 unauthorized)
- [ ] Testes de ownership (403 forbidden)

**Estimativa de Testes:** ~60 test cases para APIs

---

## FASE 6: Testes E2E - Fluxos Completos (Semana 7)

### Prioridade: MÉDIA
Testes de fluxos completos de usuário.

### 6.1 Setup para Testes E2E

Usar Playwright ou Cypress integrado com Vitest.

**Arquivo: `tests/e2e/setup.ts`**

```typescript
import { afterEach, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';

let testUserId: string;

beforeEach(async () => {
  // Criar usuário de teste
  const user = await prisma.user.create({
    data: {
      email: 'e2e@test.com',
      name: 'E2E User',
      password: await bcrypt.hash('password123', 10),
    },
  });
  testUserId = user.id;
});

afterEach(async () => {
  // Limpar dados do usuário de teste
  await prisma.user.delete({ where: { id: testUserId } });
});
```

### 6.2 Exemplo: Fluxo Lead → Organization → Deal

**Arquivo: `tests/e2e/lead-to-deal-pipeline.test.ts`**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createLead } from '@/actions/leads';
import { createLeadContact } from '@/actions/leads';
import { convertLeadToOrganization } from '@/actions/leads';
import { createDeal } from '@/actions/deals';
import { addProductToDeal } from '@/actions/product-links';
import { updateDealStage } from '@/actions/deals';
import { getServerSession } from 'next-auth';
import { vi } from 'vitest';

const mockSession = {
  user: { id: 'user-e2e', email: 'e2e@test.com', name: 'E2E', role: 'user' },
  expires: '2024-12-31',
};

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(() => Promise.resolve(mockSession)),
}));

describe('E2E: Lead to Deal Pipeline', () => {
  let leadId: string;
  let orgId: string;
  let contactId: string;
  let dealId: string;

  it('should complete full pipeline flow', async () => {
    // 1. Criar Lead
    const lead = await createLead({
      businessName: 'E2E Test Company',
      email: 'e2e@company.com',
      phone: '+5511999999999',
      website: 'https://e2etest.com',
      quality: 'hot',
      status: 'qualified',
    });

    expect(lead).toBeDefined();
    expect(lead.businessName).toBe('E2E Test Company');
    leadId = lead.id;

    // 2. Adicionar Contatos ao Lead
    const contact1 = await createLeadContact({
      leadId,
      name: 'CEO E2E',
      email: 'ceo@e2etest.com',
      role: 'CEO',
      isPrimary: true,
    });

    const contact2 = await createLeadContact({
      leadId,
      name: 'CTO E2E',
      email: 'cto@e2etest.com',
      role: 'CTO',
      isPrimary: false,
    });

    expect(contact1).toBeDefined();
    expect(contact2).toBeDefined();

    // 3. Converter Lead para Organization
    const conversion = await convertLeadToOrganization(leadId);

    expect(conversion.organization).toBeDefined();
    expect(conversion.organization.name).toBe('E2E Test Company');
    expect(conversion.organization.sourceLeadId).toBe(leadId);
    expect(conversion.contacts).toHaveLength(2);

    orgId = conversion.organization.id;
    contactId = conversion.contacts[0].id;

    // 4. Criar Deal vinculado à Organization
    const deal = await createDeal({
      title: 'E2E Deal - E-commerce Project',
      value: 50000,
      currency: 'BRL',
      status: 'open',
      stageId: 'stage-initial',
      organizationId: orgId,
      contactId,
    });

    expect(deal).toBeDefined();
    expect(deal.title).toContain('E2E Deal');
    expect(deal.organizationId).toBe(orgId);
    dealId = deal.id;

    // 5. Adicionar Produtos ao Deal
    const dealProduct = await addProductToDeal({
      dealId,
      productId: 'product-ecommerce',
      quantity: 1,
      unitPrice: 50000,
      discount: 5000,
      description: 'Full e-commerce solution',
    });

    expect(dealProduct).toBeDefined();
    expect(dealProduct.totalValue).toBe(45000); // 50000 - 5000

    // 6. Mover Deal para próximo estágio
    const updatedDeal = await updateDealStage(dealId, 'stage-negotiation');

    expect(updatedDeal.stageId).toBe('stage-negotiation');

    // 7. Mover Deal para estágio final (Won)
    const wonDeal = await updateDealStage(dealId, 'stage-won');

    expect(wonDeal.stageId).toBe('stage-won');
    expect(wonDeal.status).toBe('won');
  });
});
```

### 6.3 Métricas de Sucesso - Fase 6

- [ ] Fluxo completo: Lead → Organization → Deal → Won
- [ ] Fluxo de autenticação: Register → Login → Logout
- [ ] Fluxo de atividades: Create → Assign → Complete
- [ ] Fluxo de tech stack: Add to Lead → Convert → Verify in Org
- [ ] Fluxo de produtos: Add to Lead → Add to Deal → Calculate total
- [ ] Verificação de data isolation entre usuários

**Estimativa de Testes:** ~30 test cases E2E

---

## FASE 7: Testes de Performance e Coverage (Semana 8)

### 7.1 Configuração de Coverage

```bash
npm run test:coverage
```

**Metas:**
- **Lines**: 80%+
- **Functions**: 80%+
- **Branches**: 75%+
- **Statements**: 80%+

### 7.2 Benchmark de Performance

**Arquivo: `tests/performance/benchmark.test.ts`**

```typescript
import { describe, it, bench } from 'vitest';
import { getContacts } from '@/actions/contacts';
import { getDeals } from '@/actions/deals';

describe('Performance Benchmarks', () => {
  bench('getContacts with 100 records', async () => {
    // Medir tempo de execução
    await getContacts();
  });

  bench('getDeals with filters', async () => {
    await getDeals({ search: 'test', status: 'open' });
  });

  bench('convertLeadToOrganization', async () => {
    // Medir performance de conversão
  });
});
```

### 7.3 Meta: Suite de Testes < 30s

Otimizações:
- Usar `--pool=threads` para paralelização
- Mockar chamadas externas
- Usar transações para rollback automático
- Cache de fixtures

---

## Cronograma de Implementação

| Fase | Semana | Tarefas | Testes Estimados | Status |
|------|--------|---------|------------------|--------|
| 1 | 1 | Setup + Config | 13 | ✅ Completa (16/11/2024) |
| 2 | 2 | Validações | ~150 | ⏳ Pendente |
| 3 | 3 | Server Actions CRUD | ~200 | ⏳ Pendente |
| 4 | 4-5 | Lógica Complexa | ~100 | ⏳ Pendente |
| 5 | 6 | API Integration | ~60 | ⏳ Pendente |
| 6 | 7 | E2E Flows | ~30 | ⏳ Pendente |
| 7 | 8 | Coverage + Performance | - | ⏳ Pendente |

**Total Estimado:** ~553 test cases em 8 semanas
**Progresso Atual:** 13 testes criados (2.4% do total)

---

## Fixtures e Helpers Reutilizáveis

### Arquivo: `tests/fixtures/users.ts`

```typescript
export const mockUser = {
  id: 'user-123',
  email: 'test@test.com',
  name: 'Test User',
  role: 'user',
};

export const mockSession = {
  user: mockUser,
  expires: '2024-12-31',
};
```

### Arquivo: `tests/fixtures/leads.ts`

```typescript
export const mockLead = {
  id: 'lead-1',
  businessName: 'Test Company',
  email: 'test@company.com',
  phone: '+5511999999999',
  quality: 'hot',
  status: 'qualified',
  ownerId: 'user-123',
};

export const mockLeadWithContacts = {
  ...mockLead,
  leadContacts: [
    {
      id: 'lc-1',
      name: 'John Doe',
      email: 'john@test.com',
      role: 'CEO',
      isPrimary: true,
    },
  ],
};
```

---

## Comandos Úteis

```bash
# Executar todos os testes
npm run test

# Modo watch
npm run test:watch

# UI interativa
npm run test:ui

# Apenas unitários
npm run test:unit

# Apenas integração
npm run test:integration

# Apenas E2E
npm run test:e2e

# Coverage report
npm run test:coverage

# Coverage específico
npm run test:coverage -- tests/unit/actions/leads.test.ts
```

---

## Métricas de Qualidade

### Prioridades de Cobertura

**CRÍTICO (100% coverage):**
- convertLeadToOrganization
- Authentication flows
- Data isolation (ownerId filtering)
- Product calculations

**ALTO (90%+ coverage):**
- CRUD de entidades principais
- Validações Zod
- API routes

**MÉDIO (80%+ coverage):**
- Tech stack management
- Product links
- CNAE system

**BAIXO (70%+ coverage):**
- Getters simples
- Admin entities

---

## Checklist de Implementação

### Fase 1: Setup ✅ COMPLETA
- [x] Instalar dependências Vitest
- [x] Criar vitest.config.ts
- [x] Criar estrutura de diretórios
- [x] Configurar mocks globais (Prisma, NextAuth)
- [x] Criar fixtures reutilizáveis (30+ fixtures)
- [x] Adicionar scripts no package.json
- [x] Criar testes de validação do setup (13 testes)
- [x] Criar documentação completa

### Fase 2: Validações
- [ ] leadSchema (40+ test cases)
- [ ] organizationSchema (20+ test cases)
- [ ] dealSchema (15+ test cases)
- [ ] activitySchema (15+ test cases)
- [ ] contactSchema (10+ test cases)
- [ ] partnerSchema (15+ test cases)
- [ ] productSchemas (20+ test cases)
- [ ] techStackSchemas (15+ test cases)

### Fase 3: Server Actions CRUD
- [ ] Contacts (25 test cases)
- [ ] Organizations (25 test cases)
- [ ] Leads (30 test cases)
- [ ] Deals (30 test cases)
- [ ] Activities (30 test cases)
- [ ] Partners (25 test cases)
- [ ] Pipelines/Stages (20 test cases)
- [ ] Labels (15 test cases)

### Fase 4: Lógica Complexa
- [ ] Lead → Org conversion (20 test cases)
- [ ] Product links (25 test cases)
- [ ] Tech stack (25 test cases)
- [ ] CNAE system (15 test cases)
- [ ] External projects (10 test cases)
- [ ] Activity multi-entity (5 test cases)

### Fase 5: API Integration
- [ ] Contacts API (10 test cases)
- [ ] Deals API (10 test cases)
- [ ] Activities API (10 test cases)
- [ ] Organizations API (10 test cases)
- [ ] Auth API (10 test cases)
- [ ] Products API (10 test cases)

### Fase 6: E2E
- [ ] Auth flow (5 test cases)
- [ ] Lead to Deal pipeline (10 test cases)
- [ ] Activity management (5 test cases)
- [ ] Tech stack tracking (5 test cases)
- [ ] Product tracking (5 test cases)

### Fase 7: Coverage
- [ ] Atingir 80%+ lines
- [ ] Atingir 80%+ functions
- [ ] Atingir 75%+ branches
- [ ] Atingir 80%+ statements
- [ ] Suite < 30s
- [ ] CI/CD integration

---

## Recursos Adicionais

### Documentação
- [Vitest Docs](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [MSW Docs](https://mswjs.io/)

### Exemplos de Testes
- Veja `/tests/unit/validations/lead.test.ts` para exemplo completo
- Veja `/tests/unit/actions/contacts.test.ts` para mocking
- Veja `/tests/integration/api/contacts.test.ts` para DB integration

---

## Notas Finais

Este planejamento cobre **540+ test cases** distribuídos em:
- **150 testes** de validação
- **200 testes** de CRUD
- **100 testes** de lógica complexa
- **60 testes** de integração
- **30 testes** E2E

**Meta final:** 80%+ de code coverage em 8 semanas com suite de testes executando em menos de 30 segundos.
