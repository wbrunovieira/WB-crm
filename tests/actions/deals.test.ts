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
  getDeals,
  getDealById,
} from '@/actions/deals';
import {
  userA,
  userB,
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

});
