/**
 * Tests for Tech Stack Server Actions (Categories, Languages, Frameworks)
 *
 * REGRA FUNDAMENTAL: Quando um teste falha, corrija a IMPLEMENTAÇÃO, nunca o teste.
 * Os testes definem o comportamento esperado do sistema.
 *
 * Note: Tech Stack entities are NOT user-scoped (no ownerId). They are admin-managed.
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
  getTechCategories,
  getActiveTechCategories,
  getTechCategoryById,
  createTechCategory,
  updateTechCategory,
  deleteTechCategory,
  toggleTechCategoryActive,
} from '@/actions/tech-categories';
import {
  getTechLanguages,
  getActiveTechLanguages,
  getTechLanguageById,
  createTechLanguage,
  updateTechLanguage,
  deleteTechLanguage,
  toggleTechLanguageActive,
} from '@/actions/tech-languages';
import {
  getTechFrameworks,
  getActiveTechFrameworks,
  getTechFrameworkById,
  createTechFramework,
  updateTechFramework,
  deleteTechFramework,
  toggleTechFrameworkActive,
} from '@/actions/tech-frameworks';
import { sessionUserA, sessionUserB } from '../fixtures/multiple-users';

const mockPrisma = prisma as unknown as ReturnType<typeof mockDeep<PrismaClient>>;

// Valid CUIDs for testing
const CUID_1 = 'clxxxxxxxxxxxxxxxxxxxxxxxxx1';
const CUID_2 = 'clxxxxxxxxxxxxxxxxxxxxxxxxx2';
const CUID_OTHER = 'clxxxxxxxxxxxxxxxxxxxxxother';

// Helpers
function createMockTechCategory(overrides: Partial<{
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  order: number;
}> = {}) {
  return {
    id: overrides.id || CUID_1,
    name: overrides.name || 'Frontend',
    slug: overrides.slug || 'frontend',
    description: overrides.description !== undefined ? overrides.description : 'Frontend development',
    isActive: overrides.isActive ?? true,
    order: overrides.order ?? 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function createMockTechLanguage(overrides: Partial<{
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}> = {}) {
  return {
    id: overrides.id || CUID_1,
    name: overrides.name || 'TypeScript',
    slug: overrides.slug || 'typescript',
    isActive: overrides.isActive ?? true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function createMockTechFramework(overrides: Partial<{
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}> = {}) {
  return {
    id: overrides.id || CUID_1,
    name: overrides.name || 'React',
    slug: overrides.slug || 'react',
    isActive: overrides.isActive ?? true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('Tech Stack Actions', () => {
  beforeEach(() => {
    mockReset(mockPrisma);
    mockSession = null;
  });

  // ===========================================
  // Tech Categories Tests
  // ===========================================
  describe('Tech Categories', () => {
    describe('getTechCategories', () => {
      it('should return all tech categories when authenticated', async () => {
        mockSession = sessionUserA;
        const categories = [
          { ...createMockTechCategory({ id: CUID_1, name: 'Frontend' }), _count: { dealTechStacks: 0 } },
          { ...createMockTechCategory({ id: CUID_2, name: 'Backend' }), _count: { dealTechStacks: 0 } },
        ];

        mockPrisma.techCategory.findMany.mockResolvedValue(categories as any);

        const result = await getTechCategories();

        expect(result).toHaveLength(2);
        expect(mockPrisma.techCategory.findMany).toHaveBeenCalledWith({
          orderBy: [{ order: 'asc' }, { name: 'asc' }],
          include: { _count: { select: { dealTechStacks: true } } },
        });
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(getTechCategories()).rejects.toThrow('Não autorizado');
      });
    });

    describe('getActiveTechCategories', () => {
      it('should return only active tech categories', async () => {
        mockSession = sessionUserA;
        mockPrisma.techCategory.findMany.mockResolvedValue([]);

        await getActiveTechCategories();

        expect(mockPrisma.techCategory.findMany).toHaveBeenCalledWith({
          where: { isActive: true },
          orderBy: [{ order: 'asc' }, { name: 'asc' }],
        });
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(getActiveTechCategories()).rejects.toThrow('Não autorizado');
      });
    });

    describe('getTechCategoryById', () => {
      it('should return tech category by ID', async () => {
        mockSession = sessionUserA;
        const category = { ...createMockTechCategory(), _count: { dealTechStacks: 5 } };
        mockPrisma.techCategory.findUnique.mockResolvedValue(category as any);

        const result = await getTechCategoryById(CUID_1);

        expect(result?.name).toBe('Frontend');
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(getTechCategoryById(CUID_1)).rejects.toThrow('Não autorizado');
      });
    });

    describe('createTechCategory', () => {
      const validData = { name: 'DevOps', slug: 'devops', isActive: true, order: 0 };

      it('should create tech category', async () => {
        mockSession = sessionUserA;
        mockPrisma.techCategory.findUnique.mockResolvedValue(null);
        mockPrisma.techCategory.create.mockResolvedValue(createMockTechCategory(validData) as any);

        const result = await createTechCategory(validData);

        expect(result.name).toBe('DevOps');
      });

      it('should throw error when slug already exists', async () => {
        mockSession = sessionUserA;
        mockPrisma.techCategory.findUnique.mockResolvedValue(createMockTechCategory() as any);

        await expect(createTechCategory(validData)).rejects.toThrow('Já existe uma categoria com este slug');
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(createTechCategory(validData)).rejects.toThrow('Não autorizado');
      });
    });

    describe('updateTechCategory', () => {
      it('should update tech category', async () => {
        mockSession = sessionUserA;
        mockPrisma.techCategory.findFirst.mockResolvedValue(null);
        mockPrisma.techCategory.update.mockResolvedValue(createMockTechCategory({ id: CUID_1, name: 'Updated' }) as any);

        const result = await updateTechCategory({ id: CUID_1, name: 'Updated', slug: 'updated' });

        expect(result.name).toBe('Updated');
      });

      it('should throw error when updating to existing slug', async () => {
        mockSession = sessionUserA;
        mockPrisma.techCategory.findFirst.mockResolvedValue(createMockTechCategory({ id: CUID_OTHER }) as any);

        await expect(updateTechCategory({ id: CUID_1, slug: 'existing' })).rejects.toThrow('Já existe uma categoria com este slug');
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(updateTechCategory({ id: CUID_1 })).rejects.toThrow('Não autorizado');
      });
    });

    describe('deleteTechCategory', () => {
      it('should delete tech category with no deals', async () => {
        mockSession = sessionUserA;
        mockPrisma.techCategory.findUnique.mockResolvedValue({ ...createMockTechCategory(), _count: { dealTechStacks: 0 } } as any);
        mockPrisma.techCategory.delete.mockResolvedValue({} as any);

        await deleteTechCategory(CUID_1);

        expect(mockPrisma.techCategory.delete).toHaveBeenCalled();
      });

      it('should throw error when category has deals', async () => {
        mockSession = sessionUserA;
        mockPrisma.techCategory.findUnique.mockResolvedValue({ ...createMockTechCategory(), _count: { dealTechStacks: 3 } } as any);

        await expect(deleteTechCategory(CUID_1)).rejects.toThrow('Não é possível excluir uma categoria com deals vinculados');
      });

      it('should throw error for non-existent category', async () => {
        mockSession = sessionUserA;
        mockPrisma.techCategory.findUnique.mockResolvedValue(null);

        await expect(deleteTechCategory('non-existent')).rejects.toThrow('Categoria não encontrada');
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(deleteTechCategory(CUID_1)).rejects.toThrow('Não autorizado');
      });
    });

    describe('toggleTechCategoryActive', () => {
      it('should toggle category active state', async () => {
        mockSession = sessionUserA;
        mockPrisma.techCategory.findUnique.mockResolvedValue(createMockTechCategory({ isActive: true }) as any);
        mockPrisma.techCategory.update.mockResolvedValue(createMockTechCategory({ isActive: false }) as any);

        const result = await toggleTechCategoryActive(CUID_1);

        expect(result.isActive).toBe(false);
      });

      it('should throw error for non-existent category', async () => {
        mockSession = sessionUserA;
        mockPrisma.techCategory.findUnique.mockResolvedValue(null);

        await expect(toggleTechCategoryActive('non-existent')).rejects.toThrow('Categoria não encontrada');
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(toggleTechCategoryActive(CUID_1)).rejects.toThrow('Não autorizado');
      });
    });
  });

  // ===========================================
  // Tech Languages Tests
  // ===========================================
  describe('Tech Languages', () => {
    describe('getTechLanguages', () => {
      it('should return all tech languages when authenticated', async () => {
        mockSession = sessionUserA;
        const languages = [
          { ...createMockTechLanguage({ id: CUID_1, name: 'TypeScript' }), _count: { dealLanguages: 0 } },
          { ...createMockTechLanguage({ id: CUID_2, name: 'Python' }), _count: { dealLanguages: 0 } },
        ];

        mockPrisma.techLanguage.findMany.mockResolvedValue(languages as any);

        const result = await getTechLanguages();

        expect(result).toHaveLength(2);
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(getTechLanguages()).rejects.toThrow('Não autorizado');
      });
    });

    describe('getActiveTechLanguages', () => {
      it('should return only active tech languages', async () => {
        mockSession = sessionUserA;
        mockPrisma.techLanguage.findMany.mockResolvedValue([]);

        await getActiveTechLanguages();

        expect(mockPrisma.techLanguage.findMany).toHaveBeenCalledWith({
          where: { isActive: true },
          orderBy: { name: 'asc' },
        });
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(getActiveTechLanguages()).rejects.toThrow('Não autorizado');
      });
    });

    describe('getTechLanguageById', () => {
      it('should return tech language by ID', async () => {
        mockSession = sessionUserA;
        const language = { ...createMockTechLanguage(), _count: { dealLanguages: 5 } };
        mockPrisma.techLanguage.findUnique.mockResolvedValue(language as any);

        const result = await getTechLanguageById(CUID_1);

        expect(result?.name).toBe('TypeScript');
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(getTechLanguageById(CUID_1)).rejects.toThrow('Não autorizado');
      });
    });

    describe('createTechLanguage', () => {
      const validData = { name: 'Rust', slug: 'rust', isActive: true };

      it('should create tech language', async () => {
        mockSession = sessionUserA;
        mockPrisma.techLanguage.findUnique.mockResolvedValue(null);
        mockPrisma.techLanguage.create.mockResolvedValue(createMockTechLanguage(validData) as any);

        const result = await createTechLanguage(validData);

        expect(result.name).toBe('Rust');
      });

      it('should throw error when slug already exists', async () => {
        mockSession = sessionUserA;
        mockPrisma.techLanguage.findUnique.mockResolvedValue(createMockTechLanguage() as any);

        await expect(createTechLanguage(validData)).rejects.toThrow('Já existe uma linguagem com este slug');
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(createTechLanguage(validData)).rejects.toThrow('Não autorizado');
      });
    });

    describe('updateTechLanguage', () => {
      it('should update tech language', async () => {
        mockSession = sessionUserA;
        mockPrisma.techLanguage.findFirst.mockResolvedValue(null);
        mockPrisma.techLanguage.update.mockResolvedValue(createMockTechLanguage({ id: CUID_1, name: 'Updated' }) as any);

        const result = await updateTechLanguage({ id: CUID_1, name: 'Updated', slug: 'updated' });

        expect(result.name).toBe('Updated');
      });

      it('should throw error when updating to existing slug', async () => {
        mockSession = sessionUserA;
        mockPrisma.techLanguage.findFirst.mockResolvedValue(createMockTechLanguage({ id: CUID_OTHER }) as any);

        await expect(updateTechLanguage({ id: CUID_1, slug: 'existing' })).rejects.toThrow('Já existe uma linguagem com este slug');
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(updateTechLanguage({ id: CUID_1 })).rejects.toThrow('Não autorizado');
      });
    });

    describe('deleteTechLanguage', () => {
      it('should delete tech language with no deals', async () => {
        mockSession = sessionUserA;
        mockPrisma.techLanguage.findUnique.mockResolvedValue({ ...createMockTechLanguage(), _count: { dealLanguages: 0 } } as any);
        mockPrisma.techLanguage.delete.mockResolvedValue({} as any);

        await deleteTechLanguage(CUID_1);

        expect(mockPrisma.techLanguage.delete).toHaveBeenCalled();
      });

      it('should throw error when language has deals', async () => {
        mockSession = sessionUserA;
        mockPrisma.techLanguage.findUnique.mockResolvedValue({ ...createMockTechLanguage(), _count: { dealLanguages: 3 } } as any);

        await expect(deleteTechLanguage(CUID_1)).rejects.toThrow('Não é possível excluir uma linguagem com deals vinculados');
      });

      it('should throw error for non-existent language', async () => {
        mockSession = sessionUserA;
        mockPrisma.techLanguage.findUnique.mockResolvedValue(null);

        await expect(deleteTechLanguage('non-existent')).rejects.toThrow('Linguagem não encontrada');
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(deleteTechLanguage(CUID_1)).rejects.toThrow('Não autorizado');
      });
    });

    describe('toggleTechLanguageActive', () => {
      it('should toggle language active state', async () => {
        mockSession = sessionUserA;
        mockPrisma.techLanguage.findUnique.mockResolvedValue(createMockTechLanguage({ isActive: true }) as any);
        mockPrisma.techLanguage.update.mockResolvedValue(createMockTechLanguage({ isActive: false }) as any);

        const result = await toggleTechLanguageActive(CUID_1);

        expect(result.isActive).toBe(false);
      });

      it('should throw error for non-existent language', async () => {
        mockSession = sessionUserA;
        mockPrisma.techLanguage.findUnique.mockResolvedValue(null);

        await expect(toggleTechLanguageActive('non-existent')).rejects.toThrow('Linguagem não encontrada');
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(toggleTechLanguageActive(CUID_1)).rejects.toThrow('Não autorizado');
      });
    });
  });

  // ===========================================
  // Tech Frameworks Tests
  // ===========================================
  describe('Tech Frameworks', () => {
    describe('getTechFrameworks', () => {
      it('should return all tech frameworks when authenticated', async () => {
        mockSession = sessionUserA;
        const frameworks = [
          { ...createMockTechFramework({ id: CUID_1, name: 'React' }), _count: { dealFrameworks: 0 } },
          { ...createMockTechFramework({ id: CUID_2, name: 'Vue' }), _count: { dealFrameworks: 0 } },
        ];

        mockPrisma.techFramework.findMany.mockResolvedValue(frameworks as any);

        const result = await getTechFrameworks();

        expect(result).toHaveLength(2);
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(getTechFrameworks()).rejects.toThrow('Não autorizado');
      });
    });

    describe('getActiveTechFrameworks', () => {
      it('should return only active tech frameworks', async () => {
        mockSession = sessionUserA;
        mockPrisma.techFramework.findMany.mockResolvedValue([]);

        await getActiveTechFrameworks();

        expect(mockPrisma.techFramework.findMany).toHaveBeenCalledWith({
          where: { isActive: true },
          orderBy: { name: 'asc' },
        });
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(getActiveTechFrameworks()).rejects.toThrow('Não autorizado');
      });
    });

    describe('getTechFrameworkById', () => {
      it('should return tech framework by ID', async () => {
        mockSession = sessionUserA;
        const framework = { ...createMockTechFramework(), _count: { dealFrameworks: 5 } };
        mockPrisma.techFramework.findUnique.mockResolvedValue(framework as any);

        const result = await getTechFrameworkById(CUID_1);

        expect(result?.name).toBe('React');
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(getTechFrameworkById(CUID_1)).rejects.toThrow('Não autorizado');
      });
    });

    describe('createTechFramework', () => {
      const validData = { name: 'Next.js', slug: 'nextjs', isActive: true };

      it('should create tech framework', async () => {
        mockSession = sessionUserA;
        mockPrisma.techFramework.findUnique.mockResolvedValue(null);
        mockPrisma.techFramework.create.mockResolvedValue(createMockTechFramework(validData) as any);

        const result = await createTechFramework(validData);

        expect(result.name).toBe('Next.js');
      });

      it('should throw error when slug already exists', async () => {
        mockSession = sessionUserA;
        mockPrisma.techFramework.findUnique.mockResolvedValue(createMockTechFramework() as any);

        await expect(createTechFramework(validData)).rejects.toThrow('Já existe um framework com este slug');
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(createTechFramework(validData)).rejects.toThrow('Não autorizado');
      });
    });

    describe('updateTechFramework', () => {
      it('should update tech framework', async () => {
        mockSession = sessionUserA;
        mockPrisma.techFramework.findFirst.mockResolvedValue(null);
        mockPrisma.techFramework.update.mockResolvedValue(createMockTechFramework({ id: CUID_1, name: 'Updated' }) as any);

        const result = await updateTechFramework({ id: CUID_1, name: 'Updated', slug: 'updated' });

        expect(result.name).toBe('Updated');
      });

      it('should throw error when updating to existing slug', async () => {
        mockSession = sessionUserA;
        mockPrisma.techFramework.findFirst.mockResolvedValue(createMockTechFramework({ id: CUID_OTHER }) as any);

        await expect(updateTechFramework({ id: CUID_1, slug: 'existing' })).rejects.toThrow('Já existe um framework com este slug');
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(updateTechFramework({ id: CUID_1 })).rejects.toThrow('Não autorizado');
      });
    });

    describe('deleteTechFramework', () => {
      it('should delete tech framework with no deals', async () => {
        mockSession = sessionUserA;
        mockPrisma.techFramework.findUnique.mockResolvedValue({ ...createMockTechFramework(), _count: { dealFrameworks: 0 } } as any);
        mockPrisma.techFramework.delete.mockResolvedValue({} as any);

        await deleteTechFramework(CUID_1);

        expect(mockPrisma.techFramework.delete).toHaveBeenCalled();
      });

      it('should throw error when framework has deals', async () => {
        mockSession = sessionUserA;
        mockPrisma.techFramework.findUnique.mockResolvedValue({ ...createMockTechFramework(), _count: { dealFrameworks: 3 } } as any);

        await expect(deleteTechFramework(CUID_1)).rejects.toThrow('Não é possível excluir um framework com deals vinculados');
      });

      it('should throw error for non-existent framework', async () => {
        mockSession = sessionUserA;
        mockPrisma.techFramework.findUnique.mockResolvedValue(null);

        await expect(deleteTechFramework('non-existent')).rejects.toThrow('Framework não encontrado');
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(deleteTechFramework(CUID_1)).rejects.toThrow('Não autorizado');
      });
    });

    describe('toggleTechFrameworkActive', () => {
      it('should toggle framework active state', async () => {
        mockSession = sessionUserA;
        mockPrisma.techFramework.findUnique.mockResolvedValue(createMockTechFramework({ isActive: true }) as any);
        mockPrisma.techFramework.update.mockResolvedValue(createMockTechFramework({ isActive: false }) as any);

        const result = await toggleTechFrameworkActive(CUID_1);

        expect(result.isActive).toBe(false);
      });

      it('should throw error for non-existent framework', async () => {
        mockSession = sessionUserA;
        mockPrisma.techFramework.findUnique.mockResolvedValue(null);

        await expect(toggleTechFrameworkActive('non-existent')).rejects.toThrow('Framework não encontrado');
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;
        await expect(toggleTechFrameworkActive(CUID_1)).rejects.toThrow('Não autorizado');
      });
    });
  });

  // Triangulation: User B can also access tech stack
  describe('Triangulation', () => {
    it('should allow User B to access tech categories', async () => {
      mockSession = sessionUserB;
      mockPrisma.techCategory.findMany.mockResolvedValue([]);

      const result = await getTechCategories();

      expect(result).toEqual([]);
    });

    it('should allow User B to access tech languages', async () => {
      mockSession = sessionUserB;
      mockPrisma.techLanguage.findMany.mockResolvedValue([]);

      const result = await getTechLanguages();

      expect(result).toEqual([]);
    });

    it('should allow User B to access tech frameworks', async () => {
      mockSession = sessionUserB;
      mockPrisma.techFramework.findMany.mockResolvedValue([]);

      const result = await getTechFrameworks();

      expect(result).toEqual([]);
    });
  });
});
