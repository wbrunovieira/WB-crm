/**
 * Tests for Tech Profile Options Server Actions
 *
 * REGRA FUNDAMENTAL: Quando um teste falha, corrija a IMPLEMENTAÇÃO, nunca o teste.
 * Os testes definem o comportamento esperado do sistema.
 *
 * Note: Tech Profile Options are NOT user-scoped (no ownerId). They are admin-managed.
 * These are options for tracking current tech stack of Leads/Organizations.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import type { PrismaClient } from '@prisma/client';
import type { Session } from 'next-auth';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: mockDeep<PrismaClient>(),
}));

// Mock revalidatePath
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Variable to control session mock
let mockSession: Session | null = null;

// Mock NextAuth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(() => Promise.resolve(mockSession)),
}));

// Import after mocks
import { prisma } from '@/lib/prisma';
import {
  getTechProfileLanguages,
  getActiveTechProfileLanguages,
  createTechProfileLanguage,
  updateTechProfileLanguage,
  deleteTechProfileLanguage,
  toggleTechProfileLanguageActive,
  getTechProfileFrameworks,
  getActiveTechProfileFrameworks,
  createTechProfileFramework,
  deleteTechProfileFramework,
  toggleTechProfileFrameworkActive,
  getTechProfileHosting,
  getActiveTechProfileHosting,
  createTechProfileHosting,
  deleteTechProfileHosting,
  toggleTechProfileHostingActive,
  getTechProfileDatabases,
  getActiveTechProfileDatabases,
  createTechProfileDatabase,
  deleteTechProfileDatabase,
  toggleTechProfileDatabaseActive,
  getTechProfileERPs,
  getActiveTechProfileERPs,
  createTechProfileERP,
  deleteTechProfileERP,
  toggleTechProfileERPActive,
  getTechProfileCRMs,
  getActiveTechProfileCRMs,
  createTechProfileCRM,
  deleteTechProfileCRM,
  toggleTechProfileCRMActive,
  getTechProfileEcommerces,
  getActiveTechProfileEcommerces,
  createTechProfileEcommerce,
  deleteTechProfileEcommerce,
  toggleTechProfileEcommerceActive,
} from '@/actions/tech-profile-options';
import { sessionUserA } from '../fixtures/multiple-users';

const mockPrisma = prisma as unknown as ReturnType<typeof mockDeep<PrismaClient>>;

// Valid CUIDs for testing
const CUID_1 = 'clxxxxxxxxxxxxxxxxxxxxxxxxx1';

describe('Tech Profile Options Actions', () => {
  beforeEach(() => {
    mockReset(mockPrisma);
    mockSession = null;
  });

  // ===========================================
  // Tech Profile Languages Tests
  // ===========================================
  describe('Tech Profile Languages', () => {
    const mockLanguage = {
      id: CUID_1,
      name: 'PHP',
      slug: 'php',
      isActive: true,
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    describe('getTechProfileLanguages', () => {
      it('should return all tech profile languages', async () => {
        mockSession = sessionUserA;
        mockPrisma.techProfileLanguage.findMany.mockResolvedValue([{ ...mockLanguage, _count: { leadLanguages: 0, organizationLanguages: 0 } }] as any);

        const result = await getTechProfileLanguages();

        expect(result).toHaveLength(1);
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(getTechProfileLanguages()).rejects.toThrow('Não autorizado');
      });
    });

    describe('getActiveTechProfileLanguages', () => {
      it('should return only active languages', async () => {
        mockSession = sessionUserA;
        mockPrisma.techProfileLanguage.findMany.mockResolvedValue([]);

        await getActiveTechProfileLanguages();

        expect(mockPrisma.techProfileLanguage.findMany).toHaveBeenCalledWith({
          where: { isActive: true },
          orderBy: [{ order: 'asc' }, { name: 'asc' }],
        });
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(getActiveTechProfileLanguages()).rejects.toThrow('Não autorizado');
      });
    });

    describe('createTechProfileLanguage', () => {
      const validData = { name: 'Go', slug: 'go', isActive: true, order: 0 };

      it('should create language', async () => {
        mockSession = sessionUserA;
        mockPrisma.techProfileLanguage.findUnique.mockResolvedValue(null);
        mockPrisma.techProfileLanguage.create.mockResolvedValue({ ...mockLanguage, ...validData } as any);

        const result = await createTechProfileLanguage(validData);

        expect(result.name).toBe('Go');
      });

      it('should throw error when slug exists', async () => {
        mockSession = sessionUserA;
        mockPrisma.techProfileLanguage.findUnique.mockResolvedValue(mockLanguage as any);

        await expect(createTechProfileLanguage(validData)).rejects.toThrow('Já existe uma linguagem com este slug');
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(createTechProfileLanguage(validData)).rejects.toThrow('Não autorizado');
      });
    });

    describe('deleteTechProfileLanguage', () => {
      it('should delete language with no links', async () => {
        mockSession = sessionUserA;
        mockPrisma.techProfileLanguage.findUnique.mockResolvedValue({ ...mockLanguage, _count: { leadLanguages: 0, organizationLanguages: 0 } } as any);
        mockPrisma.techProfileLanguage.delete.mockResolvedValue({} as any);

        await deleteTechProfileLanguage(CUID_1);

        expect(mockPrisma.techProfileLanguage.delete).toHaveBeenCalled();
      });

      it('should throw error when language has links', async () => {
        mockSession = sessionUserA;
        mockPrisma.techProfileLanguage.findUnique.mockResolvedValue({ ...mockLanguage, _count: { leadLanguages: 2, organizationLanguages: 1 } } as any);

        await expect(deleteTechProfileLanguage(CUID_1)).rejects.toThrow('Não é possível excluir uma linguagem com leads/organizações vinculados');
      });

      it('should throw error for non-existent', async () => {
        mockSession = sessionUserA;
        mockPrisma.techProfileLanguage.findUnique.mockResolvedValue(null);

        await expect(deleteTechProfileLanguage('non-existent')).rejects.toThrow('Linguagem não encontrada');
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(deleteTechProfileLanguage(CUID_1)).rejects.toThrow('Não autorizado');
      });
    });

    describe('toggleTechProfileLanguageActive', () => {
      it('should toggle active state', async () => {
        mockSession = sessionUserA;
        mockPrisma.techProfileLanguage.findUnique.mockResolvedValue(mockLanguage as any);
        mockPrisma.techProfileLanguage.update.mockResolvedValue({ ...mockLanguage, isActive: false } as any);

        const result = await toggleTechProfileLanguageActive(CUID_1);

        expect(result.isActive).toBe(false);
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(toggleTechProfileLanguageActive(CUID_1)).rejects.toThrow('Não autorizado');
      });
    });
  });

  // ===========================================
  // Tech Profile Frameworks Tests
  // ===========================================
  describe('Tech Profile Frameworks', () => {
    const mockFramework = {
      id: CUID_1,
      name: 'Laravel',
      slug: 'laravel',
      isActive: true,
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    describe('getTechProfileFrameworks', () => {
      it('should return all frameworks', async () => {
        mockSession = sessionUserA;
        mockPrisma.techProfileFramework.findMany.mockResolvedValue([{ ...mockFramework, _count: { leadFrameworks: 0, organizationFrameworks: 0 } }] as any);

        const result = await getTechProfileFrameworks();

        expect(result).toHaveLength(1);
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(getTechProfileFrameworks()).rejects.toThrow('Não autorizado');
      });
    });

    describe('getActiveTechProfileFrameworks', () => {
      it('should return only active frameworks', async () => {
        mockSession = sessionUserA;
        mockPrisma.techProfileFramework.findMany.mockResolvedValue([]);

        await getActiveTechProfileFrameworks();

        expect(mockPrisma.techProfileFramework.findMany).toHaveBeenCalledWith({
          where: { isActive: true },
          orderBy: [{ order: 'asc' }, { name: 'asc' }],
        });
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(getActiveTechProfileFrameworks()).rejects.toThrow('Não autorizado');
      });
    });

    describe('createTechProfileFramework', () => {
      const validData = { name: 'Django', slug: 'django', isActive: true, order: 0 };

      it('should create framework', async () => {
        mockSession = sessionUserA;
        mockPrisma.techProfileFramework.findUnique.mockResolvedValue(null);
        mockPrisma.techProfileFramework.create.mockResolvedValue({ ...mockFramework, ...validData } as any);

        const result = await createTechProfileFramework(validData);

        expect(result.name).toBe('Django');
      });

      it('should throw error when slug exists', async () => {
        mockSession = sessionUserA;
        mockPrisma.techProfileFramework.findUnique.mockResolvedValue(mockFramework as any);

        await expect(createTechProfileFramework(validData)).rejects.toThrow('Já existe um framework com este slug');
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(createTechProfileFramework(validData)).rejects.toThrow('Não autorizado');
      });
    });

    describe('deleteTechProfileFramework', () => {
      it('should delete framework with no links', async () => {
        mockSession = sessionUserA;
        mockPrisma.techProfileFramework.findUnique.mockResolvedValue({ ...mockFramework, _count: { leadFrameworks: 0, organizationFrameworks: 0 } } as any);
        mockPrisma.techProfileFramework.delete.mockResolvedValue({} as any);

        await deleteTechProfileFramework(CUID_1);

        expect(mockPrisma.techProfileFramework.delete).toHaveBeenCalled();
      });

      it('should throw error when framework has links', async () => {
        mockSession = sessionUserA;
        mockPrisma.techProfileFramework.findUnique.mockResolvedValue({ ...mockFramework, _count: { leadFrameworks: 1, organizationFrameworks: 2 } } as any);

        await expect(deleteTechProfileFramework(CUID_1)).rejects.toThrow('Não é possível excluir um framework com leads/organizações vinculados');
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(deleteTechProfileFramework(CUID_1)).rejects.toThrow('Não autorizado');
      });
    });

    describe('toggleTechProfileFrameworkActive', () => {
      it('should toggle active state', async () => {
        mockSession = sessionUserA;
        mockPrisma.techProfileFramework.findUnique.mockResolvedValue(mockFramework as any);
        mockPrisma.techProfileFramework.update.mockResolvedValue({ ...mockFramework, isActive: false } as any);

        const result = await toggleTechProfileFrameworkActive(CUID_1);

        expect(result.isActive).toBe(false);
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(toggleTechProfileFrameworkActive(CUID_1)).rejects.toThrow('Não autorizado');
      });
    });
  });

  // ===========================================
  // Tech Profile Hosting Tests
  // ===========================================
  describe('Tech Profile Hosting', () => {
    const mockHosting = {
      id: CUID_1,
      name: 'AWS',
      slug: 'aws',
      type: 'cloud',
      isActive: true,
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    describe('getTechProfileHosting', () => {
      it('should return all hosting options', async () => {
        mockSession = sessionUserA;
        mockPrisma.techProfileHosting.findMany.mockResolvedValue([{ ...mockHosting, _count: { leadHosting: 0, organizationHosting: 0 } }] as any);

        const result = await getTechProfileHosting();

        expect(result).toHaveLength(1);
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(getTechProfileHosting()).rejects.toThrow('Não autorizado');
      });
    });

    describe('getActiveTechProfileHosting', () => {
      it('should return only active hosting', async () => {
        mockSession = sessionUserA;
        mockPrisma.techProfileHosting.findMany.mockResolvedValue([]);

        await getActiveTechProfileHosting();

        expect(mockPrisma.techProfileHosting.findMany).toHaveBeenCalledWith({
          where: { isActive: true },
          orderBy: [{ type: 'asc' }, { order: 'asc' }, { name: 'asc' }],
        });
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(getActiveTechProfileHosting()).rejects.toThrow('Não autorizado');
      });
    });

    describe('createTechProfileHosting', () => {
      const validData = { name: 'GCP', slug: 'gcp', type: 'cloud', isActive: true, order: 0 };

      it('should create hosting', async () => {
        mockSession = sessionUserA;
        mockPrisma.techProfileHosting.findUnique.mockResolvedValue(null);
        mockPrisma.techProfileHosting.create.mockResolvedValue({ ...mockHosting, ...validData } as any);

        const result = await createTechProfileHosting(validData);

        expect(result.name).toBe('GCP');
      });

      it('should throw error when slug exists', async () => {
        mockSession = sessionUserA;
        mockPrisma.techProfileHosting.findUnique.mockResolvedValue(mockHosting as any);

        await expect(createTechProfileHosting(validData)).rejects.toThrow('Já existe um serviço de hospedagem com este slug');
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(createTechProfileHosting(validData)).rejects.toThrow('Não autorizado');
      });
    });

    describe('deleteTechProfileHosting', () => {
      it('should delete hosting with no links', async () => {
        mockSession = sessionUserA;
        mockPrisma.techProfileHosting.findUnique.mockResolvedValue({ ...mockHosting, _count: { leadHosting: 0, organizationHosting: 0 } } as any);
        mockPrisma.techProfileHosting.delete.mockResolvedValue({} as any);

        await deleteTechProfileHosting(CUID_1);

        expect(mockPrisma.techProfileHosting.delete).toHaveBeenCalled();
      });

      it('should throw error when hosting has links', async () => {
        mockSession = sessionUserA;
        mockPrisma.techProfileHosting.findUnique.mockResolvedValue({ ...mockHosting, _count: { leadHosting: 1, organizationHosting: 0 } } as any);

        await expect(deleteTechProfileHosting(CUID_1)).rejects.toThrow('Não é possível excluir um serviço com leads/organizações vinculados');
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(deleteTechProfileHosting(CUID_1)).rejects.toThrow('Não autorizado');
      });
    });

    describe('toggleTechProfileHostingActive', () => {
      it('should toggle active state', async () => {
        mockSession = sessionUserA;
        mockPrisma.techProfileHosting.findUnique.mockResolvedValue(mockHosting as any);
        mockPrisma.techProfileHosting.update.mockResolvedValue({ ...mockHosting, isActive: false } as any);

        const result = await toggleTechProfileHostingActive(CUID_1);

        expect(result.isActive).toBe(false);
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(toggleTechProfileHostingActive(CUID_1)).rejects.toThrow('Não autorizado');
      });
    });
  });

  // ===========================================
  // Tech Profile Databases Tests
  // ===========================================
  describe('Tech Profile Databases', () => {
    const mockDatabase = {
      id: CUID_1,
      name: 'PostgreSQL',
      slug: 'postgresql',
      type: 'relational',
      isActive: true,
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    describe('getTechProfileDatabases', () => {
      it('should return all databases', async () => {
        mockSession = sessionUserA;
        mockPrisma.techProfileDatabase.findMany.mockResolvedValue([{ ...mockDatabase, _count: { leadDatabases: 0, organizationDatabases: 0 } }] as any);

        const result = await getTechProfileDatabases();

        expect(result).toHaveLength(1);
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(getTechProfileDatabases()).rejects.toThrow('Não autorizado');
      });
    });

    describe('getActiveTechProfileDatabases', () => {
      it('should return only active databases', async () => {
        mockSession = sessionUserA;
        mockPrisma.techProfileDatabase.findMany.mockResolvedValue([]);

        await getActiveTechProfileDatabases();

        expect(mockPrisma.techProfileDatabase.findMany).toHaveBeenCalledWith({
          where: { isActive: true },
          orderBy: [{ type: 'asc' }, { order: 'asc' }, { name: 'asc' }],
        });
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(getActiveTechProfileDatabases()).rejects.toThrow('Não autorizado');
      });
    });

    describe('createTechProfileDatabase', () => {
      const validData = { name: 'MongoDB', slug: 'mongodb', type: 'nosql' as const, isActive: true, order: 0 };

      it('should create database', async () => {
        mockSession = sessionUserA;
        mockPrisma.techProfileDatabase.findUnique.mockResolvedValue(null);
        mockPrisma.techProfileDatabase.create.mockResolvedValue({ ...mockDatabase, ...validData } as any);

        const result = await createTechProfileDatabase(validData);

        expect(result.name).toBe('MongoDB');
      });

      it('should throw error when slug exists', async () => {
        mockSession = sessionUserA;
        mockPrisma.techProfileDatabase.findUnique.mockResolvedValue(mockDatabase as any);

        await expect(createTechProfileDatabase(validData)).rejects.toThrow('Já existe um banco de dados com este slug');
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(createTechProfileDatabase(validData)).rejects.toThrow('Não autorizado');
      });
    });

    describe('deleteTechProfileDatabase', () => {
      it('should delete database with no links', async () => {
        mockSession = sessionUserA;
        mockPrisma.techProfileDatabase.findUnique.mockResolvedValue({ ...mockDatabase, _count: { leadDatabases: 0, organizationDatabases: 0 } } as any);
        mockPrisma.techProfileDatabase.delete.mockResolvedValue({} as any);

        await deleteTechProfileDatabase(CUID_1);

        expect(mockPrisma.techProfileDatabase.delete).toHaveBeenCalled();
      });

      it('should throw error when database has links', async () => {
        mockSession = sessionUserA;
        mockPrisma.techProfileDatabase.findUnique.mockResolvedValue({ ...mockDatabase, _count: { leadDatabases: 2, organizationDatabases: 0 } } as any);

        await expect(deleteTechProfileDatabase(CUID_1)).rejects.toThrow('Não é possível excluir um banco com leads/organizações vinculados');
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(deleteTechProfileDatabase(CUID_1)).rejects.toThrow('Não autorizado');
      });
    });

    describe('toggleTechProfileDatabaseActive', () => {
      it('should toggle active state', async () => {
        mockSession = sessionUserA;
        mockPrisma.techProfileDatabase.findUnique.mockResolvedValue(mockDatabase as any);
        mockPrisma.techProfileDatabase.update.mockResolvedValue({ ...mockDatabase, isActive: false } as any);

        const result = await toggleTechProfileDatabaseActive(CUID_1);

        expect(result.isActive).toBe(false);
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(toggleTechProfileDatabaseActive(CUID_1)).rejects.toThrow('Não autorizado');
      });
    });
  });

  // ===========================================
  // Tech Profile ERPs Tests
  // ===========================================
  describe('Tech Profile ERPs', () => {
    const mockERP = {
      id: CUID_1,
      name: 'SAP',
      slug: 'sap',
      isActive: true,
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    describe('getTechProfileERPs', () => {
      it('should return all ERPs', async () => {
        mockSession = sessionUserA;
        mockPrisma.techProfileERP.findMany.mockResolvedValue([{ ...mockERP, _count: { leadERPs: 0, organizationERPs: 0 } }] as any);

        const result = await getTechProfileERPs();

        expect(result).toHaveLength(1);
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(getTechProfileERPs()).rejects.toThrow('Não autorizado');
      });
    });

    describe('getActiveTechProfileERPs', () => {
      it('should return only active ERPs', async () => {
        mockSession = sessionUserA;
        mockPrisma.techProfileERP.findMany.mockResolvedValue([]);

        await getActiveTechProfileERPs();

        expect(mockPrisma.techProfileERP.findMany).toHaveBeenCalledWith({
          where: { isActive: true },
          orderBy: [{ order: 'asc' }, { name: 'asc' }],
        });
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(getActiveTechProfileERPs()).rejects.toThrow('Não autorizado');
      });
    });

    describe('createTechProfileERP', () => {
      const validData = { name: 'TOTVS', slug: 'totvs', isActive: true, order: 0 };

      it('should create ERP', async () => {
        mockSession = sessionUserA;
        mockPrisma.techProfileERP.findUnique.mockResolvedValue(null);
        mockPrisma.techProfileERP.create.mockResolvedValue({ ...mockERP, ...validData } as any);

        const result = await createTechProfileERP(validData);

        expect(result.name).toBe('TOTVS');
      });

      it('should throw error when slug exists', async () => {
        mockSession = sessionUserA;
        mockPrisma.techProfileERP.findUnique.mockResolvedValue(mockERP as any);

        await expect(createTechProfileERP(validData)).rejects.toThrow('Já existe um ERP com este slug');
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(createTechProfileERP(validData)).rejects.toThrow('Não autorizado');
      });
    });

    describe('deleteTechProfileERP', () => {
      it('should delete ERP with no links', async () => {
        mockSession = sessionUserA;
        mockPrisma.techProfileERP.findUnique.mockResolvedValue({ ...mockERP, _count: { leadERPs: 0, organizationERPs: 0 } } as any);
        mockPrisma.techProfileERP.delete.mockResolvedValue({} as any);

        await deleteTechProfileERP(CUID_1);

        expect(mockPrisma.techProfileERP.delete).toHaveBeenCalled();
      });

      it('should throw error when ERP has links', async () => {
        mockSession = sessionUserA;
        mockPrisma.techProfileERP.findUnique.mockResolvedValue({ ...mockERP, _count: { leadERPs: 1, organizationERPs: 1 } } as any);

        await expect(deleteTechProfileERP(CUID_1)).rejects.toThrow('Não é possível excluir um ERP com leads/organizações vinculados');
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(deleteTechProfileERP(CUID_1)).rejects.toThrow('Não autorizado');
      });
    });

    describe('toggleTechProfileERPActive', () => {
      it('should toggle active state', async () => {
        mockSession = sessionUserA;
        mockPrisma.techProfileERP.findUnique.mockResolvedValue(mockERP as any);
        mockPrisma.techProfileERP.update.mockResolvedValue({ ...mockERP, isActive: false } as any);

        const result = await toggleTechProfileERPActive(CUID_1);

        expect(result.isActive).toBe(false);
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(toggleTechProfileERPActive(CUID_1)).rejects.toThrow('Não autorizado');
      });
    });
  });

  // ===========================================
  // Tech Profile CRMs Tests
  // ===========================================
  describe('Tech Profile CRMs', () => {
    const mockCRM = {
      id: CUID_1,
      name: 'Salesforce',
      slug: 'salesforce',
      isActive: true,
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    describe('getTechProfileCRMs', () => {
      it('should return all CRMs', async () => {
        mockSession = sessionUserA;
        mockPrisma.techProfileCRM.findMany.mockResolvedValue([{ ...mockCRM, _count: { leadCRMs: 0, organizationCRMs: 0 } }] as any);

        const result = await getTechProfileCRMs();

        expect(result).toHaveLength(1);
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(getTechProfileCRMs()).rejects.toThrow('Não autorizado');
      });
    });

    describe('getActiveTechProfileCRMs', () => {
      it('should return only active CRMs', async () => {
        mockSession = sessionUserA;
        mockPrisma.techProfileCRM.findMany.mockResolvedValue([]);

        await getActiveTechProfileCRMs();

        expect(mockPrisma.techProfileCRM.findMany).toHaveBeenCalledWith({
          where: { isActive: true },
          orderBy: [{ order: 'asc' }, { name: 'asc' }],
        });
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(getActiveTechProfileCRMs()).rejects.toThrow('Não autorizado');
      });
    });

    describe('createTechProfileCRM', () => {
      const validData = { name: 'HubSpot', slug: 'hubspot', isActive: true, order: 0 };

      it('should create CRM', async () => {
        mockSession = sessionUserA;
        mockPrisma.techProfileCRM.findUnique.mockResolvedValue(null);
        mockPrisma.techProfileCRM.create.mockResolvedValue({ ...mockCRM, ...validData } as any);

        const result = await createTechProfileCRM(validData);

        expect(result.name).toBe('HubSpot');
      });

      it('should throw error when slug exists', async () => {
        mockSession = sessionUserA;
        mockPrisma.techProfileCRM.findUnique.mockResolvedValue(mockCRM as any);

        await expect(createTechProfileCRM(validData)).rejects.toThrow('Já existe um CRM com este slug');
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(createTechProfileCRM(validData)).rejects.toThrow('Não autorizado');
      });
    });

    describe('deleteTechProfileCRM', () => {
      it('should delete CRM with no links', async () => {
        mockSession = sessionUserA;
        mockPrisma.techProfileCRM.findUnique.mockResolvedValue({ ...mockCRM, _count: { leadCRMs: 0, organizationCRMs: 0 } } as any);
        mockPrisma.techProfileCRM.delete.mockResolvedValue({} as any);

        await deleteTechProfileCRM(CUID_1);

        expect(mockPrisma.techProfileCRM.delete).toHaveBeenCalled();
      });

      it('should throw error when CRM has links', async () => {
        mockSession = sessionUserA;
        mockPrisma.techProfileCRM.findUnique.mockResolvedValue({ ...mockCRM, _count: { leadCRMs: 0, organizationCRMs: 1 } } as any);

        await expect(deleteTechProfileCRM(CUID_1)).rejects.toThrow('Não é possível excluir um CRM com leads/organizações vinculados');
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(deleteTechProfileCRM(CUID_1)).rejects.toThrow('Não autorizado');
      });
    });

    describe('toggleTechProfileCRMActive', () => {
      it('should toggle active state', async () => {
        mockSession = sessionUserA;
        mockPrisma.techProfileCRM.findUnique.mockResolvedValue(mockCRM as any);
        mockPrisma.techProfileCRM.update.mockResolvedValue({ ...mockCRM, isActive: false } as any);

        const result = await toggleTechProfileCRMActive(CUID_1);

        expect(result.isActive).toBe(false);
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(toggleTechProfileCRMActive(CUID_1)).rejects.toThrow('Não autorizado');
      });
    });
  });

  // ===========================================
  // Tech Profile Ecommerces Tests
  // ===========================================
  describe('Tech Profile Ecommerces', () => {
    const mockEcommerce = {
      id: CUID_1,
      name: 'Shopify',
      slug: 'shopify',
      isActive: true,
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    describe('getTechProfileEcommerces', () => {
      it('should return all ecommerces', async () => {
        mockSession = sessionUserA;
        mockPrisma.techProfileEcommerce.findMany.mockResolvedValue([{ ...mockEcommerce, _count: { leadEcommerces: 0, organizationEcommerces: 0 } }] as any);

        const result = await getTechProfileEcommerces();

        expect(result).toHaveLength(1);
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(getTechProfileEcommerces()).rejects.toThrow('Não autorizado');
      });
    });

    describe('getActiveTechProfileEcommerces', () => {
      it('should return only active ecommerces', async () => {
        mockSession = sessionUserA;
        mockPrisma.techProfileEcommerce.findMany.mockResolvedValue([]);

        await getActiveTechProfileEcommerces();

        expect(mockPrisma.techProfileEcommerce.findMany).toHaveBeenCalledWith({
          where: { isActive: true },
          orderBy: [{ order: 'asc' }, { name: 'asc' }],
        });
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(getActiveTechProfileEcommerces()).rejects.toThrow('Não autorizado');
      });
    });

    describe('createTechProfileEcommerce', () => {
      const validData = { name: 'WooCommerce', slug: 'woocommerce', isActive: true, order: 0 };

      it('should create ecommerce', async () => {
        mockSession = sessionUserA;
        mockPrisma.techProfileEcommerce.findUnique.mockResolvedValue(null);
        mockPrisma.techProfileEcommerce.create.mockResolvedValue({ ...mockEcommerce, ...validData } as any);

        const result = await createTechProfileEcommerce(validData);

        expect(result.name).toBe('WooCommerce');
      });

      it('should throw error when slug exists', async () => {
        mockSession = sessionUserA;
        mockPrisma.techProfileEcommerce.findUnique.mockResolvedValue(mockEcommerce as any);

        await expect(createTechProfileEcommerce(validData)).rejects.toThrow('Já existe uma plataforma de e-commerce com este slug');
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(createTechProfileEcommerce(validData)).rejects.toThrow('Não autorizado');
      });
    });

    describe('deleteTechProfileEcommerce', () => {
      it('should delete ecommerce with no links', async () => {
        mockSession = sessionUserA;
        mockPrisma.techProfileEcommerce.findUnique.mockResolvedValue({ ...mockEcommerce, _count: { leadEcommerces: 0, organizationEcommerces: 0 } } as any);
        mockPrisma.techProfileEcommerce.delete.mockResolvedValue({} as any);

        await deleteTechProfileEcommerce(CUID_1);

        expect(mockPrisma.techProfileEcommerce.delete).toHaveBeenCalled();
      });

      it('should throw error when ecommerce has links', async () => {
        mockSession = sessionUserA;
        mockPrisma.techProfileEcommerce.findUnique.mockResolvedValue({ ...mockEcommerce, _count: { leadEcommerces: 1, organizationEcommerces: 0 } } as any);

        await expect(deleteTechProfileEcommerce(CUID_1)).rejects.toThrow('Não é possível excluir uma plataforma com leads/organizações vinculados');
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(deleteTechProfileEcommerce(CUID_1)).rejects.toThrow('Não autorizado');
      });
    });

    describe('toggleTechProfileEcommerceActive', () => {
      it('should toggle active state', async () => {
        mockSession = sessionUserA;
        mockPrisma.techProfileEcommerce.findUnique.mockResolvedValue(mockEcommerce as any);
        mockPrisma.techProfileEcommerce.update.mockResolvedValue({ ...mockEcommerce, isActive: false } as any);

        const result = await toggleTechProfileEcommerceActive(CUID_1);

        expect(result.isActive).toBe(false);
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(toggleTechProfileEcommerceActive(CUID_1)).rejects.toThrow('Não autorizado');
      });
    });
  });
});
