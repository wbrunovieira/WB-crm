/**
 * Lead Contacts Action Tests
 *
 * Tests for lead contact operations in src/actions/leads.ts including:
 * - CRUD operations for lead contacts
 * - Lead ownership verification (contact inherits lead's owner)
 * - Validation
 * - Primary contact handling
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
  createMockLead,
  createMockLeadContact,
} from '../fixtures/multiple-users';

// Import Server Actions
import {
  getLeadContacts,
  createLeadContact,
  updateLeadContact,
  deleteLeadContact,
} from '@/actions/leads';

const mockedGetServerSession = vi.mocked(getServerSession);

// ============ GET LEAD CONTACTS TESTS ============

describe('LeadContacts - getLeadContacts', () => {
  describe('ownership filtering', () => {
    it('should return contacts for own lead', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const contact1 = createMockLeadContact('lead-a', { id: 'contact-1', name: 'John' });
      const contact2 = createMockLeadContact('lead-a', { id: 'contact-2', name: 'Jane' });

      prismaMock.leadContact.findMany.mockResolvedValue([contact1, contact2]);

      const contacts = await getLeadContacts('lead-a');

      expect(prismaMock.leadContact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            leadId: 'lead-a',
            lead: expect.objectContaining({
              ownerId: userA.id,
            }),
          }),
        })
      );
      expect(contacts).toHaveLength(2);
    });

    it('should return empty array when lead belongs to other user', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      // The ownerFilter will prevent finding contacts
      prismaMock.leadContact.findMany.mockResolvedValue([]);

      const contacts = await getLeadContacts('lead-b');

      expect(contacts).toEqual([]);
    });

    it('should allow admin to see contacts from any lead', async () => {
      mockedGetServerSession.mockResolvedValue(sessionAdmin);

      const contact = createMockLeadContact('lead-a', { id: 'contact-1' });
      prismaMock.leadContact.findMany.mockResolvedValue([contact]);

      const contacts = await getLeadContacts('lead-a');

      // Admin should not have ownerId filter
      expect(prismaMock.leadContact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            leadId: 'lead-a',
            lead: expect.not.objectContaining({
              ownerId: expect.any(String),
            }),
          }),
        })
      );
      expect(contacts).toHaveLength(1);
    });
  });

  describe('ordering', () => {
    it('should order by isPrimary desc, then name asc', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      prismaMock.leadContact.findMany.mockResolvedValue([]);

      await getLeadContacts('lead-a');

      expect(prismaMock.leadContact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [
            { isPrimary: 'desc' },
            { name: 'asc' },
          ],
        })
      );
    });
  });

  describe('authentication', () => {
    it('should throw error when not authenticated', async () => {
      mockedGetServerSession.mockResolvedValue(null);

      await expect(getLeadContacts('lead-a')).rejects.toThrow('Não autorizado');
    });
  });
});

// ============ CREATE LEAD CONTACT TESTS ============

describe('LeadContacts - createLeadContact', () => {
  describe('successful creation', () => {
    beforeEach(() => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);
    });

    it('should create contact for own lead', async () => {
      const leadA = createMockLead(userA.id, { id: 'lead-a' });
      prismaMock.lead.findUnique.mockResolvedValue(leadA);

      const contactData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+55 11 99999-9999',
        role: 'CEO',
      };

      const createdContact = {
        ...createMockLeadContact('lead-a'),
        ...contactData,
        id: 'new-contact-id',
      };

      prismaMock.leadContact.create.mockResolvedValue(createdContact);

      const result = await createLeadContact('lead-a', contactData);

      expect(prismaMock.leadContact.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'John Doe',
          email: 'john@example.com',
          leadId: 'lead-a',
        }),
      });
      expect(result.name).toBe('John Doe');
    });

    it('should create contact with minimal data (only name)', async () => {
      const leadA = createMockLead(userA.id, { id: 'lead-a' });
      prismaMock.lead.findUnique.mockResolvedValue(leadA);

      const contactData = { name: 'Jane Doe' };
      const createdContact = createMockLeadContact('lead-a', { name: 'Jane Doe' });

      prismaMock.leadContact.create.mockResolvedValue(createdContact);

      const result = await createLeadContact('lead-a', contactData);

      expect(result.name).toBe('Jane Doe');
    });

    it('should set isPrimary when specified', async () => {
      const leadA = createMockLead(userA.id, { id: 'lead-a' });
      prismaMock.lead.findUnique.mockResolvedValue(leadA);

      const contactData = { name: 'Primary Contact', isPrimary: true };
      const createdContact = createMockLeadContact('lead-a', {
        name: 'Primary Contact',
        isPrimary: true,
      });

      prismaMock.leadContact.updateMany.mockResolvedValue({ count: 0 });
      prismaMock.leadContact.create.mockResolvedValue(createdContact);

      const result = await createLeadContact('lead-a', contactData);

      // Should unset other primary contacts first
      expect(prismaMock.leadContact.updateMany).toHaveBeenCalledWith({
        where: { leadId: 'lead-a' },
        data: { isPrimary: false },
      });
      expect(result.isPrimary).toBe(true);
    });

    it('should NOT unset other primaries when isPrimary is false', async () => {
      const leadA = createMockLead(userA.id, { id: 'lead-a' });
      prismaMock.lead.findUnique.mockResolvedValue(leadA);

      const contactData = { name: 'Non-Primary Contact', isPrimary: false };
      const createdContact = createMockLeadContact('lead-a', {
        name: 'Non-Primary Contact',
        isPrimary: false,
      });

      prismaMock.leadContact.create.mockResolvedValue(createdContact);

      await createLeadContact('lead-a', contactData);

      // Should NOT call updateMany when isPrimary is false
      expect(prismaMock.leadContact.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('lead ownership verification', () => {
    it('should throw error when trying to add contact to other user lead', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      // Lead belongs to User B
      const leadB = createMockLead(userB.id, { id: 'lead-b' });
      prismaMock.lead.findUnique.mockResolvedValue(leadB);

      await expect(
        createLeadContact('lead-b', { name: 'Hacker Contact' })
      ).rejects.toThrow('Lead não encontrado');

      expect(prismaMock.leadContact.create).not.toHaveBeenCalled();
    });

    it('should throw error when lead does not exist', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      prismaMock.lead.findUnique.mockResolvedValue(null);

      await expect(
        createLeadContact('non-existent', { name: 'Test' })
      ).rejects.toThrow('Lead não encontrado');
    });

    it('should allow admin to add contact to any lead', async () => {
      mockedGetServerSession.mockResolvedValue(sessionAdmin);

      const leadA = createMockLead(userA.id, { id: 'lead-a' });
      prismaMock.lead.findUnique.mockResolvedValue(leadA);

      const createdContact = createMockLeadContact('lead-a', { name: 'Admin Added' });
      prismaMock.leadContact.create.mockResolvedValue(createdContact);

      const result = await createLeadContact('lead-a', { name: 'Admin Added' });

      expect(result.name).toBe('Admin Added');
    });
  });

  describe('validation', () => {
    beforeEach(() => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);
      prismaMock.lead.findUnique.mockResolvedValue(
        createMockLead(userA.id, { id: 'lead-a' })
      );
    });

    it('should reject contact with name too short', async () => {
      await expect(
        createLeadContact('lead-a', { name: 'A' }) // Min 2 characters
      ).rejects.toThrow();
    });

    it('should reject contact with invalid email', async () => {
      await expect(
        createLeadContact('lead-a', { name: 'Valid Name', email: 'invalid-email' })
      ).rejects.toThrow();
    });

    it('should accept valid email format', async () => {
      const createdContact = createMockLeadContact('lead-a', {
        name: 'Valid',
        email: 'valid@example.com',
      });
      prismaMock.leadContact.create.mockResolvedValue(createdContact);

      await expect(
        createLeadContact('lead-a', { name: 'Valid', email: 'valid@example.com' })
      ).resolves.toBeDefined();
    });

    it('should accept empty string for optional email', async () => {
      const createdContact = createMockLeadContact('lead-a', { name: 'No Email' });
      prismaMock.leadContact.create.mockResolvedValue(createdContact);

      await expect(
        createLeadContact('lead-a', { name: 'No Email', email: '' })
      ).resolves.toBeDefined();
    });
  });

  describe('authentication', () => {
    it('should throw error when not authenticated', async () => {
      mockedGetServerSession.mockResolvedValue(null);

      await expect(
        createLeadContact('lead-a', { name: 'Test' })
      ).rejects.toThrow('Não autorizado');
    });
  });
});

// ============ UPDATE LEAD CONTACT TESTS ============

describe('LeadContacts - updateLeadContact', () => {
  describe('successful update', () => {
    beforeEach(() => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);
    });

    it('should update own lead contact', async () => {
      const existingContact = {
        ...createMockLeadContact('lead-a', { id: 'contact-1', name: 'Old Name' }),
        lead: createMockLead(userA.id, { id: 'lead-a' }),
      };

      prismaMock.leadContact.findUnique.mockResolvedValue(existingContact);
      prismaMock.leadContact.update.mockResolvedValue({
        ...existingContact,
        name: 'New Name',
        role: 'CTO',
      });

      const result = await updateLeadContact('contact-1', {
        name: 'New Name',
        role: 'CTO',
      });

      expect(prismaMock.leadContact.update).toHaveBeenCalledWith({
        where: { id: 'contact-1' },
        data: expect.objectContaining({
          name: 'New Name',
          role: 'CTO',
        }),
      });
      expect(result.name).toBe('New Name');
    });

    it('should unset other primaries when setting as primary', async () => {
      const existingContact = {
        ...createMockLeadContact('lead-a', { id: 'contact-1', isPrimary: false }),
        lead: createMockLead(userA.id, { id: 'lead-a' }),
        leadId: 'lead-a',
      };

      prismaMock.leadContact.findUnique.mockResolvedValue(existingContact);
      prismaMock.leadContact.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.leadContact.update.mockResolvedValue({
        ...existingContact,
        isPrimary: true,
      });

      await updateLeadContact('contact-1', { name: 'Test', isPrimary: true });

      expect(prismaMock.leadContact.updateMany).toHaveBeenCalledWith({
        where: { leadId: 'lead-a', id: { not: 'contact-1' } },
        data: { isPrimary: false },
      });
    });

    it('should NOT unset other primaries when already primary', async () => {
      const existingContact = {
        ...createMockLeadContact('lead-a', { id: 'contact-1', isPrimary: true }),
        lead: createMockLead(userA.id, { id: 'lead-a' }),
        leadId: 'lead-a',
      };

      prismaMock.leadContact.findUnique.mockResolvedValue(existingContact);
      prismaMock.leadContact.update.mockResolvedValue(existingContact);

      await updateLeadContact('contact-1', { name: 'Test', isPrimary: true });

      // Should NOT call updateMany when already primary
      expect(prismaMock.leadContact.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('ownership verification', () => {
    it('should throw error when trying to update contact from other user lead', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const contactFromUserB = {
        ...createMockLeadContact('lead-b', { id: 'contact-b' }),
        lead: createMockLead(userB.id, { id: 'lead-b' }),
      };

      prismaMock.leadContact.findUnique.mockResolvedValue(contactFromUserB);

      await expect(
        updateLeadContact('contact-b', { name: 'Hacked Name' })
      ).rejects.toThrow('Contato não encontrado');

      expect(prismaMock.leadContact.update).not.toHaveBeenCalled();
    });

    it('should throw error when contact does not exist', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      prismaMock.leadContact.findUnique.mockResolvedValue(null);

      await expect(
        updateLeadContact('non-existent', { name: 'Test' })
      ).rejects.toThrow('Contato não encontrado');
    });

    it('should allow admin to update contact from any lead', async () => {
      mockedGetServerSession.mockResolvedValue(sessionAdmin);

      const contactFromUserA = {
        ...createMockLeadContact('lead-a', { id: 'contact-a' }),
        lead: createMockLead(userA.id, { id: 'lead-a' }),
      };

      prismaMock.leadContact.findUnique.mockResolvedValue(contactFromUserA);
      prismaMock.leadContact.update.mockResolvedValue({
        ...contactFromUserA,
        name: 'Admin Updated',
      });

      const result = await updateLeadContact('contact-a', { name: 'Admin Updated' });

      expect(result.name).toBe('Admin Updated');
    });
  });

  describe('validation', () => {
    beforeEach(() => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);
      prismaMock.leadContact.findUnique.mockResolvedValue({
        ...createMockLeadContact('lead-a', { id: 'contact-1' }),
        lead: createMockLead(userA.id, { id: 'lead-a' }),
      });
    });

    it('should reject update with name too short', async () => {
      await expect(
        updateLeadContact('contact-1', { name: 'A' })
      ).rejects.toThrow();
    });

    it('should reject update with invalid email', async () => {
      await expect(
        updateLeadContact('contact-1', { name: 'Valid', email: 'invalid' })
      ).rejects.toThrow();
    });
  });

  describe('authentication', () => {
    it('should throw error when not authenticated', async () => {
      mockedGetServerSession.mockResolvedValue(null);

      await expect(
        updateLeadContact('contact-1', { name: 'Test' })
      ).rejects.toThrow('Não autorizado');
    });
  });
});

// ============ DELETE LEAD CONTACT TESTS ============

describe('LeadContacts - deleteLeadContact', () => {
  describe('successful deletion', () => {
    it('should delete own lead contact', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const contact = {
        ...createMockLeadContact('lead-a', { id: 'contact-1' }),
        lead: createMockLead(userA.id, { id: 'lead-a' }),
        leadId: 'lead-a',
      };

      prismaMock.leadContact.findUnique.mockResolvedValue(contact);
      prismaMock.leadContact.delete.mockResolvedValue(contact);

      await deleteLeadContact('contact-1');

      expect(prismaMock.leadContact.delete).toHaveBeenCalledWith({
        where: { id: 'contact-1' },
      });
    });
  });

  describe('ownership verification', () => {
    it('should throw error when trying to delete contact from other user lead', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const contactFromUserB = {
        ...createMockLeadContact('lead-b', { id: 'contact-b' }),
        lead: createMockLead(userB.id, { id: 'lead-b' }),
      };

      prismaMock.leadContact.findUnique.mockResolvedValue(contactFromUserB);

      await expect(deleteLeadContact('contact-b')).rejects.toThrow(
        'Contato não encontrado'
      );

      expect(prismaMock.leadContact.delete).not.toHaveBeenCalled();
    });

    it('should throw error when contact does not exist', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      prismaMock.leadContact.findUnique.mockResolvedValue(null);

      await expect(deleteLeadContact('non-existent')).rejects.toThrow(
        'Contato não encontrado'
      );
    });

    it('should allow admin to delete contact from any lead', async () => {
      mockedGetServerSession.mockResolvedValue(sessionAdmin);

      const contactFromUserA = {
        ...createMockLeadContact('lead-a', { id: 'contact-a' }),
        lead: createMockLead(userA.id, { id: 'lead-a' }),
        leadId: 'lead-a',
      };

      prismaMock.leadContact.findUnique.mockResolvedValue(contactFromUserA);
      prismaMock.leadContact.delete.mockResolvedValue(contactFromUserA);

      await deleteLeadContact('contact-a');

      expect(prismaMock.leadContact.delete).toHaveBeenCalled();
    });
  });

  describe('converted contact protection', () => {
    it('should throw error when trying to delete converted contact', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const convertedContact = {
        ...createMockLeadContact('lead-a', {
          id: 'contact-1',
          convertedToContactId: 'converted-contact-id',
        }),
        lead: createMockLead(userA.id, { id: 'lead-a' }),
      };

      prismaMock.leadContact.findUnique.mockResolvedValue(convertedContact);

      await expect(deleteLeadContact('contact-1')).rejects.toThrow(
        'Não é possível excluir um contato já convertido'
      );

      expect(prismaMock.leadContact.delete).not.toHaveBeenCalled();
    });
  });

  describe('authentication', () => {
    it('should throw error when not authenticated', async () => {
      mockedGetServerSession.mockResolvedValue(null);

      await expect(deleteLeadContact('contact-1')).rejects.toThrow(
        'Não autorizado'
      );
    });
  });
});

// ============ EDGE CASES AND TRIANGULATION ============

describe('LeadContacts - Edge Cases', () => {
  describe('triangulation - users cannot access each other lead contacts', () => {
    it('User A cannot create contact in User B lead', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const leadB = createMockLead(userB.id, { id: 'lead-b' });
      prismaMock.lead.findUnique.mockResolvedValue(leadB);

      await expect(
        createLeadContact('lead-b', { name: 'Test' })
      ).rejects.toThrow('Lead não encontrado');
    });

    it('User B cannot create contact in User A lead', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserB);

      const leadA = createMockLead(userA.id, { id: 'lead-a' });
      prismaMock.lead.findUnique.mockResolvedValue(leadA);

      await expect(
        createLeadContact('lead-a', { name: 'Test' })
      ).rejects.toThrow('Lead não encontrado');
    });

    it('User A cannot update contact in User B lead', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const contactFromB = {
        ...createMockLeadContact('lead-b', { id: 'contact-b' }),
        lead: createMockLead(userB.id, { id: 'lead-b' }),
      };
      prismaMock.leadContact.findUnique.mockResolvedValue(contactFromB);

      await expect(
        updateLeadContact('contact-b', { name: 'Hacked' })
      ).rejects.toThrow('Contato não encontrado');
    });

    it('User B cannot update contact in User A lead', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserB);

      const contactFromA = {
        ...createMockLeadContact('lead-a', { id: 'contact-a' }),
        lead: createMockLead(userA.id, { id: 'lead-a' }),
      };
      prismaMock.leadContact.findUnique.mockResolvedValue(contactFromA);

      await expect(
        updateLeadContact('contact-a', { name: 'Hacked' })
      ).rejects.toThrow('Contato não encontrado');
    });

    it('User A cannot delete contact in User B lead', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const contactFromB = {
        ...createMockLeadContact('lead-b', { id: 'contact-b' }),
        lead: createMockLead(userB.id, { id: 'lead-b' }),
      };
      prismaMock.leadContact.findUnique.mockResolvedValue(contactFromB);

      await expect(deleteLeadContact('contact-b')).rejects.toThrow(
        'Contato não encontrado'
      );
    });

    it('User B cannot delete contact in User A lead', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserB);

      const contactFromA = {
        ...createMockLeadContact('lead-a', { id: 'contact-a' }),
        lead: createMockLead(userA.id, { id: 'lead-a' }),
      };
      prismaMock.leadContact.findUnique.mockResolvedValue(contactFromA);

      await expect(deleteLeadContact('contact-a')).rejects.toThrow(
        'Contato não encontrado'
      );
    });
  });

  describe('empty states', () => {
    it('should return empty array when lead has no contacts', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);
      prismaMock.leadContact.findMany.mockResolvedValue([]);

      const contacts = await getLeadContacts('lead-a');

      expect(contacts).toEqual([]);
    });
  });

  describe('valid edge values', () => {
    beforeEach(() => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);
      prismaMock.lead.findUnique.mockResolvedValue(
        createMockLead(userA.id, { id: 'lead-a' })
      );
    });

    it('should accept name with exactly 2 characters (minimum)', async () => {
      const createdContact = createMockLeadContact('lead-a', { name: 'AB' });
      prismaMock.leadContact.create.mockResolvedValue(createdContact);

      const result = await createLeadContact('lead-a', { name: 'AB' });

      expect(result.name).toBe('AB');
    });

    it('should accept all optional fields as undefined', async () => {
      const createdContact = createMockLeadContact('lead-a', { name: 'Only Name' });
      prismaMock.leadContact.create.mockResolvedValue(createdContact);

      await expect(
        createLeadContact('lead-a', { name: 'Only Name' })
      ).resolves.toBeDefined();
    });
  });

  describe('primary contact logic', () => {
    beforeEach(() => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);
    });

    it('should allow multiple non-primary contacts', async () => {
      const leadA = createMockLead(userA.id, { id: 'lead-a' });
      prismaMock.lead.findUnique.mockResolvedValue(leadA);

      const contact1 = createMockLeadContact('lead-a', { name: 'Contact 1', isPrimary: false });
      const contact2 = createMockLeadContact('lead-a', { name: 'Contact 2', isPrimary: false });

      prismaMock.leadContact.create
        .mockResolvedValueOnce(contact1)
        .mockResolvedValueOnce(contact2);

      await createLeadContact('lead-a', { name: 'Contact 1', isPrimary: false });
      await createLeadContact('lead-a', { name: 'Contact 2', isPrimary: false });

      // updateMany should not have been called for non-primary contacts
      expect(prismaMock.leadContact.updateMany).not.toHaveBeenCalled();
    });
  });
});
