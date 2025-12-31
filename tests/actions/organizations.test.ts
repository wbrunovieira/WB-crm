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
  adminUser,
  sessionUserA,
  sessionUserB,
  sessionAdmin,
  createMockOrganization,
} from '../fixtures/multiple-users';

// Import Server Actions
import {
  getOrganizations,
  getOrganizationById,
  createOrganization,
  updateOrganization,
  deleteOrganization,
} from '@/actions/organizations';

const mockedGetServerSession = vi.mocked(getServerSession);

// ============ CREATE ORGANIZATION TESTS ============

describe('Organizations - createOrganization', () => {
  describe('successful creation', () => {
    beforeEach(() => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);
    });

    it('should create organization with valid data', async () => {
      const orgData = {
        name: 'Tech Company Inc',
        city: 'São Paulo',
        state: 'SP',
        country: 'Brasil',
      };

      const createdOrg = {
        ...createMockOrganization(userA.id),
        id: 'new-org-id',
        name: 'Tech Company Inc',
        city: 'São Paulo',
        state: 'SP',
        country: 'Brasil',
      };

      prismaMock.organization.create.mockResolvedValue(createdOrg);

      const result = await createOrganization(orgData);

      expect(prismaMock.organization.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Tech Company Inc',
          ownerId: userA.id,
        }),
      });
      expect(result.name).toBe('Tech Company Inc');
    });

    it('should set ownerId to current user id', async () => {
      const orgData = { name: 'Test Organization' };

      prismaMock.organization.create.mockResolvedValue(
        createMockOrganization(userA.id, { name: 'Test Organization' })
      );

      await createOrganization(orgData);

      expect(prismaMock.organization.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ownerId: userA.id,
        }),
      });
    });

    it('should create organization with all optional fields', async () => {
      const orgData = {
        name: 'Full Company',
        legalName: 'Full Company LTDA',
        email: 'contact@fullcompany.com',
        phone: '+55 11 99999-9999',
        website: 'https://fullcompany.com',
        industry: 'Technology',
        employeeCount: 100,
        annualRevenue: 1000000,
        taxId: '12.345.678/0001-00',
        description: 'A full company description',
      };

      const createdOrg = {
        ...createMockOrganization(userA.id),
        ...orgData,
      };

      prismaMock.organization.create.mockResolvedValue(createdOrg);

      const result = await createOrganization(orgData);

      expect(result.email).toBe('contact@fullcompany.com');
      expect(result.employeeCount).toBe(100);
    });

    it('should create organization with social media links', async () => {
      const orgData = {
        name: 'Social Company',
        instagram: '@socialcompany',
        linkedin: 'linkedin.com/company/socialcompany',
        facebook: 'facebook.com/socialcompany',
        twitter: '@socialcompany',
        tiktok: '@socialcompany',
      };

      const createdOrg = {
        ...createMockOrganization(userA.id),
        ...orgData,
      };

      prismaMock.organization.create.mockResolvedValue(createdOrg);

      const result = await createOrganization(orgData);

      expect(result.instagram).toBe('@socialcompany');
      expect(result.linkedin).toBe('linkedin.com/company/socialcompany');
    });
  });

  describe('validation', () => {
    beforeEach(() => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);
    });

    it('should reject organization with name too short', async () => {
      const orgData = { name: 'A' }; // Min 2 characters

      await expect(createOrganization(orgData)).rejects.toThrow();
    });

    it('should reject organization with invalid email format', async () => {
      const orgData = {
        name: 'Valid Name',
        email: 'invalid-email',
      };

      await expect(createOrganization(orgData)).rejects.toThrow();
    });

    it('should accept empty string for optional email', async () => {
      const orgData = { name: 'Test Org', email: '' };

      prismaMock.organization.create.mockResolvedValue(
        createMockOrganization(userA.id, { name: 'Test Org' })
      );

      await expect(createOrganization(orgData)).resolves.toBeDefined();
    });

    it('should reject negative employee count', async () => {
      const orgData = {
        name: 'Valid Name',
        employeeCount: -10,
      };

      await expect(createOrganization(orgData)).rejects.toThrow();
    });

    it('should reject negative annual revenue', async () => {
      const orgData = {
        name: 'Valid Name',
        annualRevenue: -1000,
      };

      await expect(createOrganization(orgData)).rejects.toThrow();
    });
  });

  describe('authentication', () => {
    it('should throw error when not authenticated', async () => {
      mockedGetServerSession.mockResolvedValue(null);

      await expect(
        createOrganization({ name: 'Test Org' })
      ).rejects.toThrow('Não autorizado');
    });

    it('should throw error when session has no user id', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
        expires: '2025-12-31',
      } as never);

      await expect(
        createOrganization({ name: 'Test Org' })
      ).rejects.toThrow('Não autorizado');
    });
  });
});

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

// ============ UPDATE ORGANIZATION TESTS ============

describe('Organizations - updateOrganization', () => {
  describe('successful update', () => {
    beforeEach(() => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);
    });

    it('should update own organization with valid data', async () => {
      const existingOrg = createMockOrganization(userA.id, { id: 'org-a' });
      const updatedData = {
        name: 'Updated Company Name',
        website: 'https://updated.com',
      };

      prismaMock.organization.findUnique.mockResolvedValue(existingOrg);
      prismaMock.organization.update.mockResolvedValue({
        ...existingOrg,
        ...updatedData,
      });

      const result = await updateOrganization('org-a', updatedData);

      expect(prismaMock.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-a' },
        data: expect.objectContaining({
          name: 'Updated Company Name',
          website: 'https://updated.com',
        }),
      });
      expect(result.name).toBe('Updated Company Name');
    });

    it('should update organization industry and employee count', async () => {
      const existingOrg = createMockOrganization(userA.id, { id: 'org-a' });
      const updatedData = {
        name: 'Tech Company',
        industry: 'Technology',
        employeeCount: 500,
      };

      prismaMock.organization.findUnique.mockResolvedValue(existingOrg);
      prismaMock.organization.update.mockResolvedValue({
        ...existingOrg,
        ...updatedData,
      });

      const result = await updateOrganization('org-a', updatedData);

      expect(result.industry).toBe('Technology');
      expect(result.employeeCount).toBe(500);
    });
  });

  describe('ownership verification', () => {
    it('should throw error when trying to update other user organization', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      // Organization belongs to User B
      const orgB = createMockOrganization(userB.id, { id: 'org-b' });
      prismaMock.organization.findUnique.mockResolvedValue(orgB);

      await expect(
        updateOrganization('org-b', { name: 'Hacked Name' })
      ).rejects.toThrow('Organização não encontrada');
    });

    it('should throw error when organization does not exist', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      prismaMock.organization.findUnique.mockResolvedValue(null);

      await expect(
        updateOrganization('non-existent', { name: 'Test' })
      ).rejects.toThrow('Organização não encontrada');
    });

    it('should allow admin to update any organization', async () => {
      mockedGetServerSession.mockResolvedValue(sessionAdmin);

      const orgA = createMockOrganization(userA.id, { id: 'org-a' });
      prismaMock.organization.findUnique.mockResolvedValue(orgA);
      prismaMock.organization.update.mockResolvedValue({
        ...orgA,
        name: 'Admin Updated',
      });

      const result = await updateOrganization('org-a', { name: 'Admin Updated' });

      expect(result.name).toBe('Admin Updated');
    });
  });

  describe('validation', () => {
    beforeEach(() => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);
      prismaMock.organization.findUnique.mockResolvedValue(
        createMockOrganization(userA.id, { id: 'org-a' })
      );
    });

    it('should reject update with name too short', async () => {
      await expect(
        updateOrganization('org-a', { name: 'A' })
      ).rejects.toThrow();
    });

    it('should reject update with invalid email', async () => {
      await expect(
        updateOrganization('org-a', { name: 'Valid', email: 'invalid' })
      ).rejects.toThrow();
    });
  });

  describe('authentication', () => {
    it('should throw error when not authenticated', async () => {
      mockedGetServerSession.mockResolvedValue(null);

      await expect(
        updateOrganization('org-a', { name: 'Test' })
      ).rejects.toThrow('Não autorizado');
    });
  });
});

// ============ DELETE ORGANIZATION TESTS ============

describe('Organizations - deleteOrganization', () => {
  describe('successful deletion', () => {
    it('should delete own organization', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const orgA = createMockOrganization(userA.id, { id: 'org-a' });
      prismaMock.organization.findUnique.mockResolvedValue(orgA);
      prismaMock.organization.delete.mockResolvedValue(orgA);

      await deleteOrganization('org-a');

      expect(prismaMock.organization.delete).toHaveBeenCalledWith({
        where: { id: 'org-a' },
      });
    });
  });

  describe('ownership verification', () => {
    it('should throw error when trying to delete other user organization', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const orgB = createMockOrganization(userB.id, { id: 'org-b' });
      prismaMock.organization.findUnique.mockResolvedValue(orgB);

      await expect(deleteOrganization('org-b')).rejects.toThrow(
        'Organização não encontrada'
      );
      expect(prismaMock.organization.delete).not.toHaveBeenCalled();
    });

    it('should throw error when organization does not exist', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      prismaMock.organization.findUnique.mockResolvedValue(null);

      await expect(deleteOrganization('non-existent')).rejects.toThrow(
        'Organização não encontrada'
      );
    });

    it('should allow admin to delete any organization', async () => {
      mockedGetServerSession.mockResolvedValue(sessionAdmin);

      const orgA = createMockOrganization(userA.id, { id: 'org-a' });
      prismaMock.organization.findUnique.mockResolvedValue(orgA);
      prismaMock.organization.delete.mockResolvedValue(orgA);

      await deleteOrganization('org-a');

      expect(prismaMock.organization.delete).toHaveBeenCalledWith({
        where: { id: 'org-a' },
      });
    });
  });

  describe('authentication', () => {
    it('should throw error when not authenticated', async () => {
      mockedGetServerSession.mockResolvedValue(null);

      await expect(deleteOrganization('org-a')).rejects.toThrow('Não autorizado');
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

    it('User A cannot update User B organization', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);
      prismaMock.organization.findUnique.mockResolvedValue(
        createMockOrganization(userB.id, { id: 'org-b' })
      );

      await expect(
        updateOrganization('org-b', { name: 'Hacked' })
      ).rejects.toThrow('Organização não encontrada');
    });

    it('User B cannot update User A organization', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserB);
      prismaMock.organization.findUnique.mockResolvedValue(
        createMockOrganization(userA.id, { id: 'org-a' })
      );

      await expect(
        updateOrganization('org-a', { name: 'Hacked' })
      ).rejects.toThrow('Organização não encontrada');
    });

    it('User A cannot delete User B organization', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);
      prismaMock.organization.findUnique.mockResolvedValue(
        createMockOrganization(userB.id, { id: 'org-b' })
      );

      await expect(deleteOrganization('org-b')).rejects.toThrow(
        'Organização não encontrada'
      );
    });

    it('User B cannot delete User A organization', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserB);
      prismaMock.organization.findUnique.mockResolvedValue(
        createMockOrganization(userA.id, { id: 'org-a' })
      );

      await expect(deleteOrganization('org-a')).rejects.toThrow(
        'Organização não encontrada'
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

  describe('valid edge values', () => {
    beforeEach(() => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);
    });

    it('should accept name with exactly 2 characters (minimum)', async () => {
      const orgData = { name: 'AB' };
      prismaMock.organization.create.mockResolvedValue(
        createMockOrganization(userA.id, { name: 'AB' })
      );

      const result = await createOrganization(orgData);

      expect(result.name).toBe('AB');
    });

    it('should accept employee count of 1 (minimum positive)', async () => {
      const orgData = { name: 'Solo Company', employeeCount: 1 };
      prismaMock.organization.create.mockResolvedValue({
        ...createMockOrganization(userA.id),
        employeeCount: 1,
      });

      await expect(createOrganization(orgData)).resolves.toBeDefined();
    });

    it('should accept annual revenue of 0.01 (minimum positive)', async () => {
      const orgData = { name: 'New Startup', annualRevenue: 0.01 };
      prismaMock.organization.create.mockResolvedValue({
        ...createMockOrganization(userA.id),
        annualRevenue: 0.01,
      });

      await expect(createOrganization(orgData)).resolves.toBeDefined();
    });

    it('should accept all optional fields as undefined', async () => {
      const orgData = { name: 'Minimal Org' };
      prismaMock.organization.create.mockResolvedValue(
        createMockOrganization(userA.id, { name: 'Minimal Org' })
      );

      await expect(createOrganization(orgData)).resolves.toBeDefined();
    });
  });

  describe('special characters and unicode', () => {
    beforeEach(() => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);
    });

    it('should accept organization name with special characters', async () => {
      const orgData = { name: 'Café & Companhia LTDA' };
      prismaMock.organization.create.mockResolvedValue(
        createMockOrganization(userA.id, { name: 'Café & Companhia LTDA' })
      );

      const result = await createOrganization(orgData);

      expect(result.name).toBe('Café & Companhia LTDA');
    });

    it('should accept organization name with accents', async () => {
      const orgData = { name: 'Açúcar União' };
      prismaMock.organization.create.mockResolvedValue(
        createMockOrganization(userA.id, { name: 'Açúcar União' })
      );

      const result = await createOrganization(orgData);

      expect(result.name).toBe('Açúcar União');
    });
  });
});
