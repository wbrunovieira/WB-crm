/**
 * Organizations Action Tests
 *
 * Tests for src/actions/organizations.ts including:
 * - CRUD operations for organizations
 * - Ownership verification
 * - Validation
 * - Search filtering
 *
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { prismaMock } from '../setup';
import {
  userA,
  userB,
  sessionUserA,
  sessionUserB,
  sessionAdmin,
  createMockOrganization,
} from '../fixtures/multiple-users';

// Import Server Actions
import {
  getOrganizations,
  getOrganizationById,
} from '@/actions/organizations';

const mockedGetServerSession = vi.mocked(getServerSession);

// ============ GET ORGANIZATIONS TESTS ============

describe('Organizations - getOrganizations', () => {
  describe('owner filtering', () => {
    it('should return only own organizations for SDR user', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const orgA = createMockOrganization(userA.id, { id: 'org-a' });
      prismaMock.organization.findMany.mockResolvedValue([orgA]);

      const orgs = await getOrganizations();

      expect(prismaMock.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: userA.id,
          }),
        })
      );
      expect(orgs).toHaveLength(1);
    });

    it('should return only own organizations even when trying to filter by other user', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      prismaMock.organization.findMany.mockResolvedValue([]);

      // User A trying to see User B's organizations
      await getOrganizations({ owner: userB.id });

      // Should still filter by User A's id (SDR can only see own data)
      expect(prismaMock.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: userA.id,
          }),
        })
      );
    });

    it('should allow admin to see all organizations', async () => {
      mockedGetServerSession.mockResolvedValue(sessionAdmin);

      const orgA = createMockOrganization(userA.id, { id: 'org-a' });
      const orgB = createMockOrganization(userB.id, { id: 'org-b' });

      prismaMock.organization.findMany.mockResolvedValue([orgA, orgB]);

      const orgs = await getOrganizations();

      // Admin should not have ownerId filter
      expect(prismaMock.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            ownerId: expect.any(String),
          }),
        })
      );
      expect(orgs).toHaveLength(2);
    });

    it('should allow admin to filter by specific owner', async () => {
      mockedGetServerSession.mockResolvedValue(sessionAdmin);

      const orgA = createMockOrganization(userA.id, { id: 'org-a' });
      prismaMock.organization.findMany.mockResolvedValue([orgA]);

      await getOrganizations({ owner: userA.id });

      expect(prismaMock.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: userA.id,
          }),
        })
      );
    });
  });

  describe('search filtering', () => {
    beforeEach(() => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);
    });

    it('should filter by search term across name and website', async () => {
      prismaMock.organization.findMany.mockResolvedValue([]);

      await getOrganizations({ search: 'tech' });

      expect(prismaMock.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { name: { contains: 'tech' } },
              { website: { contains: 'tech' } },
            ]),
          }),
        })
      );
    });
  });

  describe('authentication', () => {
    it('should throw error when not authenticated', async () => {
      mockedGetServerSession.mockResolvedValue(null);

      await expect(getOrganizations()).rejects.toThrow('Não autorizado');
    });
  });
});

// ============ GET ORGANIZATION BY ID TESTS ============

describe('Organizations - getOrganizationById', () => {
  describe('ownership verification', () => {
    it('should return own organization', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const orgA = {
        ...createMockOrganization(userA.id, { id: 'org-a' }),
        contacts: [],
        deals: [],
        primaryCNAE: null,
      };

      prismaMock.organization.findFirst.mockResolvedValue(orgA);
      prismaMock.activity.findMany.mockResolvedValue([]);

      const result = await getOrganizationById('org-a');

      expect(prismaMock.organization.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'org-a',
            ownerId: userA.id,
          }),
        })
      );
      expect(result?.id).toBe('org-a');
    });

    it('should block access to other user organization (returns null)', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      // Organization belongs to User B, but User A is logged in
      prismaMock.organization.findFirst.mockResolvedValue(null);

      const result = await getOrganizationById('org-b-id');

      expect(result).toBeNull();
    });

    it('should allow admin to access any organization', async () => {
      mockedGetServerSession.mockResolvedValue(sessionAdmin);

      const orgA = {
        ...createMockOrganization(userA.id, { id: 'org-a' }),
        contacts: [],
        deals: [],
        primaryCNAE: null,
      };

      prismaMock.organization.findFirst.mockResolvedValue(orgA);
      prismaMock.activity.findMany.mockResolvedValue([]);

      const result = await getOrganizationById('org-a');

      // Admin should not have ownerId filter
      expect(prismaMock.organization.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            ownerId: expect.any(String),
          }),
        })
      );
      expect(result?.id).toBe('org-a');
    });
  });

  describe('return value', () => {
    beforeEach(() => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);
    });

    it('should return null for non-existent organization', async () => {
      prismaMock.organization.findFirst.mockResolvedValue(null);

      const result = await getOrganizationById('non-existent-id');

      expect(result).toBeNull();
    });

    it('should include related data in response', async () => {
      const orgWithRelations = {
        ...createMockOrganization(userA.id, { id: 'org-a' }),
        contacts: [{ id: 'contact-1', name: 'John' }],
        deals: [{ id: 'deal-1', title: 'Big Deal' }],
        primaryCNAE: null,
      };

      prismaMock.organization.findFirst.mockResolvedValue(orgWithRelations);
      prismaMock.activity.findMany.mockResolvedValue([]);

      const result = await getOrganizationById('org-a');

      expect(result).toHaveProperty('contacts');
      expect(result).toHaveProperty('deals');
      expect(result).toHaveProperty('activities');
    });
  });

  describe('authentication', () => {
    it('should throw error when not authenticated', async () => {
      mockedGetServerSession.mockResolvedValue(null);

      await expect(getOrganizationById('org-a')).rejects.toThrow('Não autorizado');
    });
  });
});

// ============ EDGE CASES AND TRIANGULATION ============

describe('Organizations - Edge Cases', () => {
  describe('triangulation - multiple users cannot access each other data', () => {
    it('User A cannot see User B organizations', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);
      prismaMock.organization.findMany.mockResolvedValue([]);

      await getOrganizations();

      expect(prismaMock.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: userA.id,
          }),
        })
      );
    });

    it('User B cannot see User A organizations', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserB);
      prismaMock.organization.findMany.mockResolvedValue([]);

      await getOrganizations();

      expect(prismaMock.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: userB.id,
          }),
        })
      );
    });
  });

  describe('empty states', () => {
    it('should return empty array when user has no organizations', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);
      prismaMock.organization.findMany.mockResolvedValue([]);

      const orgs = await getOrganizations();

      expect(orgs).toEqual([]);
    });
  });

});
