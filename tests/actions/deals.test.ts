/**
 * Tests for Deals Server Actions
 *
 * REGRA FUNDAMENTAL: Quando um teste falha, corrija a IMPLEMENTAÇÃO, nunca o teste.
 * Os testes definem o comportamento esperado do sistema.
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
  createDeal,
  getDeals,
  getDealById,
  updateDeal,
  deleteDeal,
  updateDealStage,
} from '@/actions/deals';
import {
  userA,
  userB,
  adminUser,
  sessionUserA,
  sessionUserB,
  sessionAdmin,
  createMockDeal,
} from '../fixtures/multiple-users';

const mockPrisma = prisma as unknown as ReturnType<typeof mockDeep<PrismaClient>>;

describe('Deals Actions', () => {
  beforeEach(() => {
    mockReset(mockPrisma);
    mockSession = null;
    // Setup default mocks for sharedEntity (used by getOwnerOrSharedFilter and canAccessEntity)
    mockPrisma.sharedEntity.findMany.mockResolvedValue([]);
    mockPrisma.sharedEntity.findFirst.mockResolvedValue(null);
  });

  // ===========================================
  // createDeal Tests
  // ===========================================
  describe('createDeal', () => {
    const validDealData = {
      title: 'New Deal',
      value: 10000,
      currency: 'BRL',
      status: 'open' as const,
      stageId: 'stage-1',
      contactId: null,
      organizationId: null,
      expectedCloseDate: null,
    };

    it('should create a deal with valid data', async () => {
      mockSession = sessionUserA;
      const createdDeal = {
        id: 'deal-1',
        ...validDealData,
        ownerId: userA.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        stage: { id: 'stage-1', name: 'Prospecting', pipeline: { id: 'pipeline-1', name: 'Sales' } },
        contact: null,
        organization: null,
        owner: userA,
      };

      mockPrisma.deal.create.mockResolvedValue(createdDeal);

      const result = await createDeal(validDealData);

      expect(result.id).toBe('deal-1');
      expect(result.title).toBe('New Deal');
      expect(mockPrisma.deal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'New Deal',
            value: 10000,
            ownerId: userA.id,
          }),
        })
      );
    });

    it('should throw error with invalid title (too short)', async () => {
      mockSession = sessionUserA;

      const invalidData = { ...validDealData, title: 'A' };

      await expect(createDeal(invalidData)).rejects.toThrow();
    });

    it('should throw error with negative value', async () => {
      mockSession = sessionUserA;

      const invalidData = { ...validDealData, value: -100 };

      await expect(createDeal(invalidData)).rejects.toThrow();
    });

    it('should throw error without stageId', async () => {
      mockSession = sessionUserA;

      const invalidData = { ...validDealData, stageId: '' };

      await expect(createDeal(invalidData)).rejects.toThrow();
    });

    it('should set ownerId to current user', async () => {
      mockSession = sessionUserA;
      mockPrisma.deal.create.mockResolvedValue({
        id: 'deal-1',
        ...validDealData,
        ownerId: userA.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await createDeal(validDealData);

      expect(mockPrisma.deal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ownerId: userA.id,
          }),
        })
      );
    });

    it('should create deal with contactId', async () => {
      mockSession = sessionUserA;
      const dealWithContact = { ...validDealData, contactId: 'contact-1' };
      mockPrisma.deal.create.mockResolvedValue({
        id: 'deal-1',
        ...dealWithContact,
        ownerId: userA.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await createDeal(dealWithContact);

      expect(mockPrisma.deal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            contactId: 'contact-1',
          }),
        })
      );
    });

    it('should create deal with organizationId', async () => {
      mockSession = sessionUserA;
      const dealWithOrg = { ...validDealData, organizationId: 'org-1' };
      mockPrisma.deal.create.mockResolvedValue({
        id: 'deal-1',
        ...dealWithOrg,
        ownerId: userA.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await createDeal(dealWithOrg);

      expect(mockPrisma.deal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: 'org-1',
          }),
        })
      );
    });

    it('should create deal with expectedCloseDate', async () => {
      mockSession = sessionUserA;
      const closeDate = new Date('2025-06-30');
      const dealWithDate = { ...validDealData, expectedCloseDate: closeDate };
      mockPrisma.deal.create.mockResolvedValue({
        id: 'deal-1',
        ...dealWithDate,
        ownerId: userA.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await createDeal(dealWithDate);

      expect(mockPrisma.deal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            expectedCloseDate: closeDate,
          }),
        })
      );
    });

    it('should throw "Não autorizado" without session', async () => {
      mockSession = null;

      await expect(createDeal(validDealData)).rejects.toThrow('Não autorizado');
    });

    // Triangulation: Different users can create their own deals
    it('should allow User B to create their own deal', async () => {
      mockSession = sessionUserB;
      mockPrisma.deal.create.mockResolvedValue({
        id: 'deal-2',
        ...validDealData,
        ownerId: userB.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await createDeal(validDealData);

      expect(mockPrisma.deal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ownerId: userB.id,
          }),
        })
      );
    });
  });

  // ===========================================
  // getDeals Tests
  // ===========================================
  describe('getDeals', () => {
    it('should filter deals by owner for non-admin user', async () => {
      mockSession = sessionUserA;
      const userADeals = [
        createMockDeal(userA.id, { id: 'deal-1', title: 'Deal 1' }),
        createMockDeal(userA.id, { id: 'deal-2', title: 'Deal 2' }),
      ];

      mockPrisma.deal.findMany.mockResolvedValue(userADeals as any);

      await getDeals({});

      expect(mockPrisma.deal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: userA.id,
          }),
        })
      );
    });

    it('should return all deals for admin user', async () => {
      mockSession = sessionAdmin;
      const allDeals = [
        createMockDeal(userA.id, { id: 'deal-1', title: 'Deal A' }),
        createMockDeal(userB.id, { id: 'deal-2', title: 'Deal B' }),
      ];

      mockPrisma.deal.findMany.mockResolvedValue(allDeals as any);

      await getDeals({});

      // Admin should not have ownerId filter
      const call = mockPrisma.deal.findMany.mock.calls[0][0];
      expect(call?.where?.ownerId).toBeUndefined();
    });

    it('should filter by search term in title', async () => {
      mockSession = sessionUserA;
      mockPrisma.deal.findMany.mockResolvedValue([]);

      await getDeals({ search: 'Enterprise' });

      expect(mockPrisma.deal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            title: expect.objectContaining({
              contains: 'Enterprise',
            }),
          }),
        })
      );
    });

    it('should filter by status', async () => {
      mockSession = sessionUserA;
      mockPrisma.deal.findMany.mockResolvedValue([]);

      await getDeals({ status: 'won' });

      expect(mockPrisma.deal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'won',
          }),
        })
      );
    });

    it('should filter by stageId', async () => {
      mockSession = sessionUserA;
      mockPrisma.deal.findMany.mockResolvedValue([]);

      await getDeals({ stageId: 'stage-2' });

      expect(mockPrisma.deal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            stageId: 'stage-2',
          }),
        })
      );
    });

    it('should sort by value descending', async () => {
      mockSession = sessionUserA;
      mockPrisma.deal.findMany.mockResolvedValue([]);

      await getDeals({ sortBy: 'value', sortOrder: 'desc' });

      expect(mockPrisma.deal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: expect.objectContaining({
            value: 'desc',
          }),
        })
      );
    });

    it('should sort by createdAt by default', async () => {
      mockSession = sessionUserA;
      mockPrisma.deal.findMany.mockResolvedValue([]);

      await getDeals({});

      expect(mockPrisma.deal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: expect.objectContaining({
            createdAt: 'desc',
          }),
        })
      );
    });

    it('should throw "Não autorizado" without session', async () => {
      mockSession = null;

      await expect(getDeals({})).rejects.toThrow('Não autorizado');
    });

    // Triangulation: User B sees only their deals
    it('should filter by User B ownerId when User B queries', async () => {
      mockSession = sessionUserB;
      mockPrisma.deal.findMany.mockResolvedValue([]);

      await getDeals({});

      expect(mockPrisma.deal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: userB.id,
          }),
        })
      );
    });
  });

  // ===========================================
  // getDealById Tests
  // ===========================================
  describe('getDealById', () => {
    it('should return deal owned by current user', async () => {
      mockSession = sessionUserA;
      const deal = createMockDeal(userA.id, { id: 'deal-1', title: 'My Deal' });
      mockPrisma.deal.findFirst.mockResolvedValue(deal as any);

      const result = await getDealById('deal-1');

      expect(result?.id).toBe('deal-1');
      expect(result?.title).toBe('My Deal');
      expect(mockPrisma.deal.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'deal-1',
            ownerId: userA.id,
          }),
        })
      );
    });

    it('should return null when accessing deal owned by another user', async () => {
      mockSession = sessionUserA;
      // findFirst with ownerFilter returns null for records not owned by user
      mockPrisma.deal.findFirst.mockResolvedValue(null);

      const result = await getDealById('deal-2');

      expect(result).toBeNull();
    });

    it('should return null for non-existent deal', async () => {
      mockSession = sessionUserA;
      mockPrisma.deal.findFirst.mockResolvedValue(null);

      const result = await getDealById('non-existent');

      expect(result).toBeNull();
    });

    it('should allow admin to access any deal (no ownerId filter)', async () => {
      mockSession = sessionAdmin;
      const userADeal = createMockDeal(userA.id, { id: 'deal-1', title: 'User A Deal' });
      mockPrisma.deal.findFirst.mockResolvedValue(userADeal as any);

      const result = await getDealById('deal-1');

      expect(result?.id).toBe('deal-1');
      // Admin should not have ownerId filter
      const call = mockPrisma.deal.findFirst.mock.calls[0][0];
      expect(call?.where?.ownerId).toBeUndefined();
    });

    it('should throw "Não autorizado" without session', async () => {
      mockSession = null;

      await expect(getDealById('deal-1')).rejects.toThrow('Não autorizado');
    });

    // Triangulation: User B can access their own deal
    it('should allow User B to access their own deal', async () => {
      mockSession = sessionUserB;
      const userBDeal = createMockDeal(userB.id, { id: 'deal-b', title: 'User B Deal' });
      mockPrisma.deal.findFirst.mockResolvedValue(userBDeal as any);

      const result = await getDealById('deal-b');

      expect(result?.id).toBe('deal-b');
    });

    // Triangulation: User B cannot access User A's deal - returns null
    it('should return null when User B tries to access User A deal', async () => {
      mockSession = sessionUserB;
      // findFirst with ownerFilter returns null for records not owned by user
      mockPrisma.deal.findFirst.mockResolvedValue(null);

      const result = await getDealById('deal-a');

      expect(result).toBeNull();
    });
  });

  // ===========================================
  // updateDeal Tests
  // ===========================================
  describe('updateDeal', () => {
    const updateData = {
      title: 'Updated Deal',
      value: 20000,
      currency: 'BRL',
      status: 'open' as const,
      stageId: 'stage-1',
      contactId: null,
      organizationId: null,
      expectedCloseDate: null,
    };

    it('should update deal owned by current user', async () => {
      mockSession = sessionUserA;
      const existingDeal = createMockDeal(userA.id, { id: 'deal-1', title: 'Old Title' });
      mockPrisma.deal.findUnique.mockResolvedValue(existingDeal as any);
      mockPrisma.deal.update.mockResolvedValue({
        ...existingDeal,
        ...updateData,
      } as any);

      const result = await updateDeal('deal-1', updateData);

      expect(result.title).toBe('Updated Deal');
      expect(mockPrisma.deal.update).toHaveBeenCalled();
    });

    it('should throw error when updating deal owned by another user', async () => {
      mockSession = sessionUserA;
      const otherUserDeal = createMockDeal(userB.id, { id: 'deal-2', title: 'Not Mine' });
      mockPrisma.deal.findUnique.mockResolvedValue(otherUserDeal as any);

      await expect(updateDeal('deal-2', updateData)).rejects.toThrow('Negócio não encontrado');
    });

    it('should throw error for non-existent deal', async () => {
      mockSession = sessionUserA;
      mockPrisma.deal.findUnique.mockResolvedValue(null);

      await expect(updateDeal('non-existent', updateData)).rejects.toThrow('Negócio não encontrado');
    });

    it('should allow admin to update any deal', async () => {
      mockSession = sessionAdmin;
      const userADeal = createMockDeal(userA.id, { id: 'deal-1', title: 'User A Deal' });
      mockPrisma.deal.findUnique.mockResolvedValue(userADeal as any);
      mockPrisma.deal.update.mockResolvedValue({
        ...userADeal,
        ...updateData,
      } as any);

      const result = await updateDeal('deal-1', updateData);

      expect(result.title).toBe('Updated Deal');
    });

    it('should throw validation error with invalid data', async () => {
      mockSession = sessionUserA;
      const existingDeal = createMockDeal(userA.id, { id: 'deal-1' });
      mockPrisma.deal.findUnique.mockResolvedValue(existingDeal as any);

      const invalidData = { ...updateData, title: 'A' }; // Too short

      await expect(updateDeal('deal-1', invalidData)).rejects.toThrow();
    });

    it('should throw "Não autorizado" without session', async () => {
      mockSession = null;

      await expect(updateDeal('deal-1', updateData)).rejects.toThrow('Não autorizado');
    });

    it('should update deal status to won', async () => {
      mockSession = sessionUserA;
      const existingDeal = createMockDeal(userA.id, { id: 'deal-1', status: 'open' });
      mockPrisma.deal.findUnique.mockResolvedValue(existingDeal as any);
      mockPrisma.deal.update.mockResolvedValue({
        ...existingDeal,
        ...updateData,
        status: 'won',
      } as any);

      const result = await updateDeal('deal-1', { ...updateData, status: 'won' });

      expect(result.status).toBe('won');
    });

    // Triangulation: User B can update their own deal
    it('should allow User B to update their own deal', async () => {
      mockSession = sessionUserB;
      const userBDeal = createMockDeal(userB.id, { id: 'deal-b' });
      mockPrisma.deal.findUnique.mockResolvedValue(userBDeal as any);
      mockPrisma.deal.update.mockResolvedValue({
        ...userBDeal,
        ...updateData,
      } as any);

      const result = await updateDeal('deal-b', updateData);

      expect(result.title).toBe('Updated Deal');
    });
  });

  // ===========================================
  // updateDealStage Tests
  // ===========================================
  describe('updateDealStage', () => {
    it('should update deal stage for owned deal', async () => {
      mockSession = sessionUserA;
      const existingDeal = createMockDeal(userA.id, { id: 'deal-1' });
      mockPrisma.deal.findUnique.mockResolvedValue(existingDeal as any);
      mockPrisma.deal.update.mockResolvedValue({
        ...existingDeal,
        stageId: 'stage-2',
      } as any);

      const result = await updateDealStage('deal-1', 'stage-2');

      expect(result.stageId).toBe('stage-2');
      expect(mockPrisma.deal.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'deal-1' },
          data: { stageId: 'stage-2' },
        })
      );
    });

    it('should throw error when updating stage of deal owned by another user', async () => {
      mockSession = sessionUserA;
      const otherUserDeal = createMockDeal(userB.id, { id: 'deal-2' });
      mockPrisma.deal.findUnique.mockResolvedValue(otherUserDeal as any);

      await expect(updateDealStage('deal-2', 'stage-2')).rejects.toThrow('Negócio não encontrado');
    });

    it('should throw error for non-existent deal', async () => {
      mockSession = sessionUserA;
      mockPrisma.deal.findUnique.mockResolvedValue(null);

      await expect(updateDealStage('non-existent', 'stage-2')).rejects.toThrow('Negócio não encontrado');
    });

    it('should allow admin to update any deal stage', async () => {
      mockSession = sessionAdmin;
      const userADeal = createMockDeal(userA.id, { id: 'deal-1' });
      mockPrisma.deal.findUnique.mockResolvedValue(userADeal as any);
      mockPrisma.deal.update.mockResolvedValue({
        ...userADeal,
        stageId: 'stage-3',
      } as any);

      const result = await updateDealStage('deal-1', 'stage-3');

      expect(result.stageId).toBe('stage-3');
    });

    it('should throw "Não autorizado" without session', async () => {
      mockSession = null;

      await expect(updateDealStage('deal-1', 'stage-2')).rejects.toThrow('Não autorizado');
    });

    // Triangulation: User B can update stage of their own deal
    it('should allow User B to update stage of their own deal', async () => {
      mockSession = sessionUserB;
      const userBDeal = createMockDeal(userB.id, { id: 'deal-b' });
      mockPrisma.deal.findUnique.mockResolvedValue(userBDeal as any);
      mockPrisma.deal.update.mockResolvedValue({
        ...userBDeal,
        stageId: 'stage-final',
      } as any);

      const result = await updateDealStage('deal-b', 'stage-final');

      expect(result.stageId).toBe('stage-final');
    });

    // Triangulation: User B cannot update stage of User A's deal
    it('should block User B from updating stage of User A deal', async () => {
      mockSession = sessionUserB;
      const userADeal = createMockDeal(userA.id, { id: 'deal-a' });
      mockPrisma.deal.findUnique.mockResolvedValue(userADeal as any);

      await expect(updateDealStage('deal-a', 'stage-2')).rejects.toThrow('Negócio não encontrado');
    });
  });

  // ===========================================
  // deleteDeal Tests
  // ===========================================
  describe('deleteDeal', () => {
    it('should delete deal owned by current user', async () => {
      mockSession = sessionUserA;
      const existingDeal = createMockDeal(userA.id, { id: 'deal-1' });
      mockPrisma.deal.findUnique.mockResolvedValue(existingDeal as any);
      mockPrisma.deal.delete.mockResolvedValue(existingDeal as any);

      await deleteDeal('deal-1');

      expect(mockPrisma.deal.delete).toHaveBeenCalledWith({
        where: { id: 'deal-1' },
      });
    });

    it('should throw error when deleting deal owned by another user', async () => {
      mockSession = sessionUserA;
      const otherUserDeal = createMockDeal(userB.id, { id: 'deal-2' });
      mockPrisma.deal.findUnique.mockResolvedValue(otherUserDeal as any);

      await expect(deleteDeal('deal-2')).rejects.toThrow('Negócio não encontrado');
    });

    it('should throw error for non-existent deal', async () => {
      mockSession = sessionUserA;
      mockPrisma.deal.findUnique.mockResolvedValue(null);

      await expect(deleteDeal('non-existent')).rejects.toThrow('Negócio não encontrado');
    });

    it('should allow admin to delete any deal', async () => {
      mockSession = sessionAdmin;
      const userADeal = createMockDeal(userA.id, { id: 'deal-1' });
      mockPrisma.deal.findUnique.mockResolvedValue(userADeal as any);
      mockPrisma.deal.delete.mockResolvedValue(userADeal as any);

      await deleteDeal('deal-1');

      expect(mockPrisma.deal.delete).toHaveBeenCalled();
    });

    it('should throw "Não autorizado" without session', async () => {
      mockSession = null;

      await expect(deleteDeal('deal-1')).rejects.toThrow('Não autorizado');
    });

    // Triangulation: User B can delete their own deal
    it('should allow User B to delete their own deal', async () => {
      mockSession = sessionUserB;
      const userBDeal = createMockDeal(userB.id, { id: 'deal-b' });
      mockPrisma.deal.findUnique.mockResolvedValue(userBDeal as any);
      mockPrisma.deal.delete.mockResolvedValue(userBDeal as any);

      await deleteDeal('deal-b');

      expect(mockPrisma.deal.delete).toHaveBeenCalledWith({
        where: { id: 'deal-b' },
      });
    });

    // Triangulation: User B cannot delete User A's deal
    it('should block User B from deleting User A deal', async () => {
      mockSession = sessionUserB;
      const userADeal = createMockDeal(userA.id, { id: 'deal-a' });
      mockPrisma.deal.findUnique.mockResolvedValue(userADeal as any);

      await expect(deleteDeal('deal-a')).rejects.toThrow('Negócio não encontrado');
    });
  });
});
