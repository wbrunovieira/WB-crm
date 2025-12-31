/**
 * Contacts Action Tests
 *
 * Tests for src/actions/contacts.ts including:
 * - CRUD operations for contacts
 * - Ownership verification
 * - Validation
 * - Company linking (organization, lead, partner)
 * - Filtering
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
  createMockContact,
} from '../fixtures/multiple-users';

// Import Server Actions
import {
  getContacts,
  getContactById,
  createContact,
  updateContact,
  deleteContact,
} from '@/actions/contacts';

const mockedGetServerSession = vi.mocked(getServerSession);

// ============ CREATE CONTACT TESTS ============

describe('Contacts - createContact', () => {
  describe('successful creation', () => {
    beforeEach(() => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);
    });

    it('should create contact with valid data', async () => {
      const contactData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+55 11 99999-9999',
      };

      const createdContact = {
        ...createMockContact(userA.id),
        id: 'new-contact-id',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+55 11 99999-9999',
      };

      prismaMock.contact.create.mockResolvedValue(createdContact);

      const result = await createContact(contactData);

      expect(prismaMock.contact.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'John Doe',
          email: 'john@example.com',
          ownerId: userA.id,
        }),
      });
      expect(result.name).toBe('John Doe');
    });

    it('should set ownerId to current user id', async () => {
      const contactData = { name: 'Test Contact' };

      prismaMock.contact.create.mockResolvedValue(
        createMockContact(userA.id, { name: 'Test Contact' })
      );

      await createContact(contactData);

      expect(prismaMock.contact.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ownerId: userA.id,
        }),
      });
    });

    it('should create contact linked to organization', async () => {
      const contactData = {
        name: 'Org Contact',
        companyType: 'organization' as const,
        companyId: 'org-123',
      };

      const createdContact = {
        ...createMockContact(userA.id),
        name: 'Org Contact',
        organizationId: 'org-123',
      };

      prismaMock.contact.create.mockResolvedValue(createdContact);

      const result = await createContact(contactData);

      expect(prismaMock.contact.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: 'org-123',
          leadId: null,
          partnerId: null,
        }),
      });
      expect(result.organizationId).toBe('org-123');
    });

    it('should create contact linked to lead', async () => {
      const contactData = {
        name: 'Lead Contact',
        companyType: 'lead' as const,
        companyId: 'lead-123',
      };

      const createdContact = {
        ...createMockContact(userA.id),
        name: 'Lead Contact',
        leadId: 'lead-123',
      };

      prismaMock.contact.create.mockResolvedValue(createdContact);

      const result = await createContact(contactData);

      expect(prismaMock.contact.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          leadId: 'lead-123',
          organizationId: null,
          partnerId: null,
        }),
      });
      expect(result.leadId).toBe('lead-123');
    });

    it('should create contact linked to partner', async () => {
      const contactData = {
        name: 'Partner Contact',
        companyType: 'partner' as const,
        companyId: 'partner-123',
      };

      const createdContact = {
        ...createMockContact(userA.id),
        name: 'Partner Contact',
        partnerId: 'partner-123',
      };

      prismaMock.contact.create.mockResolvedValue(createdContact);

      const result = await createContact(contactData);

      expect(prismaMock.contact.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          partnerId: 'partner-123',
          organizationId: null,
          leadId: null,
        }),
      });
      expect(result.partnerId).toBe('partner-123');
    });

    it('should create contact with all optional fields', async () => {
      const contactData = {
        name: 'Full Contact',
        email: 'full@example.com',
        phone: '+55 11 99999-9999',
        whatsapp: '+55 11 99999-9999',
        role: 'CEO',
        department: 'Executive',
        linkedin: 'linkedin.com/in/fullcontact',
        status: 'active' as const,
        isPrimary: true,
        notes: 'Important contact',
        preferredLanguage: 'en-US',
        source: 'website',
      };

      const createdContact = {
        ...createMockContact(userA.id),
        ...contactData,
      };

      prismaMock.contact.create.mockResolvedValue(createdContact);

      const result = await createContact(contactData);

      expect(result.role).toBe('CEO');
      expect(result.isPrimary).toBe(true);
    });
  });

  describe('validation', () => {
    beforeEach(() => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);
    });

    it('should reject contact with name too short', async () => {
      const contactData = { name: 'A' }; // Min 2 characters

      await expect(createContact(contactData)).rejects.toThrow();
    });

    it('should reject contact with invalid email format', async () => {
      const contactData = {
        name: 'Valid Name',
        email: 'invalid-email',
      };

      await expect(createContact(contactData)).rejects.toThrow();
    });

    it('should accept empty string for optional email', async () => {
      const contactData = { name: 'Test Contact', email: '' };

      prismaMock.contact.create.mockResolvedValue(
        createMockContact(userA.id, { name: 'Test Contact' })
      );

      await expect(createContact(contactData)).resolves.toBeDefined();
    });

    it('should reject invalid status', async () => {
      const contactData = {
        name: 'Valid Name',
        status: 'invalid_status' as unknown as 'active',
      };

      await expect(createContact(contactData)).rejects.toThrow();
    });

    it('should reject invalid companyType', async () => {
      const contactData = {
        name: 'Valid Name',
        companyType: 'invalid' as unknown as 'organization',
      };

      await expect(createContact(contactData)).rejects.toThrow();
    });
  });

  describe('authentication', () => {
    it('should throw error when not authenticated', async () => {
      mockedGetServerSession.mockResolvedValue(null);

      await expect(
        createContact({ name: 'Test Contact' })
      ).rejects.toThrow('Não autorizado');
    });

    it('should throw error when session has no user id', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
        expires: '2025-12-31',
      } as never);

      await expect(
        createContact({ name: 'Test Contact' })
      ).rejects.toThrow('Não autorizado');
    });
  });
});

// ============ GET CONTACTS TESTS ============

describe('Contacts - getContacts', () => {
  describe('owner filtering', () => {
    it('should return only own contacts for SDR user', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const contactA = createMockContact(userA.id, { id: 'contact-a' });
      prismaMock.contact.findMany.mockResolvedValue([contactA]);

      const contacts = await getContacts();

      expect(prismaMock.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: userA.id,
          }),
        })
      );
      expect(contacts).toHaveLength(1);
    });

    it('should return only own contacts even when trying to filter by other user', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      prismaMock.contact.findMany.mockResolvedValue([]);

      // User A trying to see User B's contacts
      await getContacts({ owner: userB.id });

      // Should still filter by User A's id (SDR can only see own data)
      expect(prismaMock.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: userA.id,
          }),
        })
      );
    });

    it('should allow admin to see all contacts', async () => {
      mockedGetServerSession.mockResolvedValue(sessionAdmin);

      const contactA = createMockContact(userA.id, { id: 'contact-a' });
      const contactB = createMockContact(userB.id, { id: 'contact-b' });

      prismaMock.contact.findMany.mockResolvedValue([contactA, contactB]);

      const contacts = await getContacts();

      // Admin should not have ownerId filter
      expect(prismaMock.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            ownerId: expect.any(String),
          }),
        })
      );
      expect(contacts).toHaveLength(2);
    });

    it('should allow admin to filter by specific owner', async () => {
      mockedGetServerSession.mockResolvedValue(sessionAdmin);

      const contactA = createMockContact(userA.id, { id: 'contact-a' });
      prismaMock.contact.findMany.mockResolvedValue([contactA]);

      await getContacts({ owner: userA.id });

      expect(prismaMock.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: userA.id,
          }),
        })
      );
    });
  });

  describe('search and status filters', () => {
    beforeEach(() => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);
    });

    it('should filter by status', async () => {
      prismaMock.contact.findMany.mockResolvedValue([]);

      await getContacts({ status: 'active' });

      expect(prismaMock.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'active',
          }),
        })
      );
    });

    it('should filter by search term across name, email, and phone', async () => {
      prismaMock.contact.findMany.mockResolvedValue([]);

      await getContacts({ search: 'john' });

      expect(prismaMock.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { name: { contains: 'john', mode: 'insensitive' } },
              { email: { contains: 'john', mode: 'insensitive' } },
              { phone: { contains: 'john' } },
            ]),
          }),
        })
      );
    });

    it('should filter by company type - organization', async () => {
      prismaMock.contact.findMany.mockResolvedValue([]);

      await getContacts({ company: 'organization' });

      expect(prismaMock.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: { not: null },
          }),
        })
      );
    });

    it('should filter by company type - lead', async () => {
      prismaMock.contact.findMany.mockResolvedValue([]);

      await getContacts({ company: 'lead' });

      expect(prismaMock.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            leadId: { not: null },
          }),
        })
      );
    });

    it('should filter by company type - partner', async () => {
      prismaMock.contact.findMany.mockResolvedValue([]);

      await getContacts({ company: 'partner' });

      expect(prismaMock.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            partnerId: { not: null },
          }),
        })
      );
    });

    it('should filter contacts without company (none)', async () => {
      prismaMock.contact.findMany.mockResolvedValue([]);

      await getContacts({ company: 'none' });

      expect(prismaMock.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: null,
            leadId: null,
            partnerId: null,
          }),
        })
      );
    });
  });

  describe('authentication', () => {
    it('should throw error when not authenticated', async () => {
      mockedGetServerSession.mockResolvedValue(null);

      await expect(getContacts()).rejects.toThrow('Não autorizado');
    });
  });
});

// ============ GET CONTACT BY ID TESTS ============

describe('Contacts - getContactById', () => {
  describe('ownership verification', () => {
    it('should return own contact', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const contactA = {
        ...createMockContact(userA.id, { id: 'contact-a' }),
        lead: null,
        organization: null,
        deals: [],
        activities: [],
      };

      prismaMock.contact.findFirst.mockResolvedValue(contactA);

      const result = await getContactById('contact-a');

      expect(prismaMock.contact.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'contact-a',
            ownerId: userA.id,
          }),
        })
      );
      expect(result?.id).toBe('contact-a');
    });

    it('should block access to other user contact (returns null)', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      // Contact belongs to User B, but User A is logged in
      prismaMock.contact.findFirst.mockResolvedValue(null);

      const result = await getContactById('contact-b-id');

      expect(result).toBeNull();
    });

    it('should allow admin to access any contact', async () => {
      mockedGetServerSession.mockResolvedValue(sessionAdmin);

      const contactA = {
        ...createMockContact(userA.id, { id: 'contact-a' }),
        lead: null,
        organization: null,
        deals: [],
        activities: [],
      };

      prismaMock.contact.findFirst.mockResolvedValue(contactA);

      const result = await getContactById('contact-a');

      // Admin should not have ownerId filter
      expect(prismaMock.contact.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            ownerId: expect.any(String),
          }),
        })
      );
      expect(result?.id).toBe('contact-a');
    });
  });

  describe('return value', () => {
    beforeEach(() => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);
    });

    it('should return null for non-existent contact', async () => {
      prismaMock.contact.findFirst.mockResolvedValue(null);

      const result = await getContactById('non-existent-id');

      expect(result).toBeNull();
    });

    it('should include related data in response', async () => {
      const contactWithRelations = {
        ...createMockContact(userA.id, { id: 'contact-a' }),
        lead: { id: 'lead-1', businessName: 'Lead Co' },
        organization: null,
        deals: [{ id: 'deal-1', title: 'Big Deal' }],
        activities: [{ id: 'activity-1', subject: 'Call' }],
      };

      prismaMock.contact.findFirst.mockResolvedValue(contactWithRelations);

      const result = await getContactById('contact-a');

      expect(result).toHaveProperty('lead');
      expect(result).toHaveProperty('deals');
      expect(result).toHaveProperty('activities');
    });
  });

  describe('authentication', () => {
    it('should throw error when not authenticated', async () => {
      mockedGetServerSession.mockResolvedValue(null);

      await expect(getContactById('contact-a')).rejects.toThrow('Não autorizado');
    });
  });
});

// ============ UPDATE CONTACT TESTS ============

describe('Contacts - updateContact', () => {
  describe('successful update', () => {
    beforeEach(() => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);
    });

    it('should update own contact with valid data', async () => {
      const existingContact = createMockContact(userA.id, { id: 'contact-a' });
      const updatedData = {
        name: 'Updated Name',
        email: 'updated@example.com',
      };

      prismaMock.contact.findUnique.mockResolvedValue(existingContact);
      prismaMock.contact.update.mockResolvedValue({
        ...existingContact,
        ...updatedData,
      });

      const result = await updateContact('contact-a', updatedData);

      expect(prismaMock.contact.update).toHaveBeenCalledWith({
        where: { id: 'contact-a' },
        data: expect.objectContaining({
          name: 'Updated Name',
          email: 'updated@example.com',
        }),
      });
      expect(result.name).toBe('Updated Name');
    });

    it('should update contact company link', async () => {
      const existingContact = createMockContact(userA.id, { id: 'contact-a' });
      const updatedData = {
        name: 'Test Contact',
        companyType: 'organization' as const,
        companyId: 'new-org-id',
      };

      prismaMock.contact.findUnique.mockResolvedValue(existingContact);
      prismaMock.contact.update.mockResolvedValue({
        ...existingContact,
        organizationId: 'new-org-id',
      });

      const result = await updateContact('contact-a', updatedData);

      expect(prismaMock.contact.update).toHaveBeenCalledWith({
        where: { id: 'contact-a' },
        data: expect.objectContaining({
          organizationId: 'new-org-id',
          leadId: null,
          partnerId: null,
        }),
      });
    });

    it('should update contact status', async () => {
      const existingContact = createMockContact(userA.id, { id: 'contact-a' });
      const updatedData = {
        name: 'Test Contact',
        status: 'inactive' as const,
      };

      prismaMock.contact.findUnique.mockResolvedValue(existingContact);
      prismaMock.contact.update.mockResolvedValue({
        ...existingContact,
        status: 'inactive',
      });

      const result = await updateContact('contact-a', updatedData);

      expect(result.status).toBe('inactive');
    });
  });

  describe('ownership verification', () => {
    it('should throw error when trying to update other user contact', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      // Contact belongs to User B
      const contactB = createMockContact(userB.id, { id: 'contact-b' });
      prismaMock.contact.findUnique.mockResolvedValue(contactB);

      await expect(
        updateContact('contact-b', { name: 'Hacked Name' })
      ).rejects.toThrow('Contato não encontrado');
    });

    it('should throw error when contact does not exist', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      prismaMock.contact.findUnique.mockResolvedValue(null);

      await expect(
        updateContact('non-existent', { name: 'Test' })
      ).rejects.toThrow('Contato não encontrado');
    });

    it('should allow admin to update any contact', async () => {
      mockedGetServerSession.mockResolvedValue(sessionAdmin);

      const contactA = createMockContact(userA.id, { id: 'contact-a' });
      prismaMock.contact.findUnique.mockResolvedValue(contactA);
      prismaMock.contact.update.mockResolvedValue({
        ...contactA,
        name: 'Admin Updated',
      });

      const result = await updateContact('contact-a', { name: 'Admin Updated' });

      expect(result.name).toBe('Admin Updated');
    });
  });

  describe('validation', () => {
    beforeEach(() => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);
      prismaMock.contact.findUnique.mockResolvedValue(
        createMockContact(userA.id, { id: 'contact-a' })
      );
    });

    it('should reject update with name too short', async () => {
      await expect(
        updateContact('contact-a', { name: 'A' })
      ).rejects.toThrow();
    });

    it('should reject update with invalid email', async () => {
      await expect(
        updateContact('contact-a', { name: 'Valid', email: 'invalid' })
      ).rejects.toThrow();
    });
  });

  describe('authentication', () => {
    it('should throw error when not authenticated', async () => {
      mockedGetServerSession.mockResolvedValue(null);

      await expect(
        updateContact('contact-a', { name: 'Test' })
      ).rejects.toThrow('Não autorizado');
    });
  });
});

// ============ DELETE CONTACT TESTS ============

describe('Contacts - deleteContact', () => {
  describe('successful deletion', () => {
    it('should delete own contact', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const contactA = createMockContact(userA.id, { id: 'contact-a' });
      prismaMock.contact.findUnique.mockResolvedValue(contactA);
      prismaMock.contact.delete.mockResolvedValue(contactA);

      await deleteContact('contact-a');

      expect(prismaMock.contact.delete).toHaveBeenCalledWith({
        where: { id: 'contact-a' },
      });
    });
  });

  describe('ownership verification', () => {
    it('should throw error when trying to delete other user contact', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const contactB = createMockContact(userB.id, { id: 'contact-b' });
      prismaMock.contact.findUnique.mockResolvedValue(contactB);

      await expect(deleteContact('contact-b')).rejects.toThrow(
        'Contato não encontrado'
      );
      expect(prismaMock.contact.delete).not.toHaveBeenCalled();
    });

    it('should throw error when contact does not exist', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      prismaMock.contact.findUnique.mockResolvedValue(null);

      await expect(deleteContact('non-existent')).rejects.toThrow(
        'Contato não encontrado'
      );
    });

    it('should allow admin to delete any contact', async () => {
      mockedGetServerSession.mockResolvedValue(sessionAdmin);

      const contactA = createMockContact(userA.id, { id: 'contact-a' });
      prismaMock.contact.findUnique.mockResolvedValue(contactA);
      prismaMock.contact.delete.mockResolvedValue(contactA);

      await deleteContact('contact-a');

      expect(prismaMock.contact.delete).toHaveBeenCalledWith({
        where: { id: 'contact-a' },
      });
    });
  });

  describe('authentication', () => {
    it('should throw error when not authenticated', async () => {
      mockedGetServerSession.mockResolvedValue(null);

      await expect(deleteContact('contact-a')).rejects.toThrow('Não autorizado');
    });
  });
});

// ============ EDGE CASES AND TRIANGULATION ============

describe('Contacts - Edge Cases', () => {
  describe('triangulation - multiple users cannot access each other data', () => {
    it('User A cannot see User B contacts', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);
      prismaMock.contact.findMany.mockResolvedValue([]);

      await getContacts();

      expect(prismaMock.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: userA.id,
          }),
        })
      );
    });

    it('User B cannot see User A contacts', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserB);
      prismaMock.contact.findMany.mockResolvedValue([]);

      await getContacts();

      expect(prismaMock.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: userB.id,
          }),
        })
      );
    });

    it('User A cannot update User B contact', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);
      prismaMock.contact.findUnique.mockResolvedValue(
        createMockContact(userB.id, { id: 'contact-b' })
      );

      await expect(
        updateContact('contact-b', { name: 'Hacked' })
      ).rejects.toThrow('Contato não encontrado');
    });

    it('User B cannot update User A contact', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserB);
      prismaMock.contact.findUnique.mockResolvedValue(
        createMockContact(userA.id, { id: 'contact-a' })
      );

      await expect(
        updateContact('contact-a', { name: 'Hacked' })
      ).rejects.toThrow('Contato não encontrado');
    });

    it('User A cannot delete User B contact', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);
      prismaMock.contact.findUnique.mockResolvedValue(
        createMockContact(userB.id, { id: 'contact-b' })
      );

      await expect(deleteContact('contact-b')).rejects.toThrow(
        'Contato não encontrado'
      );
    });

    it('User B cannot delete User A contact', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserB);
      prismaMock.contact.findUnique.mockResolvedValue(
        createMockContact(userA.id, { id: 'contact-a' })
      );

      await expect(deleteContact('contact-a')).rejects.toThrow(
        'Contato não encontrado'
      );
    });
  });

  describe('empty states', () => {
    it('should return empty array when user has no contacts', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);
      prismaMock.contact.findMany.mockResolvedValue([]);

      const contacts = await getContacts();

      expect(contacts).toEqual([]);
    });
  });

  describe('valid edge values', () => {
    beforeEach(() => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);
    });

    it('should accept name with exactly 2 characters (minimum)', async () => {
      const contactData = { name: 'AB' };
      prismaMock.contact.create.mockResolvedValue(
        createMockContact(userA.id, { name: 'AB' })
      );

      const result = await createContact(contactData);

      expect(result.name).toBe('AB');
    });

    it('should accept valid status values', async () => {
      const statuses = ['active', 'inactive', 'bounced'] as const;

      for (const status of statuses) {
        const contactData = { name: 'Test Contact', status };
        prismaMock.contact.create.mockResolvedValue({
          ...createMockContact(userA.id),
          status,
        });

        await expect(createContact(contactData)).resolves.toBeDefined();
      }
    });

    it('should accept valid companyType values', async () => {
      const companyTypes = ['lead', 'organization', 'partner'] as const;

      for (const companyType of companyTypes) {
        const contactData = { name: 'Test Contact', companyType, companyId: 'test-id' };
        prismaMock.contact.create.mockResolvedValue(
          createMockContact(userA.id)
        );

        await expect(createContact(contactData)).resolves.toBeDefined();
      }
    });

    it('should accept all optional fields as undefined', async () => {
      const contactData = { name: 'Minimal Contact' };
      prismaMock.contact.create.mockResolvedValue(
        createMockContact(userA.id, { name: 'Minimal Contact' })
      );

      await expect(createContact(contactData)).resolves.toBeDefined();
    });
  });

  describe('ordering', () => {
    it('should order by isPrimary desc, then name asc', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);
      prismaMock.contact.findMany.mockResolvedValue([]);

      await getContacts();

      expect(prismaMock.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [
            { isPrimary: 'desc' },
            { name: 'asc' },
          ],
        })
      );
    });
  });
});
