/**
 * Authorization Tests (Role-Based Access Control)
 *
 * Tests that roles have appropriate access:
 * - Admin can see all data and access admin area
 * - SDR can only see own data
 * - Closer can only see own data
 * - OwnerFilter only appears for admin
 *
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { prismaMock } from '../setup';
import {
  userA,
  userB,
  userC,
  adminUser,
  sessionUserA,
  sessionUserB,
  sessionUserC,
  sessionAdmin,
  createMockDeal,
} from '../fixtures/multiple-users';

// Import permission functions
import {
  getOwnerFilter,
  canAccessRecord,
  isAdmin,
  getUserRole,
} from '@/lib/permissions';

// Import actions
import { getDeals } from '@/actions/deals';
import { getUsers } from '@/actions/users';

const mockedGetServerSession = vi.mocked(getServerSession);

describe('Authorization - Role Detection', () => {
  describe('isAdmin function', () => {
    it('should return true for admin user', async () => {
      mockedGetServerSession.mockResolvedValue(sessionAdmin);

      const result = await isAdmin();

      expect(result).toBe(true);
    });

    it('should return false for SDR user', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const result = await isAdmin();

      expect(result).toBe(false);
    });

    it('should return false for Closer user', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserC);

      const result = await isAdmin();

      expect(result).toBe(false);
    });
  });

  describe('getUserRole function', () => {
    it('should return "admin" for admin user', async () => {
      mockedGetServerSession.mockResolvedValue(sessionAdmin);

      const role = await getUserRole();

      expect(role).toBe('admin');
    });

    it('should return "sdr" for SDR user', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const role = await getUserRole();

      expect(role).toBe('sdr');
    });

    it('should return "closer" for Closer user', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserC);

      const role = await getUserRole();

      expect(role).toBe('closer');
    });
  });
});

describe('Authorization - Owner Filter', () => {
  describe('getOwnerFilter for non-admin users', () => {
    it('should always filter by ownerId for SDR', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const filter = await getOwnerFilter();

      expect(filter).toEqual({ ownerId: userA.id });
    });

    it('should always filter by ownerId for Closer', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserC);

      const filter = await getOwnerFilter();

      expect(filter).toEqual({ ownerId: userC.id });
    });

    it('should ignore owner parameter for SDR (always own data)', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      // Even if trying to filter by another user, SDR should only see own data
      const filter = await getOwnerFilter(userB.id);

      expect(filter).toEqual({ ownerId: userA.id });
    });

    it('should ignore "all" parameter for SDR (always own data)', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const filter = await getOwnerFilter('all');

      expect(filter).toEqual({ ownerId: userA.id });
    });
  });

  describe('getOwnerFilter for admin users', () => {
    it('should return empty filter when no owner specified (sees all)', async () => {
      mockedGetServerSession.mockResolvedValue(sessionAdmin);

      const filter = await getOwnerFilter();

      expect(filter).toEqual({});
    });

    it('should return empty filter when "all" is specified', async () => {
      mockedGetServerSession.mockResolvedValue(sessionAdmin);

      const filter = await getOwnerFilter('all');

      expect(filter).toEqual({});
    });

    it('should filter by admin ownerId when "mine" is specified', async () => {
      mockedGetServerSession.mockResolvedValue(sessionAdmin);

      const filter = await getOwnerFilter('mine');

      expect(filter).toEqual({ ownerId: adminUser.id });
    });

    it('should filter by specific user when userId is specified', async () => {
      mockedGetServerSession.mockResolvedValue(sessionAdmin);

      const filter = await getOwnerFilter(userA.id);

      expect(filter).toEqual({ ownerId: userA.id });
    });

    it('should allow admin to filter by different users', async () => {
      mockedGetServerSession.mockResolvedValue(sessionAdmin);

      const filterA = await getOwnerFilter(userA.id);
      expect(filterA).toEqual({ ownerId: userA.id });

      const filterB = await getOwnerFilter(userB.id);
      expect(filterB).toEqual({ ownerId: userB.id });

      const filterC = await getOwnerFilter(userC.id);
      expect(filterC).toEqual({ ownerId: userC.id });
    });
  });
});

describe('Authorization - Record Access', () => {
  describe('canAccessRecord for admin', () => {
    beforeEach(() => {
      mockedGetServerSession.mockResolvedValue(sessionAdmin);
    });

    it('should allow admin to access any record', async () => {
      const canAccessA = await canAccessRecord(userA.id);
      const canAccessB = await canAccessRecord(userB.id);
      const canAccessC = await canAccessRecord(userC.id);
      const canAccessOwn = await canAccessRecord(adminUser.id);

      expect(canAccessA).toBe(true);
      expect(canAccessB).toBe(true);
      expect(canAccessC).toBe(true);
      expect(canAccessOwn).toBe(true);
    });
  });

  describe('canAccessRecord for SDR', () => {
    beforeEach(() => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);
    });

    it('should allow SDR to access own records', async () => {
      const canAccess = await canAccessRecord(userA.id);

      expect(canAccess).toBe(true);
    });

    it('should deny SDR access to other users records', async () => {
      const canAccessB = await canAccessRecord(userB.id);
      const canAccessC = await canAccessRecord(userC.id);
      const canAccessAdmin = await canAccessRecord(adminUser.id);

      expect(canAccessB).toBe(false);
      expect(canAccessC).toBe(false);
      expect(canAccessAdmin).toBe(false);
    });
  });

  describe('canAccessRecord for Closer', () => {
    beforeEach(() => {
      mockedGetServerSession.mockResolvedValue(sessionUserC);
    });

    it('should allow Closer to access own records', async () => {
      const canAccess = await canAccessRecord(userC.id);

      expect(canAccess).toBe(true);
    });

    it('should deny Closer access to other users records', async () => {
      const canAccessA = await canAccessRecord(userA.id);
      const canAccessB = await canAccessRecord(userB.id);
      const canAccessAdmin = await canAccessRecord(adminUser.id);

      expect(canAccessA).toBe(false);
      expect(canAccessB).toBe(false);
      expect(canAccessAdmin).toBe(false);
    });
  });
});

describe('Authorization - Data Visibility by Role', () => {
  describe('getDeals - Admin sees all', () => {
    it('should allow admin to see all deals without filter', async () => {
      mockedGetServerSession.mockResolvedValue(sessionAdmin);

      const dealA = createMockDeal(userA.id, { id: 'deal-a' });
      const dealB = createMockDeal(userB.id, { id: 'deal-b' });
      const dealC = createMockDeal(userC.id, { id: 'deal-c' });

      prismaMock.deal.findMany.mockResolvedValue([dealA, dealB, dealC]);

      const deals = await getDeals();

      // Admin should see all 3 deals
      expect(prismaMock.deal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            ownerId: expect.any(String),
          }),
        })
      );
      expect(deals).toHaveLength(3);
    });

    it('should allow admin to filter by specific owner', async () => {
      mockedGetServerSession.mockResolvedValue(sessionAdmin);

      const dealA = createMockDeal(userA.id, { id: 'deal-a' });

      prismaMock.deal.findMany.mockResolvedValue([dealA]);

      const deals = await getDeals({ owner: userA.id });

      expect(prismaMock.deal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: userA.id,
          }),
        })
      );
      expect(deals).toHaveLength(1);
    });
  });

  describe('getDeals - SDR sees only own', () => {
    it('should only show SDR their own deals', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const dealA = createMockDeal(userA.id, { id: 'deal-a' });

      prismaMock.deal.findMany.mockResolvedValue([dealA]);

      const deals = await getDeals();

      expect(prismaMock.deal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: userA.id,
          }),
        })
      );
      expect(deals).toHaveLength(1);
    });

    it('should ignore owner filter for SDR (still only own data)', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      prismaMock.deal.findMany.mockResolvedValue([]);

      // SDR trying to see User B's deals
      await getDeals({ owner: userB.id });

      // Should still filter by User A's id
      expect(prismaMock.deal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: userA.id,
          }),
        })
      );
    });
  });

  describe('getDeals - Closer sees only own', () => {
    it('should only show Closer their own deals', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserC);

      const dealC = createMockDeal(userC.id, { id: 'deal-c' });

      prismaMock.deal.findMany.mockResolvedValue([dealC]);

      const deals = await getDeals();

      expect(prismaMock.deal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: userC.id,
          }),
        })
      );
      expect(deals).toHaveLength(1);
    });
  });
});

describe('Authorization - Admin-Only Functions', () => {
  describe('getUsers', () => {
    it('should allow admin to get list of users', async () => {
      mockedGetServerSession.mockResolvedValue(sessionAdmin);

      const users = [
        { id: userA.id, name: userA.name, email: userA.email },
        { id: userB.id, name: userB.name, email: userB.email },
      ];

      prismaMock.user.findMany.mockResolvedValue(users as never);

      const result = await getUsers();

      expect(prismaMock.user.findMany).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it('should return only self for non-admin users', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const result = await getUsers();

      // Non-admin should get only themselves
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(userA.id);
      expect(prismaMock.user.findMany).not.toHaveBeenCalled();
    });

    it('should return only self for closer users', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserC);

      const result = await getUsers();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(userC.id);
      expect(prismaMock.user.findMany).not.toHaveBeenCalled();
    });
  });
});

describe('Authorization - Role Values', () => {
  it('should have correct role values defined', () => {
    expect(userA.role).toBe('sdr');
    expect(userB.role).toBe('sdr');
    expect(userC.role).toBe('closer');
    expect(adminUser.role).toBe('admin');
  });

  it('should have only valid roles in the system', () => {
    const validRoles = ['admin', 'sdr', 'closer'];

    expect(validRoles).toContain(userA.role);
    expect(validRoles).toContain(userB.role);
    expect(validRoles).toContain(userC.role);
    expect(validRoles).toContain(adminUser.role);
  });
});
