/**
 * Leads Action Tests
 *
 * Tests for src/actions/leads.ts including:
 * - CRUD operations for leads
 * - Ownership verification
 * - Validation
 * - Lead to Organization conversion
 *
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { prismaMock } from '../setup';
import type { LeadFormData } from '@/lib/validations/lead';
import {
  userA,
  userB,
  adminUser,
  sessionUserA,
  sessionUserB,
  sessionAdmin,
  createMockLead,
} from '../fixtures/multiple-users';

// Import Server Actions
import {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  convertLeadToOrganization,
} from '@/actions/leads';

const mockedGetServerSession = vi.mocked(getServerSession);

// ============ CREATE LEAD TESTS ============

describe('Leads - createLead', () => {
  describe('successful creation', () => {
    beforeEach(() => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);
    });

    it('should create lead with valid data', async () => {
      const leadData = {
        businessName: 'Tech Company',
        city: 'São Paulo',
        state: 'SP',
        country: 'Brasil',
      };

      const createdLead = {
        ...createMockLead(userA.id),
        id: 'new-lead-id',
        businessName: 'Tech Company',
        city: 'São Paulo',
        state: 'SP',
        country: 'Brasil',
      };

      prismaMock.lead.create.mockResolvedValue(createdLead);

      const result = await createLead(leadData);

      expect(prismaMock.lead.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          businessName: 'Tech Company',
          ownerId: userA.id,
        }),
      });
      expect(result.businessName).toBe('Tech Company');
    });

    it('should set ownerId to current user id', async () => {
      const leadData = { businessName: 'Test Lead' };

      prismaMock.lead.create.mockResolvedValue(
        createMockLead(userA.id, { businessName: 'Test Lead' })
      );

      await createLead(leadData);

      expect(prismaMock.lead.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ownerId: userA.id,
        }),
      });
    });

    it('should create lead with optional fields', async () => {
      const leadData: LeadFormData = {
        businessName: 'Full Company',
        registeredName: 'Full Company LTDA',
        email: 'contact@fullcompany.com',
        phone: '+55 11 99999-9999',
        website: 'https://fullcompany.com',
        status: 'new',
        quality: 'hot',
      };

      const createdLead = {
        ...createMockLead(userA.id),
        ...leadData,
      };

      prismaMock.lead.create.mockResolvedValue(createdLead);

      const result = await createLead(leadData);

      expect(result.email).toBe('contact@fullcompany.com');
      expect(result.quality).toBe('hot');
    });
  });

  describe('validation', () => {
    beforeEach(() => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);
    });

    it('should reject lead with businessName too short', async () => {
      const leadData = { businessName: 'A' }; // Min 2 characters

      await expect(createLead(leadData)).rejects.toThrow();
    });

    it('should reject lead with invalid email format', async () => {
      const leadData = {
        businessName: 'Valid Name',
        email: 'invalid-email',
      };

      await expect(createLead(leadData)).rejects.toThrow();
    });

    it('should reject lead with invalid status', async () => {
      const leadData = {
        businessName: 'Valid Name',
        status: 'invalid_status' as unknown as 'new',
      };

      await expect(createLead(leadData)).rejects.toThrow();
    });

    it('should reject lead with invalid quality', async () => {
      const leadData = {
        businessName: 'Valid Name',
        quality: 'invalid_quality' as unknown as 'hot',
      };

      await expect(createLead(leadData)).rejects.toThrow();
    });
  });

  describe('authentication', () => {
    it('should throw error when not authenticated', async () => {
      mockedGetServerSession.mockResolvedValue(null);

      await expect(
        createLead({ businessName: 'Test Lead' })
      ).rejects.toThrow('Não autorizado');
    });

    it('should throw error when session has no user id', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
        expires: '2025-12-31',
      } as never);

      await expect(
        createLead({ businessName: 'Test Lead' })
      ).rejects.toThrow('Não autorizado');
    });
  });
});

// ============ GET LEADS TESTS ============

describe('Leads - getLeads', () => {
  describe('owner filtering', () => {
    it('should return only own leads for SDR user', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const leadA = createMockLead(userA.id, { id: 'lead-a' });
      prismaMock.lead.findMany.mockResolvedValue([leadA]);

      const leads = await getLeads();

      expect(prismaMock.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: userA.id,
          }),
        })
      );
      expect(leads).toHaveLength(1);
    });

    it('should return only own leads even when trying to filter by other user', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      prismaMock.lead.findMany.mockResolvedValue([]);

      // User A trying to see User B's leads
      await getLeads({ owner: userB.id });

      // Should still filter by User A's id (SDR can only see own data)
      expect(prismaMock.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: userA.id,
          }),
        })
      );
    });

    it('should allow admin to see all leads', async () => {
      mockedGetServerSession.mockResolvedValue(sessionAdmin);

      const leadA = createMockLead(userA.id, { id: 'lead-a' });
      const leadB = createMockLead(userB.id, { id: 'lead-b' });

      prismaMock.lead.findMany.mockResolvedValue([leadA, leadB]);

      const leads = await getLeads();

      // Admin should not have ownerId filter
      expect(prismaMock.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            ownerId: expect.any(String),
          }),
        })
      );
      expect(leads).toHaveLength(2);
    });

    it('should allow admin to filter by specific owner', async () => {
      mockedGetServerSession.mockResolvedValue(sessionAdmin);

      const leadA = createMockLead(userA.id, { id: 'lead-a' });
      prismaMock.lead.findMany.mockResolvedValue([leadA]);

      await getLeads({ owner: userA.id });

      expect(prismaMock.lead.findMany).toHaveBeenCalledWith(
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
      prismaMock.lead.findMany.mockResolvedValue([]);

      await getLeads({ status: 'qualified' });

      expect(prismaMock.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'qualified',
          }),
        })
      );
    });

    it('should filter by quality', async () => {
      prismaMock.lead.findMany.mockResolvedValue([]);

      await getLeads({ quality: 'hot' });

      expect(prismaMock.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            quality: 'hot',
          }),
        })
      );
    });

    it('should filter by search term across multiple fields', async () => {
      prismaMock.lead.findMany.mockResolvedValue([]);

      await getLeads({ search: 'tech' });

      expect(prismaMock.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { businessName: { contains: 'tech' } },
              { registeredName: { contains: 'tech' } },
              { email: { contains: 'tech' } },
            ]),
          }),
        })
      );
    });
  });

  describe('authentication', () => {
    it('should throw error when not authenticated', async () => {
      mockedGetServerSession.mockResolvedValue(null);

      await expect(getLeads()).rejects.toThrow('Não autorizado');
    });
  });
});

// ============ GET LEAD BY ID TESTS ============

describe('Leads - getLeadById', () => {
  describe('ownership verification', () => {
    it('should return own lead', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const leadA = createMockLead(userA.id, { id: 'lead-a' });
      prismaMock.lead.findFirst.mockResolvedValue(leadA);

      const result = await getLeadById('lead-a');

      expect(prismaMock.lead.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'lead-a',
            ownerId: userA.id,
          }),
        })
      );
      expect(result?.id).toBe('lead-a');
    });

    it('should block access to other user lead (returns null)', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      // Lead belongs to User B, but User A is logged in
      // The ownerFilter will prevent finding it
      prismaMock.lead.findFirst.mockResolvedValue(null);

      const result = await getLeadById('lead-b-id');

      // Query includes ownerId filter, so it returns null
      expect(result).toBeNull();
    });

    it('should allow admin to access any lead', async () => {
      mockedGetServerSession.mockResolvedValue(sessionAdmin);

      const leadA = createMockLead(userA.id, { id: 'lead-a' });
      prismaMock.lead.findFirst.mockResolvedValue(leadA);

      const result = await getLeadById('lead-a');

      // Admin should not have ownerId filter
      expect(prismaMock.lead.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            ownerId: expect.any(String),
          }),
        })
      );
      expect(result?.id).toBe('lead-a');
    });
  });

  describe('return value', () => {
    beforeEach(() => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);
    });

    it('should return null for non-existent lead', async () => {
      prismaMock.lead.findFirst.mockResolvedValue(null);

      const result = await getLeadById('non-existent-id');

      expect(result).toBeNull();
    });

    it('should include related data in response', async () => {
      const leadWithRelations = {
        ...createMockLead(userA.id, { id: 'lead-a' }),
        leadContacts: [],
        activities: [],
        primaryCNAE: null,
        label: null,
        convertedOrganization: null,
      };

      prismaMock.lead.findFirst.mockResolvedValue(leadWithRelations);

      const result = await getLeadById('lead-a');

      expect(result).toHaveProperty('leadContacts');
      expect(result).toHaveProperty('activities');
    });
  });

  describe('authentication', () => {
    it('should throw error when not authenticated', async () => {
      mockedGetServerSession.mockResolvedValue(null);

      await expect(getLeadById('lead-a')).rejects.toThrow('Não autorizado');
    });
  });
});

// ============ UPDATE LEAD TESTS ============

describe('Leads - updateLead', () => {
  describe('successful update', () => {
    beforeEach(() => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);
    });

    it('should update own lead with valid data', async () => {
      const existingLead = createMockLead(userA.id, { id: 'lead-a' });
      const updatedData: LeadFormData = {
        businessName: 'Updated Company Name',
        status: 'contacted',
      };

      prismaMock.lead.findUnique.mockResolvedValue(existingLead);
      prismaMock.lead.update.mockResolvedValue({
        ...existingLead,
        businessName: updatedData.businessName,
        status: 'contacted',
      });

      const result = await updateLead('lead-a', updatedData);

      expect(prismaMock.lead.update).toHaveBeenCalledWith({
        where: { id: 'lead-a' },
        data: expect.objectContaining({
          businessName: 'Updated Company Name',
          status: 'contacted',
        }),
      });
      expect(result.businessName).toBe('Updated Company Name');
    });

    it('should update lead quality', async () => {
      const existingLead = createMockLead(userA.id, { id: 'lead-a' });
      const updatedData: LeadFormData = {
        businessName: 'Test Company',
        quality: 'hot',
      };

      prismaMock.lead.findUnique.mockResolvedValue(existingLead);
      prismaMock.lead.update.mockResolvedValue({
        ...existingLead,
        businessName: updatedData.businessName,
        quality: 'hot',
      });

      const result = await updateLead('lead-a', updatedData);

      expect(result.quality).toBe('hot');
    });
  });

  describe('ownership verification', () => {
    it('should throw error when trying to update other user lead', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      // Lead belongs to User B
      const leadB = createMockLead(userB.id, { id: 'lead-b' });
      prismaMock.lead.findUnique.mockResolvedValue(leadB);

      const hackedData: LeadFormData = { businessName: 'Hacked Name' };
      await expect(
        updateLead('lead-b', hackedData)
      ).rejects.toThrow('Lead não encontrado');
    });

    it('should throw error when lead does not exist', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      prismaMock.lead.findUnique.mockResolvedValue(null);

      const testData: LeadFormData = { businessName: 'Test' };
      await expect(
        updateLead('non-existent', testData)
      ).rejects.toThrow('Lead não encontrado');
    });

    it('should allow admin to update any lead', async () => {
      mockedGetServerSession.mockResolvedValue(sessionAdmin);

      const leadA = createMockLead(userA.id, { id: 'lead-a' });
      prismaMock.lead.findUnique.mockResolvedValue(leadA);
      prismaMock.lead.update.mockResolvedValue({
        ...leadA,
        businessName: 'Admin Updated',
      });

      const adminUpdateData: LeadFormData = { businessName: 'Admin Updated' };
      const result = await updateLead('lead-a', adminUpdateData);

      expect(result.businessName).toBe('Admin Updated');
    });
  });

  describe('validation', () => {
    beforeEach(() => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);
      prismaMock.lead.findUnique.mockResolvedValue(
        createMockLead(userA.id, { id: 'lead-a' })
      );
    });

    it('should reject update with businessName too short', async () => {
      const shortNameData: LeadFormData = { businessName: 'A' };
      await expect(
        updateLead('lead-a', shortNameData)
      ).rejects.toThrow();
    });

    it('should reject update with invalid email', async () => {
      const invalidEmailData: LeadFormData = { businessName: 'Valid', email: 'invalid' };
      await expect(
        updateLead('lead-a', invalidEmailData)
      ).rejects.toThrow();
    });
  });

  describe('authentication', () => {
    it('should throw error when not authenticated', async () => {
      mockedGetServerSession.mockResolvedValue(null);

      const testData: LeadFormData = { businessName: 'Test' };
      await expect(
        updateLead('lead-a', testData)
      ).rejects.toThrow('Não autorizado');
    });
  });
});

// ============ DELETE LEAD TESTS ============

describe('Leads - deleteLead', () => {
  describe('successful deletion', () => {
    it('should delete own lead', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const leadA = createMockLead(userA.id, { id: 'lead-a' });
      prismaMock.lead.findUnique.mockResolvedValue(leadA);
      prismaMock.lead.delete.mockResolvedValue(leadA);

      await deleteLead('lead-a');

      expect(prismaMock.lead.delete).toHaveBeenCalledWith({
        where: { id: 'lead-a' },
      });
    });
  });

  describe('ownership verification', () => {
    it('should throw error when trying to delete other user lead', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const leadB = createMockLead(userB.id, { id: 'lead-b' });
      prismaMock.lead.findUnique.mockResolvedValue(leadB);

      await expect(deleteLead('lead-b')).rejects.toThrow('Lead não encontrado');
      expect(prismaMock.lead.delete).not.toHaveBeenCalled();
    });

    it('should throw error when lead does not exist', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      prismaMock.lead.findUnique.mockResolvedValue(null);

      await expect(deleteLead('non-existent')).rejects.toThrow('Lead não encontrado');
    });

    it('should allow admin to delete any lead', async () => {
      mockedGetServerSession.mockResolvedValue(sessionAdmin);

      const leadA = createMockLead(userA.id, { id: 'lead-a' });
      prismaMock.lead.findUnique.mockResolvedValue(leadA);
      prismaMock.lead.delete.mockResolvedValue(leadA);

      await deleteLead('lead-a');

      expect(prismaMock.lead.delete).toHaveBeenCalledWith({
        where: { id: 'lead-a' },
      });
    });
  });

  describe('converted lead protection', () => {
    it('should throw error when trying to delete converted lead', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const convertedLead = createMockLead(userA.id, { id: 'lead-a', convertedAt: new Date() });
      prismaMock.lead.findUnique.mockResolvedValue(convertedLead);

      await expect(deleteLead('lead-a')).rejects.toThrow(
        'Não é possível excluir um lead já convertido'
      );
      expect(prismaMock.lead.delete).not.toHaveBeenCalled();
    });
  });

  describe('authentication', () => {
    it('should throw error when not authenticated', async () => {
      mockedGetServerSession.mockResolvedValue(null);

      await expect(deleteLead('lead-a')).rejects.toThrow('Não autorizado');
    });
  });
});

// ============ CONVERT LEAD TO ORGANIZATION TESTS ============

describe('Leads - convertLeadToOrganization', () => {
  describe('successful conversion', () => {
    it('should convert lead with contacts to organization', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const lead = {
        ...createMockLead(userA.id, { id: 'lead-a', businessName: 'Tech Corp' }),
        leadContacts: [
          {
            id: 'contact-1',
            name: 'John Doe',
            email: 'john@techcorp.com',
            phone: null,
            whatsapp: null,
            role: 'CEO',
            isPrimary: true,
            leadId: 'lead-a',
            convertedToContactId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        contacts: [],
        activities: [],
        convertedAt: null,
      };

      const conversionResult = {
        organization: {
          id: 'org-new',
          name: 'Tech Corp',
          ownerId: userA.id,
        },
        contacts: [{ id: 'contact-new', name: 'John Doe' }],
        contactsFromLeadContacts: [{ id: 'contact-new', name: 'John Doe' }],
        activities: [],
      };

      prismaMock.lead.findUnique.mockResolvedValue(lead);
      // Mock the transaction to return the expected result directly
      prismaMock.$transaction.mockResolvedValue(conversionResult);

      const result = await convertLeadToOrganization('lead-a');

      expect(result).toHaveProperty('organization');
      expect(result).toHaveProperty('contacts');
    });
  });

  describe('ownership verification', () => {
    it('should throw error when trying to convert other user lead', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const leadB = {
        ...createMockLead(userB.id, { id: 'lead-b' }),
        leadContacts: [{ id: 'contact-1', name: 'Test' }],
        contacts: [],
        activities: [],
        convertedAt: null,
      };

      prismaMock.lead.findUnique.mockResolvedValue(leadB);

      await expect(convertLeadToOrganization('lead-b')).rejects.toThrow(
        'Lead não encontrado'
      );
    });

    it('should throw error when lead does not exist', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      prismaMock.lead.findUnique.mockResolvedValue(null);

      await expect(convertLeadToOrganization('non-existent')).rejects.toThrow(
        'Lead não encontrado'
      );
    });
  });

  describe('conversion prerequisites', () => {
    it('should throw error when lead has no contacts', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const lead = {
        ...createMockLead(userA.id, { id: 'lead-a' }),
        leadContacts: [], // No contacts
        contacts: [],
        activities: [],
        convertedAt: null,
      };

      prismaMock.lead.findUnique.mockResolvedValue(lead);

      await expect(convertLeadToOrganization('lead-a')).rejects.toThrow(
        'Lead precisa ter pelo menos um contato antes de ser convertido'
      );
    });

    it('should throw error when lead is already converted', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const lead = {
        ...createMockLead(userA.id, { id: 'lead-a' }),
        leadContacts: [{ id: 'contact-1', name: 'Test' }],
        contacts: [],
        activities: [],
        convertedAt: new Date(), // Already converted
      };

      prismaMock.lead.findUnique.mockResolvedValue(lead);

      await expect(convertLeadToOrganization('lead-a')).rejects.toThrow(
        'Lead já foi convertido'
      );
    });
  });

  describe('authentication', () => {
    it('should throw error when not authenticated', async () => {
      mockedGetServerSession.mockResolvedValue(null);

      await expect(convertLeadToOrganization('lead-a')).rejects.toThrow(
        'Não autorizado'
      );
    });
  });
});

// ============ EDGE CASES AND TRIANGULATION ============

describe('Leads - Edge Cases', () => {
  describe('triangulation - multiple users cannot access each other data', () => {
    it('User A cannot see User B leads', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);
      prismaMock.lead.findMany.mockResolvedValue([]);

      await getLeads();

      expect(prismaMock.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: userA.id,
          }),
        })
      );
    });

    it('User B cannot see User A leads', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserB);
      prismaMock.lead.findMany.mockResolvedValue([]);

      await getLeads();

      expect(prismaMock.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: userB.id,
          }),
        })
      );
    });

    it('User A cannot update User B lead', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);
      prismaMock.lead.findUnique.mockResolvedValue(
        createMockLead(userB.id, { id: 'lead-b' })
      );

      const hackedData: LeadFormData = { businessName: 'Hacked' };
      await expect(
        updateLead('lead-b', hackedData)
      ).rejects.toThrow('Lead não encontrado');
    });

    it('User B cannot update User A lead', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserB);
      prismaMock.lead.findUnique.mockResolvedValue(
        createMockLead(userA.id, { id: 'lead-a' })
      );

      const hackedData: LeadFormData = { businessName: 'Hacked' };
      await expect(
        updateLead('lead-a', hackedData)
      ).rejects.toThrow('Lead não encontrado');
    });

    it('User A cannot delete User B lead', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);
      prismaMock.lead.findUnique.mockResolvedValue(
        createMockLead(userB.id, { id: 'lead-b' })
      );

      await expect(deleteLead('lead-b')).rejects.toThrow('Lead não encontrado');
    });

    it('User B cannot delete User A lead', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserB);
      prismaMock.lead.findUnique.mockResolvedValue(
        createMockLead(userA.id, { id: 'lead-a' })
      );

      await expect(deleteLead('lead-a')).rejects.toThrow('Lead não encontrado');
    });
  });

  describe('empty states', () => {
    it('should return empty array when user has no leads', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);
      prismaMock.lead.findMany.mockResolvedValue([]);

      const leads = await getLeads();

      expect(leads).toEqual([]);
    });
  });

  describe('valid edge values', () => {
    beforeEach(() => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);
    });

    it('should accept businessName with exactly 2 characters (minimum)', async () => {
      const leadData = { businessName: 'AB' };
      prismaMock.lead.create.mockResolvedValue(
        createMockLead(userA.id, { businessName: 'AB' })
      );

      const result = await createLead(leadData);

      expect(result.businessName).toBe('AB');
    });

    it('should accept empty string for optional email', async () => {
      const leadData = { businessName: 'Test Company', email: '' };
      prismaMock.lead.create.mockResolvedValue(
        createMockLead(userA.id, { businessName: 'Test Company' })
      );

      await expect(createLead(leadData)).resolves.toBeDefined();
    });

    it('should accept valid status values', async () => {
      const statuses = ['new', 'contacted', 'qualified', 'disqualified'] as const;

      for (const status of statuses) {
        const leadData = { businessName: 'Test', status };
        prismaMock.lead.create.mockResolvedValue(
          createMockLead(userA.id, { businessName: 'Test', status })
        );

        await expect(createLead(leadData)).resolves.toBeDefined();
      }
    });

    it('should accept valid quality values', async () => {
      const qualities = ['cold', 'warm', 'hot'] as const;

      for (const quality of qualities) {
        const leadData = { businessName: 'Test', quality };
        prismaMock.lead.create.mockResolvedValue(
          createMockLead(userA.id, { businessName: 'Test' })
        );

        await expect(createLead(leadData)).resolves.toBeDefined();
      }
    });
  });
});
