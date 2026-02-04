/**
 * Tests for Product Links Server Actions
 *
 * REGRA FUNDAMENTAL: Quando um teste falha, corrija a IMPLEMENTAÇÃO, nunca o teste.
 * Os testes definem o comportamento esperado do sistema.
 *
 * Note: Product links require authentication but the parent entities
 * (Lead, Organization, Deal, Partner) should be owned by the user.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import type { PrismaClient } from '@prisma/client';
import type { Session } from 'next-auth';
import type {
  LeadProductFormData,
  OrganizationProductFormData,
  PartnerProductFormData,
} from '@/lib/validations/product';

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
  addProductToLead,
  updateLeadProduct,
  removeProductFromLead,
  getLeadProducts,
  addProductToOrganization,
  updateOrganizationProduct,
  removeProductFromOrganization,
  getOrganizationProducts,
  addProductToDeal,
  updateDealProduct,
  removeProductFromDeal,
  getDealProducts,
  addProductToPartner,
  updatePartnerProduct,
  removeProductFromPartner,
  getPartnerProducts,
} from '@/actions/product-links';
import {
  sessionUserA,
  sessionUserB,
} from '../fixtures/multiple-users';

const mockPrisma = prisma as unknown as ReturnType<typeof mockDeep<PrismaClient>>;

// Valid CUIDs for testing
const CUID_LEAD_1 = 'clxxxxxxxxxxxxxxxxxxxxxxxxxl1';
const CUID_ORG_1 = 'clxxxxxxxxxxxxxxxxxxxxxxxxxo1';
const CUID_DEAL_1 = 'clxxxxxxxxxxxxxxxxxxxxxxxxxd1';
const CUID_PARTNER_1 = 'clxxxxxxxxxxxxxxxxxxxxxxxxxp1';
const CUID_PROD_1 = 'clxxxxxxxxxxxxxxxxxxxxxxxxpr1';
const CUID_PROD_2 = 'clxxxxxxxxxxxxxxxxxxxxxxxxpr2';
const CUID_LP_1 = 'clxxxxxxxxxxxxxxxxxxxxxxxxlp1';
const CUID_OP_1 = 'clxxxxxxxxxxxxxxxxxxxxxxxxop1';
const CUID_DP_1 = 'clxxxxxxxxxxxxxxxxxxxxxxxxdp1';
const CUID_PP_1 = 'clxxxxxxxxxxxxxxxxxxxxxxxxpp1';

// Helper to create mock product link
function createMockLeadProduct(overrides: Partial<{
  id: string;
  leadId: string;
  productId: string;
  interestLevel: string | null;
  estimatedValue: number | null;
  notes: string | null;
}> = {}) {
  return {
    id: overrides.id || `lp-${Date.now()}`,
    leadId: overrides.leadId || 'lead-1',
    productId: overrides.productId || 'prod-1',
    interestLevel: overrides.interestLevel !== undefined ? overrides.interestLevel : 'high',
    estimatedValue: overrides.estimatedValue !== undefined ? overrides.estimatedValue : 5000,
    notes: overrides.notes !== undefined ? overrides.notes : 'Interested in this product',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function createMockOrganizationProduct(overrides: Partial<{
  id: string;
  organizationId: string;
  productId: string;
  status: string;
  totalPurchases: number;
  totalRevenue: number;
}> = {}) {
  return {
    id: overrides.id || `op-${Date.now()}`,
    organizationId: overrides.organizationId || 'org-1',
    productId: overrides.productId || 'prod-1',
    status: overrides.status || 'interested',
    firstPurchaseAt: null,
    lastPurchaseAt: null,
    totalPurchases: overrides.totalPurchases ?? 0,
    totalRevenue: overrides.totalRevenue ?? 0,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function createMockDealProduct(overrides: Partial<{
  id: string;
  dealId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalValue: number;
}> = {}) {
  return {
    id: overrides.id || `dp-${Date.now()}`,
    dealId: overrides.dealId || 'deal-1',
    productId: overrides.productId || 'prod-1',
    quantity: overrides.quantity ?? 1,
    unitPrice: overrides.unitPrice ?? 1000,
    discount: overrides.discount ?? 0,
    totalValue: overrides.totalValue ?? 1000,
    description: null,
    deliveryTime: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function createMockPartnerProduct(overrides: Partial<{
  id: string;
  partnerId: string;
  productId: string;
  expertiseLevel: string | null;
  canRefer: boolean;
  canDeliver: boolean;
}> = {}) {
  return {
    id: overrides.id || `pp-${Date.now()}`,
    partnerId: overrides.partnerId || 'partner-1',
    productId: overrides.productId || 'prod-1',
    expertiseLevel: overrides.expertiseLevel !== undefined ? overrides.expertiseLevel : 'expert',
    canRefer: overrides.canRefer ?? true,
    canDeliver: overrides.canDeliver ?? false,
    commissionType: null,
    commissionValue: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('Product Links Actions', () => {
  beforeEach(() => {
    mockReset(mockPrisma);
    mockSession = null;
  });

  // ===========================================
  // Lead Products Tests
  // ===========================================
  describe('Lead Products', () => {
    describe('addProductToLead', () => {
      const validLeadProductData: LeadProductFormData = {
        leadId: CUID_LEAD_1,
        productId: CUID_PROD_1,
        interestLevel: 'high',
        estimatedValue: 5000,
        notes: 'Very interested',
      };

      it('should add product to lead', async () => {
        mockSession = sessionUserA;
        mockPrisma.leadProduct.findUnique.mockResolvedValue(null); // Not already linked
        mockPrisma.leadProduct.create.mockResolvedValue(
          createMockLeadProduct({ leadId: CUID_LEAD_1, productId: CUID_PROD_1 }) as any
        );

        const result = await addProductToLead(validLeadProductData);

        expect(result.leadId).toBe(CUID_LEAD_1);
        expect(result.productId).toBe(CUID_PROD_1);
        expect(mockPrisma.leadProduct.create).toHaveBeenCalledWith({
          data: validLeadProductData,
        });
      });

      it('should throw error when product already linked to lead', async () => {
        mockSession = sessionUserA;
        mockPrisma.leadProduct.findUnique.mockResolvedValue(
          createMockLeadProduct() as any
        );

        await expect(addProductToLead(validLeadProductData)).rejects.toThrow(
          'Este produto já está vinculado ao lead'
        );
        expect(mockPrisma.leadProduct.create).not.toHaveBeenCalled();
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;

        await expect(addProductToLead(validLeadProductData)).rejects.toThrow('Não autorizado');
      });
    });

    describe('updateLeadProduct', () => {
      it('should update lead product', async () => {
        mockSession = sessionUserA;
        const updateData: Partial<LeadProductFormData> = { interestLevel: 'medium', estimatedValue: 3000 };
        mockPrisma.leadProduct.update.mockResolvedValue(
          createMockLeadProduct({ id: 'lp-1', ...updateData }) as any
        );
        mockPrisma.leadProduct.findUnique.mockResolvedValue(
          createMockLeadProduct({ id: 'lp-1', leadId: 'lead-1' }) as any
        );

        const result = await updateLeadProduct('lp-1', updateData);

        expect(mockPrisma.leadProduct.update).toHaveBeenCalledWith({
          where: { id: 'lp-1' },
          data: {
            interestLevel: 'medium',
            estimatedValue: 3000,
            notes: undefined,
          },
        });
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;

        await expect(updateLeadProduct('lp-1', {})).rejects.toThrow('Não autorizado');
      });
    });

    describe('removeProductFromLead', () => {
      it('should remove product from lead', async () => {
        mockSession = sessionUserA;
        mockPrisma.leadProduct.findUnique.mockResolvedValue(
          createMockLeadProduct({ id: 'lp-1', leadId: 'lead-1' }) as any
        );
        mockPrisma.leadProduct.delete.mockResolvedValue({} as any);

        await removeProductFromLead('lp-1');

        expect(mockPrisma.leadProduct.delete).toHaveBeenCalledWith({
          where: { id: 'lp-1' },
        });
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;

        await expect(removeProductFromLead('lp-1')).rejects.toThrow('Não autorizado');
      });
    });

    describe('getLeadProducts', () => {
      it('should return products for a lead', async () => {
        mockSession = sessionUserA;
        const leadProducts = [
          {
            ...createMockLeadProduct({ id: 'lp-1' }),
            product: { id: 'prod-1', name: 'Product 1', businessLine: { id: 'bl-1', name: 'Web' } },
          },
          {
            ...createMockLeadProduct({ id: 'lp-2', productId: 'prod-2' }),
            product: { id: 'prod-2', name: 'Product 2', businessLine: { id: 'bl-1', name: 'Web' } },
          },
        ];

        mockPrisma.leadProduct.findMany.mockResolvedValue(leadProducts as any);

        const result = await getLeadProducts('lead-1');

        expect(result).toHaveLength(2);
        expect(mockPrisma.leadProduct.findMany).toHaveBeenCalledWith({
          where: { leadId: 'lead-1' },
          include: {
            product: {
              include: {
                businessLine: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });
      });

      it('should return empty array when lead has no products', async () => {
        mockSession = sessionUserA;
        mockPrisma.leadProduct.findMany.mockResolvedValue([]);

        const result = await getLeadProducts('lead-1');

        expect(result).toEqual([]);
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;

        await expect(getLeadProducts('lead-1')).rejects.toThrow('Não autorizado');
      });
    });
  });

  // ===========================================
  // Organization Products Tests
  // ===========================================
  describe('Organization Products', () => {
    describe('addProductToOrganization', () => {
      const validOrgProductData: OrganizationProductFormData = {
        organizationId: CUID_ORG_1,
        productId: CUID_PROD_1,
        status: 'interested',
        totalPurchases: 0,
        totalRevenue: 0,
      };

      it('should add product to organization', async () => {
        mockSession = sessionUserA;
        mockPrisma.organizationProduct.findUnique.mockResolvedValue(null);
        mockPrisma.organizationProduct.create.mockResolvedValue(
          createMockOrganizationProduct({ organizationId: CUID_ORG_1, productId: CUID_PROD_1 }) as any
        );

        const result = await addProductToOrganization(validOrgProductData);

        expect(result.organizationId).toBe(CUID_ORG_1);
        expect(result.productId).toBe(CUID_PROD_1);
      });

      it('should throw error when product already linked to organization', async () => {
        mockSession = sessionUserA;
        mockPrisma.organizationProduct.findUnique.mockResolvedValue(
          createMockOrganizationProduct() as any
        );

        await expect(addProductToOrganization(validOrgProductData)).rejects.toThrow(
          'Este produto já está vinculado à organização'
        );
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;

        await expect(addProductToOrganization(validOrgProductData)).rejects.toThrow('Não autorizado');
      });
    });

    describe('updateOrganizationProduct', () => {
      it('should update organization product', async () => {
        mockSession = sessionUserA;
        const updateData: Partial<OrganizationProductFormData> = { status: 'purchased', totalPurchases: 1 };
        mockPrisma.organizationProduct.update.mockResolvedValue(
          createMockOrganizationProduct({ id: 'op-1', ...updateData }) as any
        );
        mockPrisma.organizationProduct.findUnique.mockResolvedValue(
          createMockOrganizationProduct({ id: 'op-1' }) as any
        );

        await updateOrganizationProduct('op-1', updateData);

        expect(mockPrisma.organizationProduct.update).toHaveBeenCalledWith({
          where: { id: 'op-1' },
          data: updateData,
        });
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;

        await expect(updateOrganizationProduct('op-1', {})).rejects.toThrow('Não autorizado');
      });
    });

    describe('removeProductFromOrganization', () => {
      it('should remove product from organization', async () => {
        mockSession = sessionUserA;
        mockPrisma.organizationProduct.findUnique.mockResolvedValue(
          createMockOrganizationProduct({ id: 'op-1' }) as any
        );
        mockPrisma.organizationProduct.delete.mockResolvedValue({} as any);

        await removeProductFromOrganization('op-1');

        expect(mockPrisma.organizationProduct.delete).toHaveBeenCalledWith({
          where: { id: 'op-1' },
        });
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;

        await expect(removeProductFromOrganization('op-1')).rejects.toThrow('Não autorizado');
      });
    });

    describe('getOrganizationProducts', () => {
      it('should return products for an organization', async () => {
        mockSession = sessionUserA;
        const orgProducts = [{
          ...createMockOrganizationProduct({ id: 'op-1' }),
          product: { id: 'prod-1', name: 'Product 1', businessLine: { id: 'bl-1' } },
        }];

        mockPrisma.organizationProduct.findMany.mockResolvedValue(orgProducts as any);

        const result = await getOrganizationProducts('org-1');

        expect(result).toHaveLength(1);
        expect(mockPrisma.organizationProduct.findMany).toHaveBeenCalledWith({
          where: { organizationId: 'org-1' },
          include: {
            product: {
              include: {
                businessLine: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;

        await expect(getOrganizationProducts('org-1')).rejects.toThrow('Não autorizado');
      });
    });
  });

  // ===========================================
  // Deal Products Tests
  // ===========================================
  describe('Deal Products', () => {
    describe('addProductToDeal', () => {
      const validDealProductData = {
        dealId: CUID_DEAL_1,
        productId: CUID_PROD_1,
        quantity: 2,
        unitPrice: 1000,
        discount: 100,
        totalValue: 1900,
      };

      it('should add product to deal', async () => {
        mockSession = sessionUserA;
        mockPrisma.dealProduct.findUnique.mockResolvedValue(null);
        mockPrisma.dealProduct.create.mockResolvedValue(
          createMockDealProduct({ dealId: CUID_DEAL_1, productId: CUID_PROD_1, quantity: 2, unitPrice: 1000, discount: 100, totalValue: 1900 }) as any
        );

        const result = await addProductToDeal(validDealProductData);

        expect(result.dealId).toBe(CUID_DEAL_1);
        expect(result.productId).toBe(CUID_PROD_1);
        expect(mockPrisma.dealProduct.create).toHaveBeenCalledWith({
          data: validDealProductData,
        });
      });

      it('should throw error when product already linked to deal', async () => {
        mockSession = sessionUserA;
        mockPrisma.dealProduct.findUnique.mockResolvedValue(
          createMockDealProduct() as any
        );

        await expect(addProductToDeal(validDealProductData)).rejects.toThrow(
          'Este produto já está vinculado ao deal'
        );
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;

        await expect(addProductToDeal(validDealProductData)).rejects.toThrow('Não autorizado');
      });

      it('should throw validation error with negative quantity', async () => {
        mockSession = sessionUserA;

        const invalidData = { ...validDealProductData, quantity: 0 };

        await expect(addProductToDeal(invalidData)).rejects.toThrow();
      });

      it('should throw validation error with negative unitPrice', async () => {
        mockSession = sessionUserA;

        const invalidData = { ...validDealProductData, unitPrice: -100 };

        await expect(addProductToDeal(invalidData)).rejects.toThrow();
      });
    });

    describe('updateDealProduct', () => {
      it('should update deal product', async () => {
        mockSession = sessionUserA;
        const updateData = { quantity: 3, totalValue: 2800 };
        mockPrisma.dealProduct.update.mockResolvedValue(
          createMockDealProduct({ id: 'dp-1', ...updateData }) as any
        );
        mockPrisma.dealProduct.findUnique.mockResolvedValue(
          createMockDealProduct({ id: 'dp-1' }) as any
        );

        await updateDealProduct('dp-1', updateData);

        expect(mockPrisma.dealProduct.update).toHaveBeenCalledWith({
          where: { id: 'dp-1' },
          data: updateData,
        });
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;

        await expect(updateDealProduct('dp-1', {})).rejects.toThrow('Não autorizado');
      });
    });

    describe('removeProductFromDeal', () => {
      it('should remove product from deal', async () => {
        mockSession = sessionUserA;
        mockPrisma.dealProduct.findUnique.mockResolvedValue(
          createMockDealProduct({ id: 'dp-1' }) as any
        );
        mockPrisma.dealProduct.delete.mockResolvedValue({} as any);

        await removeProductFromDeal('dp-1');

        expect(mockPrisma.dealProduct.delete).toHaveBeenCalledWith({
          where: { id: 'dp-1' },
        });
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;

        await expect(removeProductFromDeal('dp-1')).rejects.toThrow('Não autorizado');
      });
    });

    describe('getDealProducts', () => {
      it('should return products for a deal', async () => {
        mockSession = sessionUserA;
        const dealProducts = [{
          ...createMockDealProduct({ id: 'dp-1' }),
          product: { id: 'prod-1', name: 'Product 1', businessLine: { id: 'bl-1' } },
        }];

        mockPrisma.dealProduct.findMany.mockResolvedValue(dealProducts as any);

        const result = await getDealProducts('deal-1');

        expect(result).toHaveLength(1);
        expect(mockPrisma.dealProduct.findMany).toHaveBeenCalledWith({
          where: { dealId: 'deal-1' },
          include: {
            product: {
              include: {
                businessLine: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;

        await expect(getDealProducts('deal-1')).rejects.toThrow('Não autorizado');
      });
    });
  });

  // ===========================================
  // Partner Products Tests
  // ===========================================
  describe('Partner Products', () => {
    describe('addProductToPartner', () => {
      const validPartnerProductData: PartnerProductFormData = {
        partnerId: CUID_PARTNER_1,
        productId: CUID_PROD_1,
        expertiseLevel: 'expert',
        canRefer: true,
        canDeliver: true,
      };

      it('should add product to partner', async () => {
        mockSession = sessionUserA;
        mockPrisma.partnerProduct.findUnique.mockResolvedValue(null);
        mockPrisma.partnerProduct.create.mockResolvedValue(
          createMockPartnerProduct({ partnerId: CUID_PARTNER_1, productId: CUID_PROD_1 }) as any
        );

        const result = await addProductToPartner(validPartnerProductData);

        expect(result.partnerId).toBe(CUID_PARTNER_1);
        expect(result.productId).toBe(CUID_PROD_1);
      });

      it('should throw error when product already linked to partner', async () => {
        mockSession = sessionUserA;
        mockPrisma.partnerProduct.findUnique.mockResolvedValue(
          createMockPartnerProduct() as any
        );

        await expect(addProductToPartner(validPartnerProductData)).rejects.toThrow(
          'Este produto já está vinculado ao parceiro'
        );
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;

        await expect(addProductToPartner(validPartnerProductData)).rejects.toThrow('Não autorizado');
      });
    });

    describe('updatePartnerProduct', () => {
      it('should update partner product', async () => {
        mockSession = sessionUserA;
        const updateData: Partial<PartnerProductFormData> = { expertiseLevel: 'intermediate', canDeliver: true };
        mockPrisma.partnerProduct.update.mockResolvedValue(
          createMockPartnerProduct({ id: 'pp-1', ...updateData }) as any
        );
        mockPrisma.partnerProduct.findUnique.mockResolvedValue(
          createMockPartnerProduct({ id: 'pp-1' }) as any
        );

        await updatePartnerProduct('pp-1', updateData);

        expect(mockPrisma.partnerProduct.update).toHaveBeenCalledWith({
          where: { id: 'pp-1' },
          data: updateData,
        });
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;

        await expect(updatePartnerProduct('pp-1', {})).rejects.toThrow('Não autorizado');
      });
    });

    describe('removeProductFromPartner', () => {
      it('should remove product from partner', async () => {
        mockSession = sessionUserA;
        mockPrisma.partnerProduct.findUnique.mockResolvedValue(
          createMockPartnerProduct({ id: 'pp-1' }) as any
        );
        mockPrisma.partnerProduct.delete.mockResolvedValue({} as any);

        await removeProductFromPartner('pp-1');

        expect(mockPrisma.partnerProduct.delete).toHaveBeenCalledWith({
          where: { id: 'pp-1' },
        });
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;

        await expect(removeProductFromPartner('pp-1')).rejects.toThrow('Não autorizado');
      });
    });

    describe('getPartnerProducts', () => {
      it('should return products for a partner', async () => {
        mockSession = sessionUserA;
        const partnerProducts = [{
          ...createMockPartnerProduct({ id: 'pp-1' }),
          product: { id: 'prod-1', name: 'Product 1', businessLine: { id: 'bl-1' } },
        }];

        mockPrisma.partnerProduct.findMany.mockResolvedValue(partnerProducts as any);

        const result = await getPartnerProducts('partner-1');

        expect(result).toHaveLength(1);
        expect(mockPrisma.partnerProduct.findMany).toHaveBeenCalledWith({
          where: { partnerId: 'partner-1' },
          include: {
            product: {
              include: {
                businessLine: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });
      });

      it('should throw "Não autorizado" without session', async () => {
        mockSession = null;

        await expect(getPartnerProducts('partner-1')).rejects.toThrow('Não autorizado');
      });

      // Triangulation: User B can also access partner products
      it('should allow User B to access partner products', async () => {
        mockSession = sessionUserB;
        mockPrisma.partnerProduct.findMany.mockResolvedValue([]);

        const result = await getPartnerProducts('partner-1');

        expect(result).toEqual([]);
      });
    });
  });
});
