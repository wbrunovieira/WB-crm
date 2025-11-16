# Tests - WB-CRM

Este diretório contém toda a suite de testes do projeto WB-CRM.

## 📁 Estrutura

```
tests/
├── setup.ts                    # Configuração global de testes
├── fixtures/                   # Dados de teste reutilizáveis
│   ├── users.ts               # Fixtures de usuários e sessões
│   ├── leads.ts               # Fixtures de leads e lead contacts
│   ├── organizations.ts       # Fixtures de organizações
│   ├── contacts.ts            # Fixtures de contatos
│   ├── deals.ts               # Fixtures de deals, pipelines e stages
│   ├── activities.ts          # Fixtures de atividades
│   ├── partners.ts            # Fixtures de parceiros
│   └── index.ts               # Export consolidado
├── mocks/                      # Mocks globais (futuro)
├── unit/                       # Testes unitários
│   ├── actions/               # Testes de Server Actions
│   ├── validations/           # Testes de schemas Zod
│   └── lib/                   # Testes de utilitários
├── integration/                # Testes de integração
│   ├── api/                   # Testes de API routes
│   └── database/              # Testes com banco de dados
├── e2e/                        # Testes end-to-end
└── performance/                # Benchmarks (futuro)
```

## 🚀 Executando Testes

```bash
# Rodar todos os testes
npm test

# Modo watch (desenvolvimento)
npm run test:watch

# Interface visual
npm run test:ui

# Apenas testes unitários
npm run test:unit

# Apenas testes de integração
npm run test:integration

# Apenas testes E2E
npm run test:e2e

# Gerar relatório de cobertura
npm run test:coverage
```

## 📊 Status Atual

✅ **Fase 1 - Setup Completo**
- [x] Vitest configurado
- [x] Mocks globais (Prisma, NextAuth)
- [x] Fixtures criados
- [x] Scripts npm adicionados
- [x] Testes de validação do setup

**Próximos Passos:**
- [ ] Fase 2: Testes de validação (Zod schemas)
- [ ] Fase 3: Testes de Server Actions CRUD
- [ ] Fase 4: Testes de lógica complexa
- [ ] Fase 5: Testes de integração API
- [ ] Fase 6: Testes E2E
- [ ] Fase 7: Coverage e performance

## 📝 Convenções

### Nomenclatura de Arquivos
- Testes unitários: `*.test.ts`
- Testes de integração: `*.integration.test.ts`
- Testes E2E: `*.e2e.test.ts`

### Estrutura de Testes

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getServerSession } from 'next-auth';
import { prismaMock } from '../setup';
import { mockSession, mockUser } from '../fixtures';

describe('Feature Name', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
  });

  describe('Function Name', () => {
    it('should do something specific', async () => {
      // Arrange
      prismaMock.model.findUnique.mockResolvedValue(mockData);

      // Act
      const result = await functionUnderTest();

      // Assert
      expect(result).toBeDefined();
      expect(prismaMock.model.findUnique).toHaveBeenCalled();
    });
  });
});
```

## 🛠️ Fixtures Disponíveis

Todos os fixtures estão disponíveis em `tests/fixtures/`:

```typescript
import {
  mockUser,
  mockAdminUser,
  mockSession,
  mockLead,
  mockLeadWithContacts,
  mockOrganization,
  mockContact,
  mockDeal,
  mockActivity,
  mockPartner,
} from '@/tests/fixtures';
```

## 🎯 Metas de Cobertura

- **Lines**: 80%+
- **Functions**: 80%+
- **Branches**: 75%+
- **Statements**: 80%+

## 📚 Recursos

- [Vitest Docs](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Planejamento Completo](/docs/planejamento-testes.md)

## ✅ Testes Ativos

### Validação do Setup
- [x] `tests/unit/example.test.ts` - Testes básicos de validação
- [x] `tests/unit/setup-validation.test.ts` - Validação de mocks e fixtures

**Total**: 13 testes passando ✅
