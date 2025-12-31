/**
 * Tests for Products Server Actions
 *
 * REGRA FUNDAMENTAL: Quando um teste falha, corrija a IMPLEMENTAÇÃO, nunca o teste.
 * Os testes definem o comportamento esperado do sistema.
 *
 * Note: Products are NOT user-scoped (no ownerId). They are admin-managed entities.
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
  getProducts,
  getActiveProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductActive,
} from '@/actions/products';
import {
  sessionUserA,
  sessionUserB,
} from '../fixtures/multiple-users';

const mockPrisma = prisma as unknown as ReturnType<typeof mockDeep<PrismaClient>>;

// Valid CUIDs for testing
const CUID_PROD_1 = 'clxxxxxxxxxxxxxxxxxxxxxxxxp1';
const CUID_PROD_2 = 'clxxxxxxxxxxxxxxxxxxxxxxxxp2';
const CUID_PROD_NEW = 'clxxxxxxxxxxxxxxxxxxxxxpnew';
const CUID_PROD_OTHER = 'clxxxxxxxxxxxxxxxxxxxpother';
const CUID_BL_1 = 'clxxxxxxxxxxxxxxxxxxxxxxxxb1';
const CUID_BL_INVALID = 'clxxxxxxxxxxxxxxxxxbinvalid';

// Helper to create mock product
function createMockProduct(overrides: Partial<{
  id: string;
  name: string;
  slug: string;
  description: string | null;
  businessLineId: string;
  basePrice: number | null;
  currency: string;
  pricingType: string | null;
  isActive: boolean;
  order: number;
}> = {}) {
  return {
    id: overrides.id || `prod-${Date.now()}`,
    name: overrides.name || 'Website Development',
    slug: overrides.slug || 'website-development',
    description: overrides.description !== undefined ? overrides.description : 'Custom website development',
    businessLineId: overrides.businessLineId || 'bl-1',
    basePrice: overrides.basePrice !== undefined ? overrides.basePrice : 5000,
    currency: overrides.currency || 'BRL',
    pricingType: overrides.pricingType !== undefined ? overrides.pricingType : 'fixed',
    isActive: overrides.isActive ?? true,
    order: overrides.order ?? 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// Helper to create mock business line
function createMockBusinessLine(overrides: Partial<{
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}> = {}) {
  return {
    id: overrides.id || 'bl-1',
    name: overrides.name || 'Web Development',
    slug: overrides.slug || 'web-development',
    isActive: overrides.isActive ?? true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('Products Actions', () => {
  beforeEach(() => {
    mockReset(mockPrisma);
    mockSession = null;
  });

  // ===========================================
  // getProducts Tests
  // ===========================================
  describe('getProducts', () => {
    it('should return all products when authenticated', async () => {
      mockSession = sessionUserA;
      const products = [
        { ...createMockProduct({ id: 'prod-1', name: 'Website' }), businessLine: createMockBusinessLine(), _count: { leadProducts: 0, organizationProducts: 0, dealProducts: 0, partnerProducts: 0 } },
        { ...createMockProduct({ id: 'prod-2', name: 'Mobile App' }), businessLine: createMockBusinessLine(), _count: { leadProducts: 0, organizationProducts: 0, dealProducts: 0, partnerProducts: 0 } },
      ];

      mockPrisma.product.findMany.mockResolvedValue(products as any);

      const result = await getProducts();

      expect(result).toHaveLength(2);
      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: undefined,
        orderBy: [{ order: 'asc' }, { name: 'asc' }],
        include: {
          businessLine: true,
          _count: {
            select: {
              leadProducts: true,
              organizationProducts: true,
              dealProducts: true,
              partnerProducts: true,
            },
          },
        },
      });
    });

    it('should filter by businessLineId when provided', async () => {
      mockSession = sessionUserA;
      mockPrisma.product.findMany.mockResolvedValue([]);

      await getProducts('bl-specific');

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: { businessLineId: 'bl-specific' },
        orderBy: [{ order: 'asc' }, { name: 'asc' }],
        include: expect.any(Object),
      });
    });

    it('should throw "Não autorizado" without session', async () => {
      mockSession = null;

      await expect(getProducts()).rejects.toThrow('Não autorizado');
    });

    it('should return empty array when no products exist', async () => {
      mockSession = sessionUserA;
      mockPrisma.product.findMany.mockResolvedValue([]);

      const result = await getProducts();

      expect(result).toEqual([]);
    });

    it('should include link counts', async () => {
      mockSession = sessionUserA;
      const products = [{
        ...createMockProduct({ id: 'prod-1' }),
        businessLine: createMockBusinessLine(),
        _count: {
          leadProducts: 2,
          organizationProducts: 3,
          dealProducts: 5,
          partnerProducts: 1,
        },
      }];

      mockPrisma.product.findMany.mockResolvedValue(products as any);

      const result = await getProducts();

      expect(result[0]._count.leadProducts).toBe(2);
      expect(result[0]._count.dealProducts).toBe(5);
    });

    // Triangulation: User B can also access products
    it('should allow User B to access products', async () => {
      mockSession = sessionUserB;
      mockPrisma.product.findMany.mockResolvedValue([]);

      const result = await getProducts();

      expect(result).toEqual([]);
      expect(mockPrisma.product.findMany).toHaveBeenCalled();
    });
  });

  // ===========================================
  // getActiveProducts Tests
  // ===========================================
  describe('getActiveProducts', () => {
    it('should return only active products', async () => {
      mockSession = sessionUserA;
      const activeProducts = [
        { ...createMockProduct({ id: 'prod-1', isActive: true }), businessLine: createMockBusinessLine() },
      ];

      mockPrisma.product.findMany.mockResolvedValue(activeProducts as any);

      const result = await getActiveProducts();

      expect(result).toHaveLength(1);
      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          businessLineId: undefined,
        },
        orderBy: [{ order: 'asc' }, { name: 'asc' }],
        include: {
          businessLine: true,
        },
      });
    });

    it('should filter by businessLineId when provided', async () => {
      mockSession = sessionUserA;
      mockPrisma.product.findMany.mockResolvedValue([]);

      await getActiveProducts('bl-specific');

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          businessLineId: 'bl-specific',
        },
        orderBy: [{ order: 'asc' }, { name: 'asc' }],
        include: {
          businessLine: true,
        },
      });
    });

    it('should throw "Não autorizado" without session', async () => {
      mockSession = null;

      await expect(getActiveProducts()).rejects.toThrow('Não autorizado');
    });
  });

  // ===========================================
  // getProductById Tests
  // ===========================================
  describe('getProductById', () => {
    it('should return product by ID', async () => {
      mockSession = sessionUserA;
      const product = {
        ...createMockProduct({ id: 'prod-1', name: 'Website Development' }),
        businessLine: createMockBusinessLine(),
        _count: { leadProducts: 0, organizationProducts: 0, dealProducts: 0, partnerProducts: 0 },
      };

      mockPrisma.product.findUnique.mockResolvedValue(product as any);

      const result = await getProductById('prod-1');

      expect(result?.id).toBe('prod-1');
      expect(result?.name).toBe('Website Development');
    });

    it('should return null for non-existent product', async () => {
      mockSession = sessionUserA;
      mockPrisma.product.findUnique.mockResolvedValue(null);

      const result = await getProductById('non-existent');

      expect(result).toBeNull();
    });

    it('should throw "Não autorizado" without session', async () => {
      mockSession = null;

      await expect(getProductById('prod-1')).rejects.toThrow('Não autorizado');
    });
  });

  // ===========================================
  // createProduct Tests
  // ===========================================
  describe('createProduct', () => {
    const validProductData = {
      name: 'New Product',
      slug: 'new-product',
      description: 'A new product',
      businessLineId: CUID_BL_1,
      basePrice: 1000,
      currency: 'BRL',
      pricingType: 'fixed' as const,
      isActive: true,
      order: 1,
    };

    it('should create a product with valid data', async () => {
      mockSession = sessionUserA;
      const createdProduct = createMockProduct({
        id: CUID_PROD_NEW,
        name: 'New Product',
        slug: 'new-product',
        businessLineId: CUID_BL_1,
      });

      mockPrisma.product.findUnique.mockResolvedValue(null); // Slug doesn't exist
      mockPrisma.businessLine.findUnique.mockResolvedValue(createMockBusinessLine({ id: CUID_BL_1 }) as any);
      mockPrisma.product.create.mockResolvedValue(createdProduct as any);

      const result = await createProduct(validProductData);

      expect(result.id).toBe(CUID_PROD_NEW);
      expect(result.name).toBe('New Product');
      expect(mockPrisma.product.create).toHaveBeenCalledWith({
        data: validProductData,
      });
    });

    it('should throw error when slug already exists', async () => {
      mockSession = sessionUserA;
      mockPrisma.product.findUnique.mockResolvedValue(
        createMockProduct({ slug: 'existing-slug' }) as any
      );

      const dataWithExistingSlug = { ...validProductData, slug: 'existing-slug' };

      await expect(createProduct(dataWithExistingSlug)).rejects.toThrow(
        'Já existe um produto com este slug'
      );
      expect(mockPrisma.product.create).not.toHaveBeenCalled();
    });

    it('should throw error when business line does not exist', async () => {
      mockSession = sessionUserA;
      mockPrisma.product.findUnique.mockResolvedValue(null);
      mockPrisma.businessLine.findUnique.mockResolvedValue(null);

      await expect(createProduct(validProductData)).rejects.toThrow(
        'Linha de negócio não encontrada'
      );
      expect(mockPrisma.product.create).not.toHaveBeenCalled();
    });

    it('should throw "Não autorizado" without session', async () => {
      mockSession = null;

      await expect(createProduct(validProductData)).rejects.toThrow('Não autorizado');
    });

    it('should throw validation error with empty name', async () => {
      mockSession = sessionUserA;

      const invalidData = { ...validProductData, name: '' };

      await expect(createProduct(invalidData)).rejects.toThrow();
    });

    it('should throw validation error with invalid slug', async () => {
      mockSession = sessionUserA;

      const invalidData = { ...validProductData, slug: 'INVALID SLUG!' };

      await expect(createProduct(invalidData)).rejects.toThrow();
    });

    it('should throw validation error with negative basePrice', async () => {
      mockSession = sessionUserA;

      const invalidData = { ...validProductData, basePrice: -100 };

      await expect(createProduct(invalidData)).rejects.toThrow();
    });

    it('should accept different pricing types', async () => {
      mockSession = sessionUserA;
      mockPrisma.product.findUnique.mockResolvedValue(null);
      mockPrisma.businessLine.findUnique.mockResolvedValue(createMockBusinessLine({ id: CUID_BL_1 }) as any);
      mockPrisma.product.create.mockResolvedValue(
        createMockProduct({ pricingType: 'hourly', businessLineId: CUID_BL_1 }) as any
      );

      const dataWithHourlyPricing = { ...validProductData, pricingType: 'hourly' as const };

      await createProduct(dataWithHourlyPricing);

      expect(mockPrisma.product.create).toHaveBeenCalled();
    });
  });

  // ===========================================
  // updateProduct Tests
  // ===========================================
  describe('updateProduct', () => {
    const updateData = {
      id: CUID_PROD_1,
      name: 'Updated Product',
      slug: 'updated-product',
    };

    it('should update product with valid data', async () => {
      mockSession = sessionUserA;
      mockPrisma.product.findFirst.mockResolvedValue(null); // No slug conflict
      mockPrisma.product.update.mockResolvedValue(
        createMockProduct({ id: CUID_PROD_1, name: 'Updated Product', slug: 'updated-product' }) as any
      );

      const result = await updateProduct(updateData);

      expect(result.name).toBe('Updated Product');
      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: CUID_PROD_1 },
        data: {
          name: 'Updated Product',
          slug: 'updated-product',
        },
      });
    });

    it('should throw error when updating to existing slug', async () => {
      mockSession = sessionUserA;
      mockPrisma.product.findFirst.mockResolvedValue(
        createMockProduct({ id: CUID_PROD_OTHER, slug: 'existing-slug' }) as any
      );

      const dataWithExistingSlug = { id: CUID_PROD_1, slug: 'existing-slug' };

      await expect(updateProduct(dataWithExistingSlug)).rejects.toThrow(
        'Já existe um produto com este slug'
      );
      expect(mockPrisma.product.update).not.toHaveBeenCalled();
    });

    it('should throw error when business line does not exist', async () => {
      mockSession = sessionUserA;
      mockPrisma.product.findFirst.mockResolvedValue(null);
      mockPrisma.businessLine.findUnique.mockResolvedValue(null);

      const dataWithInvalidBL = { id: CUID_PROD_1, businessLineId: CUID_BL_INVALID };

      await expect(updateProduct(dataWithInvalidBL)).rejects.toThrow(
        'Linha de negócio não encontrada'
      );
    });

    it('should throw "Não autorizado" without session', async () => {
      mockSession = null;

      await expect(updateProduct(updateData)).rejects.toThrow('Não autorizado');
    });
  });

  // ===========================================
  // deleteProduct Tests
  // ===========================================
  describe('deleteProduct', () => {
    it('should delete product with no links', async () => {
      mockSession = sessionUserA;
      const product = {
        ...createMockProduct({ id: 'prod-1' }),
        _count: {
          leadProducts: 0,
          organizationProducts: 0,
          dealProducts: 0,
          partnerProducts: 0,
        },
      };
      mockPrisma.product.findUnique.mockResolvedValue(product as any);
      mockPrisma.product.delete.mockResolvedValue(product as any);

      await deleteProduct('prod-1');

      expect(mockPrisma.product.delete).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
      });
    });

    it('should throw error when product has lead links', async () => {
      mockSession = sessionUserA;
      const productWithLinks = {
        ...createMockProduct({ id: 'prod-1' }),
        _count: {
          leadProducts: 2,
          organizationProducts: 0,
          dealProducts: 0,
          partnerProducts: 0,
        },
      };
      mockPrisma.product.findUnique.mockResolvedValue(productWithLinks as any);

      await expect(deleteProduct('prod-1')).rejects.toThrow(
        'Não é possível excluir um produto com vínculos ativos'
      );
      expect(mockPrisma.product.delete).not.toHaveBeenCalled();
    });

    it('should throw error when product has deal links', async () => {
      mockSession = sessionUserA;
      const productWithLinks = {
        ...createMockProduct({ id: 'prod-1' }),
        _count: {
          leadProducts: 0,
          organizationProducts: 0,
          dealProducts: 3,
          partnerProducts: 0,
        },
      };
      mockPrisma.product.findUnique.mockResolvedValue(productWithLinks as any);

      await expect(deleteProduct('prod-1')).rejects.toThrow(
        'Não é possível excluir um produto com vínculos ativos'
      );
    });

    it('should throw error when product has organization links', async () => {
      mockSession = sessionUserA;
      const productWithLinks = {
        ...createMockProduct({ id: 'prod-1' }),
        _count: {
          leadProducts: 0,
          organizationProducts: 1,
          dealProducts: 0,
          partnerProducts: 0,
        },
      };
      mockPrisma.product.findUnique.mockResolvedValue(productWithLinks as any);

      await expect(deleteProduct('prod-1')).rejects.toThrow(
        'Não é possível excluir um produto com vínculos ativos'
      );
    });

    it('should throw error when product has partner links', async () => {
      mockSession = sessionUserA;
      const productWithLinks = {
        ...createMockProduct({ id: 'prod-1' }),
        _count: {
          leadProducts: 0,
          organizationProducts: 0,
          dealProducts: 0,
          partnerProducts: 1,
        },
      };
      mockPrisma.product.findUnique.mockResolvedValue(productWithLinks as any);

      await expect(deleteProduct('prod-1')).rejects.toThrow(
        'Não é possível excluir um produto com vínculos ativos'
      );
    });

    it('should throw error for non-existent product', async () => {
      mockSession = sessionUserA;
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(deleteProduct('non-existent')).rejects.toThrow(
        'Produto não encontrado'
      );
    });

    it('should throw "Não autorizado" without session', async () => {
      mockSession = null;

      await expect(deleteProduct('prod-1')).rejects.toThrow('Não autorizado');
    });
  });

  // ===========================================
  // toggleProductActive Tests
  // ===========================================
  describe('toggleProductActive', () => {
    it('should toggle product from active to inactive', async () => {
      mockSession = sessionUserA;
      const product = createMockProduct({ id: 'prod-1', isActive: true });
      mockPrisma.product.findUnique.mockResolvedValue(product as any);
      mockPrisma.product.update.mockResolvedValue({
        ...product,
        isActive: false,
      } as any);

      const result = await toggleProductActive('prod-1');

      expect(result.isActive).toBe(false);
      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { isActive: false },
      });
    });

    it('should toggle product from inactive to active', async () => {
      mockSession = sessionUserA;
      const product = createMockProduct({ id: 'prod-1', isActive: false });
      mockPrisma.product.findUnique.mockResolvedValue(product as any);
      mockPrisma.product.update.mockResolvedValue({
        ...product,
        isActive: true,
      } as any);

      const result = await toggleProductActive('prod-1');

      expect(result.isActive).toBe(true);
      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { isActive: true },
      });
    });

    it('should throw error for non-existent product', async () => {
      mockSession = sessionUserA;
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(toggleProductActive('non-existent')).rejects.toThrow(
        'Produto não encontrado'
      );
    });

    it('should throw "Não autorizado" without session', async () => {
      mockSession = null;

      await expect(toggleProductActive('prod-1')).rejects.toThrow('Não autorizado');
    });
  });
});
