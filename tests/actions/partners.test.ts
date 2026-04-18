/**
 * Tests for Partners Server Actions
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
  getPartners,
  getPartnerById,
} from '@/actions/partners';
import {
  userA,
  userB,
  adminUser,
  sessionUserA,
  sessionUserB,
  sessionAdmin,
  createMockPartner,
} from '../fixtures/multiple-users';

const mockPrisma = prisma as unknown as ReturnType<typeof mockDeep<PrismaClient>>;

describe('Partners Actions', () => {
  beforeEach(() => {
    mockReset(mockPrisma);
    mockSession = null;
    // Setup default mocks for sharedEntity (used by getOwnerOrSharedFilter and canAccessEntity)
    mockPrisma.sharedEntity.findMany.mockResolvedValue([]);
    mockPrisma.sharedEntity.findFirst.mockResolvedValue(null);
  });

  // ===========================================
  // getPartners Tests
  // ===========================================
  describe('getPartners', () => {
    it('should filter partners by owner for non-admin user', async () => {
      mockSession = sessionUserA;
      const userAPartners = [
        createMockPartner(userA.id, { id: 'partner-1', name: 'Partner 1' }),
        createMockPartner(userA.id, { id: 'partner-2', name: 'Partner 2' }),
      ];

      mockPrisma.partner.findMany.mockResolvedValue(userAPartners as any);

      await getPartners({});

      expect(mockPrisma.partner.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: userA.id,
          }),
        })
      );
    });

    it('should return all partners for admin user', async () => {
      mockSession = sessionAdmin;
      const allPartners = [
        createMockPartner(userA.id, { id: 'partner-1' }),
        createMockPartner(userB.id, { id: 'partner-2' }),
      ];

      mockPrisma.partner.findMany.mockResolvedValue(allPartners as any);

      await getPartners({});

      // Admin should not have ownerId filter
      const call = mockPrisma.partner.findMany.mock.calls[0][0];
      expect(call?.where?.ownerId).toBeUndefined();
    });

    it('should filter by search term', async () => {
      mockSession = sessionUserA;
      mockPrisma.partner.findMany.mockResolvedValue([]);

      await getPartners({ search: 'Technology' });

      expect(mockPrisma.partner.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ name: { contains: 'Technology' } }),
              expect.objectContaining({ partnerType: { contains: 'Technology' } }),
              expect.objectContaining({ expertise: { contains: 'Technology' } }),
            ]),
          }),
        })
      );
    });

    it('should throw "Não autorizado" without session', async () => {
      mockSession = null;

      await expect(getPartners({})).rejects.toThrow('Não autorizado');
    });

    // Triangulation: User B sees only their partners
    it('should filter by User B ownerId when User B queries', async () => {
      mockSession = sessionUserB;
      mockPrisma.partner.findMany.mockResolvedValue([]);

      await getPartners({});

      expect(mockPrisma.partner.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: userB.id,
          }),
        })
      );
    });
  });

  // ===========================================
  // getPartnerById Tests
  // ===========================================
  describe('getPartnerById', () => {
    it('should return partner owned by current user', async () => {
      mockSession = sessionUserA;
      const partner = createMockPartner(userA.id, { id: 'partner-1', name: 'My Partner' });
      mockPrisma.partner.findFirst.mockResolvedValue(partner as any);

      const result = await getPartnerById('partner-1');

      expect(result?.id).toBe('partner-1');
      expect(result?.name).toBe('My Partner');
      expect(mockPrisma.partner.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'partner-1',
            ownerId: userA.id,
          }),
        })
      );
    });

    it('should return null when accessing partner owned by another user', async () => {
      mockSession = sessionUserA;
      // findFirst with ownerFilter returns null for records not owned by user
      mockPrisma.partner.findFirst.mockResolvedValue(null);

      const result = await getPartnerById('partner-2');

      expect(result).toBeNull();
    });

    it('should return null for non-existent partner', async () => {
      mockSession = sessionUserA;
      mockPrisma.partner.findFirst.mockResolvedValue(null);

      const result = await getPartnerById('non-existent');

      expect(result).toBeNull();
    });

    it('should allow admin to access any partner (no ownerId filter)', async () => {
      mockSession = sessionAdmin;
      const userAPartner = createMockPartner(userA.id, { id: 'partner-1', name: 'User A Partner' });
      mockPrisma.partner.findFirst.mockResolvedValue(userAPartner as any);

      const result = await getPartnerById('partner-1');

      expect(result?.id).toBe('partner-1');
      // Admin should not have ownerId filter
      const call = mockPrisma.partner.findFirst.mock.calls[0][0];
      expect(call?.where?.ownerId).toBeUndefined();
    });

    it('should throw "Não autorizado" without session', async () => {
      mockSession = null;

      await expect(getPartnerById('partner-1')).rejects.toThrow('Não autorizado');
    });

    // Triangulation: User B can access their own partner
    it('should allow User B to access their own partner', async () => {
      mockSession = sessionUserB;
      const userBPartner = createMockPartner(userB.id, { id: 'partner-b', name: 'User B Partner' });
      mockPrisma.partner.findFirst.mockResolvedValue(userBPartner as any);

      const result = await getPartnerById('partner-b');

      expect(result?.id).toBe('partner-b');
    });

    // Triangulation: User B cannot access User A's partner - returns null
    it('should return null when User B tries to access User A partner', async () => {
      mockSession = sessionUserB;
      // findFirst with ownerFilter returns null for records not owned by user
      mockPrisma.partner.findFirst.mockResolvedValue(null);

      const result = await getPartnerById('partner-a');

      expect(result).toBeNull();
    });
  });

});
