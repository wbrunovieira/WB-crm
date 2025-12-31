/**
 * Tests for Business Lines Server Actions
 *
 * REGRA FUNDAMENTAL: Quando um teste falha, corrija a IMPLEMENTAÇÃO, nunca o teste.
 * Os testes definem o comportamento esperado do sistema.
 *
 * Note: Business Lines are NOT user-scoped (no ownerId). They are admin-managed entities.
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
  getBusinessLines,
  getActiveBusinessLines,
  getBusinessLineById,
  createBusinessLine,
  updateBusinessLine,
  deleteBusinessLine,
  toggleBusinessLineActive,
} from '@/actions/business-lines';
import {
  sessionUserA,
  sessionUserB,
} from '../fixtures/multiple-users';

const mockPrisma = prisma as unknown as ReturnType<typeof mockDeep<PrismaClient>>;

// Valid CUIDs for testing
const CUID_BL_1 = 'clxxxxxxxxxxxxxxxxxxxxxxxxx1';
const CUID_BL_2 = 'clxxxxxxxxxxxxxxxxxxxxxxxxx2';
const CUID_BL_3 = 'clxxxxxxxxxxxxxxxxxxxxxxxxx3';
const CUID_BL_NEW = 'clxxxxxxxxxxxxxxxxxxxxxxxnew';
const CUID_BL_OTHER = 'clxxxxxxxxxxxxxxxxxxxxxother';

// Helper to create mock business line
function createMockBusinessLine(overrides: Partial<{
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  isActive: boolean;
  order: number;
}> = {}) {
  return {
    id: overrides.id || `bl-${Date.now()}`,
    name: overrides.name || 'Desenvolvimento Web',
    slug: overrides.slug || 'desenvolvimento-web',
    description: overrides.description !== undefined ? overrides.description : 'Serviços de desenvolvimento web',
    color: overrides.color !== undefined ? overrides.color : '#792990',
    icon: overrides.icon !== undefined ? overrides.icon : 'code',
    isActive: overrides.isActive ?? true,
    order: overrides.order ?? 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('Business Lines Actions', () => {
  beforeEach(() => {
    mockReset(mockPrisma);
    mockSession = null;
  });

  // ===========================================
  // getBusinessLines Tests
  // ===========================================
  describe('getBusinessLines', () => {
    it('should return all business lines when authenticated', async () => {
      mockSession = sessionUserA;
      const businessLines = [
        createMockBusinessLine({ id: 'bl-1', name: 'Web Development', slug: 'web-dev', order: 1 }),
        createMockBusinessLine({ id: 'bl-2', name: 'Mobile Apps', slug: 'mobile', order: 2 }),
        createMockBusinessLine({ id: 'bl-3', name: 'AI Solutions', slug: 'ai', order: 3 }),
      ];

      mockPrisma.businessLine.findMany.mockResolvedValue(businessLines as any);

      const result = await getBusinessLines();

      expect(result).toHaveLength(3);
      expect(mockPrisma.businessLine.findMany).toHaveBeenCalledWith({
        orderBy: [{ order: 'asc' }, { name: 'asc' }],
        include: {
          _count: {
            select: { products: true },
          },
        },
      });
    });

    it('should throw "Não autorizado" without session', async () => {
      mockSession = null;

      await expect(getBusinessLines()).rejects.toThrow('Não autorizado');
    });

    it('should return empty array when no business lines exist', async () => {
      mockSession = sessionUserA;
      mockPrisma.businessLine.findMany.mockResolvedValue([]);

      const result = await getBusinessLines();

      expect(result).toEqual([]);
    });

    it('should include products count', async () => {
      mockSession = sessionUserA;
      const businessLines = [{
        ...createMockBusinessLine({ id: 'bl-1' }),
        _count: { products: 5 },
      }];

      mockPrisma.businessLine.findMany.mockResolvedValue(businessLines as any);

      const result = await getBusinessLines();

      expect(result[0]._count.products).toBe(5);
    });

    // Triangulation: User B can also access business lines
    it('should allow User B to access business lines', async () => {
      mockSession = sessionUserB;
      mockPrisma.businessLine.findMany.mockResolvedValue([]);

      const result = await getBusinessLines();

      expect(result).toEqual([]);
      expect(mockPrisma.businessLine.findMany).toHaveBeenCalled();
    });
  });

  // ===========================================
  // getActiveBusinessLines Tests
  // ===========================================
  describe('getActiveBusinessLines', () => {
    it('should return only active business lines', async () => {
      mockSession = sessionUserA;
      const activeBusinessLines = [
        { ...createMockBusinessLine({ id: 'bl-1', isActive: true }), products: [] },
        { ...createMockBusinessLine({ id: 'bl-2', isActive: true }), products: [] },
      ];

      mockPrisma.businessLine.findMany.mockResolvedValue(activeBusinessLines as any);

      const result = await getActiveBusinessLines();

      expect(result).toHaveLength(2);
      expect(mockPrisma.businessLine.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: [{ order: 'asc' }, { name: 'asc' }],
        include: {
          products: {
            where: { isActive: true },
            orderBy: [{ order: 'asc' }, { name: 'asc' }],
          },
        },
      });
    });

    it('should throw "Não autorizado" without session', async () => {
      mockSession = null;

      await expect(getActiveBusinessLines()).rejects.toThrow('Não autorizado');
    });

    it('should include only active products', async () => {
      mockSession = sessionUserA;
      const businessLines = [{
        ...createMockBusinessLine({ id: 'bl-1' }),
        products: [
          { id: 'prod-1', name: 'Product 1', isActive: true },
        ],
      }];

      mockPrisma.businessLine.findMany.mockResolvedValue(businessLines as any);

      await getActiveBusinessLines();

      expect(mockPrisma.businessLine.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            products: expect.objectContaining({
              where: { isActive: true },
            }),
          }),
        })
      );
    });
  });

  // ===========================================
  // getBusinessLineById Tests
  // ===========================================
  describe('getBusinessLineById', () => {
    it('should return business line by ID', async () => {
      mockSession = sessionUserA;
      const businessLine = {
        ...createMockBusinessLine({ id: 'bl-1', name: 'Web Development' }),
        products: [],
      };

      mockPrisma.businessLine.findUnique.mockResolvedValue(businessLine as any);

      const result = await getBusinessLineById('bl-1');

      expect(result?.id).toBe('bl-1');
      expect(result?.name).toBe('Web Development');
      expect(mockPrisma.businessLine.findUnique).toHaveBeenCalledWith({
        where: { id: 'bl-1' },
        include: {
          products: {
            orderBy: [{ order: 'asc' }, { name: 'asc' }],
          },
        },
      });
    });

    it('should return null for non-existent business line', async () => {
      mockSession = sessionUserA;
      mockPrisma.businessLine.findUnique.mockResolvedValue(null);

      const result = await getBusinessLineById('non-existent');

      expect(result).toBeNull();
    });

    it('should throw "Não autorizado" without session', async () => {
      mockSession = null;

      await expect(getBusinessLineById('bl-1')).rejects.toThrow('Não autorizado');
    });
  });

  // ===========================================
  // createBusinessLine Tests
  // ===========================================
  describe('createBusinessLine', () => {
    const validBusinessLineData = {
      name: 'New Business Line',
      slug: 'new-business-line',
      description: 'A new business line',
      color: '#FF5733',
      icon: 'star',
      isActive: true,
      order: 1,
    };

    it('should create a business line with valid data', async () => {
      mockSession = sessionUserA;
      const createdBusinessLine = createMockBusinessLine({
        id: 'bl-new',
        ...validBusinessLineData,
      });

      mockPrisma.businessLine.findUnique.mockResolvedValue(null); // Slug doesn't exist
      mockPrisma.businessLine.create.mockResolvedValue(createdBusinessLine as any);

      const result = await createBusinessLine(validBusinessLineData);

      expect(result.id).toBe('bl-new');
      expect(result.name).toBe('New Business Line');
      expect(mockPrisma.businessLine.create).toHaveBeenCalledWith({
        data: validBusinessLineData,
      });
    });

    it('should throw error when slug already exists', async () => {
      mockSession = sessionUserA;
      mockPrisma.businessLine.findUnique.mockResolvedValue(
        createMockBusinessLine({ slug: 'existing-slug' }) as any
      );

      const dataWithExistingSlug = { ...validBusinessLineData, slug: 'existing-slug' };

      await expect(createBusinessLine(dataWithExistingSlug)).rejects.toThrow(
        'Já existe uma linha de negócio com este slug'
      );
      expect(mockPrisma.businessLine.create).not.toHaveBeenCalled();
    });

    it('should throw "Não autorizado" without session', async () => {
      mockSession = null;

      await expect(createBusinessLine(validBusinessLineData)).rejects.toThrow('Não autorizado');
    });

    it('should throw validation error with empty name', async () => {
      mockSession = sessionUserA;

      const invalidData = { ...validBusinessLineData, name: '' };

      await expect(createBusinessLine(invalidData)).rejects.toThrow();
    });

    it('should throw validation error with invalid slug', async () => {
      mockSession = sessionUserA;

      const invalidData = { ...validBusinessLineData, slug: 'INVALID SLUG!' };

      await expect(createBusinessLine(invalidData)).rejects.toThrow();
    });

    it('should throw validation error with invalid color', async () => {
      mockSession = sessionUserA;

      const invalidData = { ...validBusinessLineData, color: 'not-a-hex' };

      await expect(createBusinessLine(invalidData)).rejects.toThrow();
    });

    it('should accept valid hex color', async () => {
      mockSession = sessionUserA;
      const dataWithValidColor = { ...validBusinessLineData, color: '#AABBCC' };
      mockPrisma.businessLine.findUnique.mockResolvedValue(null);
      mockPrisma.businessLine.create.mockResolvedValue(
        createMockBusinessLine(dataWithValidColor) as any
      );

      await createBusinessLine(dataWithValidColor);

      expect(mockPrisma.businessLine.create).toHaveBeenCalled();
    });
  });

  // ===========================================
  // updateBusinessLine Tests
  // ===========================================
  describe('updateBusinessLine', () => {
    const updateData = {
      id: CUID_BL_1,
      name: 'Updated Business Line',
      slug: 'updated-business-line',
    };

    it('should update business line with valid data', async () => {
      mockSession = sessionUserA;
      mockPrisma.businessLine.findFirst.mockResolvedValue(null); // No conflict
      mockPrisma.businessLine.update.mockResolvedValue(
        createMockBusinessLine({ id: CUID_BL_1, name: 'Updated Business Line', slug: 'updated-business-line' }) as any
      );

      const result = await updateBusinessLine(updateData);

      expect(result.name).toBe('Updated Business Line');
      expect(mockPrisma.businessLine.update).toHaveBeenCalledWith({
        where: { id: CUID_BL_1 },
        data: {
          name: 'Updated Business Line',
          slug: 'updated-business-line',
        },
      });
    });

    it('should throw error when updating to existing slug', async () => {
      mockSession = sessionUserA;
      mockPrisma.businessLine.findFirst.mockResolvedValue(
        createMockBusinessLine({ id: CUID_BL_OTHER, slug: 'existing-slug' }) as any
      );

      const dataWithExistingSlug = { id: CUID_BL_1, slug: 'existing-slug' };

      await expect(updateBusinessLine(dataWithExistingSlug)).rejects.toThrow(
        'Já existe uma linha de negócio com este slug'
      );
      expect(mockPrisma.businessLine.update).not.toHaveBeenCalled();
    });

    it('should throw "Não autorizado" without session', async () => {
      mockSession = null;

      await expect(updateBusinessLine(updateData)).rejects.toThrow('Não autorizado');
    });

    it('should allow updating without changing slug', async () => {
      mockSession = sessionUserA;
      const updateWithoutSlug = { id: CUID_BL_1, name: 'New Name Only' };
      mockPrisma.businessLine.update.mockResolvedValue(
        createMockBusinessLine({ id: CUID_BL_1, name: 'New Name Only' }) as any
      );

      const result = await updateBusinessLine(updateWithoutSlug);

      expect(result.name).toBe('New Name Only');
      // Should not check for slug conflict if slug not being changed
      expect(mockPrisma.businessLine.findFirst).not.toHaveBeenCalled();
    });
  });

  // ===========================================
  // deleteBusinessLine Tests
  // ===========================================
  describe('deleteBusinessLine', () => {
    it('should delete business line with no products', async () => {
      mockSession = sessionUserA;
      const businessLine = {
        ...createMockBusinessLine({ id: 'bl-1' }),
        _count: { products: 0 },
      };
      mockPrisma.businessLine.findUnique.mockResolvedValue(businessLine as any);
      mockPrisma.businessLine.delete.mockResolvedValue(businessLine as any);

      await deleteBusinessLine('bl-1');

      expect(mockPrisma.businessLine.delete).toHaveBeenCalledWith({
        where: { id: 'bl-1' },
      });
    });

    it('should throw error when business line has products', async () => {
      mockSession = sessionUserA;
      const businessLineWithProducts = {
        ...createMockBusinessLine({ id: 'bl-1' }),
        _count: { products: 3 },
      };
      mockPrisma.businessLine.findUnique.mockResolvedValue(businessLineWithProducts as any);

      await expect(deleteBusinessLine('bl-1')).rejects.toThrow(
        'Não é possível excluir uma linha de negócio com produtos vinculados'
      );
      expect(mockPrisma.businessLine.delete).not.toHaveBeenCalled();
    });

    it('should throw error for non-existent business line', async () => {
      mockSession = sessionUserA;
      mockPrisma.businessLine.findUnique.mockResolvedValue(null);

      await expect(deleteBusinessLine('non-existent')).rejects.toThrow(
        'Linha de negócio não encontrada'
      );
    });

    it('should throw "Não autorizado" without session', async () => {
      mockSession = null;

      await expect(deleteBusinessLine('bl-1')).rejects.toThrow('Não autorizado');
    });
  });

  // ===========================================
  // toggleBusinessLineActive Tests
  // ===========================================
  describe('toggleBusinessLineActive', () => {
    it('should toggle business line from active to inactive', async () => {
      mockSession = sessionUserA;
      const businessLine = createMockBusinessLine({ id: 'bl-1', isActive: true });
      mockPrisma.businessLine.findUnique.mockResolvedValue(businessLine as any);
      mockPrisma.businessLine.update.mockResolvedValue({
        ...businessLine,
        isActive: false,
      } as any);

      const result = await toggleBusinessLineActive('bl-1');

      expect(result.isActive).toBe(false);
      expect(mockPrisma.businessLine.update).toHaveBeenCalledWith({
        where: { id: 'bl-1' },
        data: { isActive: false },
      });
    });

    it('should toggle business line from inactive to active', async () => {
      mockSession = sessionUserA;
      const businessLine = createMockBusinessLine({ id: 'bl-1', isActive: false });
      mockPrisma.businessLine.findUnique.mockResolvedValue(businessLine as any);
      mockPrisma.businessLine.update.mockResolvedValue({
        ...businessLine,
        isActive: true,
      } as any);

      const result = await toggleBusinessLineActive('bl-1');

      expect(result.isActive).toBe(true);
      expect(mockPrisma.businessLine.update).toHaveBeenCalledWith({
        where: { id: 'bl-1' },
        data: { isActive: true },
      });
    });

    it('should throw error for non-existent business line', async () => {
      mockSession = sessionUserA;
      mockPrisma.businessLine.findUnique.mockResolvedValue(null);

      await expect(toggleBusinessLineActive('non-existent')).rejects.toThrow(
        'Linha de negócio não encontrada'
      );
    });

    it('should throw "Não autorizado" without session', async () => {
      mockSession = null;

      await expect(toggleBusinessLineActive('bl-1')).rejects.toThrow('Não autorizado');
    });
  });
});
