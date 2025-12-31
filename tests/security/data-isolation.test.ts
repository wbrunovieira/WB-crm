/**
 * Data Isolation Tests
 *
 * CRITICAL: These tests verify that users can NEVER access data from other users.
 * This is the most important security test for a multi-user system.
 *
 * Strategy: Triangulation
 * - User A creates data, User B should NOT see it
 * - User A creates data, User A should see it
 * - User B creates data, User A should NOT see it
 * - Admin creates data, both should NOT see it (unless they are the owner)
 * - Admin CAN see all data when no filter is applied
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
  createMockDeal,
  createMockContact,
  createMockLead,
  createMockOrganization,
  createMockActivity,
  createMockPartner,
} from '../fixtures/multiple-users';

// Import actions to test
import { getDeals, getDealById, updateDeal, deleteDeal } from '@/actions/deals';
import { getContacts, getContactById, updateContact, deleteContact } from '@/actions/contacts';
import { getLeads, getLeadById, updateLead, deleteLead } from '@/actions/leads';
import { getOrganizations, getOrganizationById, updateOrganization, deleteOrganization } from '@/actions/organizations';
import { getActivities, getActivityById, updateActivity, deleteActivity } from '@/actions/activities';
import { getPartners, getPartnerById, updatePartner, deletePartner } from '@/actions/partners';

// Type for mocked getServerSession
const mockedGetServerSession = vi.mocked(getServerSession);

describe('Data Isolation - Deals', () => {
  describe('getDeals - List Isolation', () => {
    it('should return only deals owned by User A when User A is authenticated', async () => {
      // Arrange
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const dealUserA = createMockDeal(userA.id, { id: 'deal-a-1', title: 'Deal A' });
      const dealUserB = createMockDeal(userB.id, { id: 'deal-b-1', title: 'Deal B' });

      // Mock should be called with ownerId filter
      prismaMock.deal.findMany.mockResolvedValue([dealUserA]);

      // Act
      const result = await getDeals();

      // Assert
      expect(prismaMock.deal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: userA.id,
          }),
        })
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('deal-a-1');
    });

    it('should return only deals owned by User B when User B is authenticated', async () => {
      // Arrange - Triangulation: verify same behavior for different user
      mockedGetServerSession.mockResolvedValue(sessionUserB);

      const dealUserB = createMockDeal(userB.id, { id: 'deal-b-1', title: 'Deal B' });

      prismaMock.deal.findMany.mockResolvedValue([dealUserB]);

      // Act
      const result = await getDeals();

      // Assert
      expect(prismaMock.deal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: userB.id,
          }),
        })
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('deal-b-1');
    });

    it('should return empty array when user has no deals', async () => {
      // Arrange - Edge case: no data
      mockedGetServerSession.mockResolvedValue(sessionUserA);
      prismaMock.deal.findMany.mockResolvedValue([]);

      // Act
      const result = await getDeals();

      // Assert
      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });

    it('should allow admin to see all deals when no owner filter is applied', async () => {
      // Arrange
      mockedGetServerSession.mockResolvedValue(sessionAdmin);

      const dealUserA = createMockDeal(userA.id, { id: 'deal-a-1' });
      const dealUserB = createMockDeal(userB.id, { id: 'deal-b-1' });

      prismaMock.deal.findMany.mockResolvedValue([dealUserA, dealUserB]);

      // Act
      const result = await getDeals();

      // Assert - Admin without filter should NOT have ownerId in where clause
      expect(prismaMock.deal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            ownerId: expect.any(String),
          }),
        })
      );
      expect(result).toHaveLength(2);
    });

    it('should allow admin to filter by specific owner', async () => {
      // Arrange
      mockedGetServerSession.mockResolvedValue(sessionAdmin);

      const dealUserA = createMockDeal(userA.id, { id: 'deal-a-1' });

      prismaMock.deal.findMany.mockResolvedValue([dealUserA]);

      // Act
      const result = await getDeals({ owner: userA.id });

      // Assert
      expect(prismaMock.deal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: userA.id,
          }),
        })
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('getDealById - Single Record Isolation', () => {
    it('should return deal when User A requests their own deal', async () => {
      // Arrange
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const dealUserA = createMockDeal(userA.id, { id: 'deal-a-1' });

      prismaMock.deal.findFirst.mockResolvedValue(dealUserA);

      // Act
      const result = await getDealById('deal-a-1');

      // Assert
      expect(prismaMock.deal.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'deal-a-1',
            ownerId: userA.id,
          }),
        })
      );
      expect(result).not.toBeNull();
      expect(result?.id).toBe('deal-a-1');
    });

    it('should return null when User A requests User B deal', async () => {
      // Arrange - User A trying to access User B's deal
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      // The query includes ownerId filter, so it should return null
      prismaMock.deal.findFirst.mockResolvedValue(null);

      // Act
      const result = await getDealById('deal-b-1');

      // Assert
      expect(prismaMock.deal.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'deal-b-1',
            ownerId: userA.id,
          }),
        })
      );
      expect(result).toBeNull();
    });

    it('should return null for non-existent deal ID', async () => {
      // Arrange - Edge case: invalid ID
      mockedGetServerSession.mockResolvedValue(sessionUserA);
      prismaMock.deal.findFirst.mockResolvedValue(null);

      // Act
      const result = await getDealById('non-existent-id');

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for empty deal ID', async () => {
      // Arrange - Edge case: empty string
      mockedGetServerSession.mockResolvedValue(sessionUserA);
      prismaMock.deal.findFirst.mockResolvedValue(null);

      // Act
      const result = await getDealById('');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('updateDeal - Ownership Verification', () => {
    it('should allow User A to update their own deal', async () => {
      // Arrange
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const existingDeal = createMockDeal(userA.id, { id: 'deal-a-1' });
      const updatedDeal = { ...existingDeal, title: 'Updated Deal' };

      prismaMock.deal.findUnique.mockResolvedValue(existingDeal);
      prismaMock.deal.update.mockResolvedValue(updatedDeal);

      // Act
      const result = await updateDeal('deal-a-1', {
        title: 'Updated Deal',
        value: 10000,
        stageId: 'stage-1',
      });

      // Assert
      expect(prismaMock.deal.update).toHaveBeenCalled();
      expect(result.title).toBe('Updated Deal');
    });

    it('should throw error when User A tries to update User B deal', async () => {
      // Arrange
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      // Deal belongs to User B
      const dealUserB = createMockDeal(userB.id, { id: 'deal-b-1' });

      prismaMock.deal.findUnique.mockResolvedValue(dealUserB);

      // Act & Assert
      await expect(
        updateDeal('deal-b-1', {
          title: 'Hacked Deal',
          value: 10000,
          stageId: 'stage-1',
        })
      ).rejects.toThrow('Negócio não encontrado');

      // Verify update was never called
      expect(prismaMock.deal.update).not.toHaveBeenCalled();
    });

    it('should throw error when deal does not exist', async () => {
      // Arrange - Edge case: non-existent deal
      mockedGetServerSession.mockResolvedValue(sessionUserA);
      prismaMock.deal.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        updateDeal('non-existent', {
          title: 'Updated',
          value: 10000,
          stageId: 'stage-1',
        })
      ).rejects.toThrow('Negócio não encontrado');
    });
  });

  describe('deleteDeal - Ownership Verification', () => {
    it('should allow User A to delete their own deal', async () => {
      // Arrange
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const dealUserA = createMockDeal(userA.id, { id: 'deal-a-1' });

      prismaMock.deal.findUnique.mockResolvedValue(dealUserA);
      prismaMock.deal.delete.mockResolvedValue(dealUserA);

      // Act
      await deleteDeal('deal-a-1');

      // Assert
      expect(prismaMock.deal.delete).toHaveBeenCalledWith({
        where: { id: 'deal-a-1' },
      });
    });

    it('should throw error when User A tries to delete User B deal', async () => {
      // Arrange
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const dealUserB = createMockDeal(userB.id, { id: 'deal-b-1' });

      prismaMock.deal.findUnique.mockResolvedValue(dealUserB);

      // Act & Assert
      await expect(deleteDeal('deal-b-1')).rejects.toThrow('Negócio não encontrado');

      // Verify delete was never called
      expect(prismaMock.deal.delete).not.toHaveBeenCalled();
    });

    it('should throw error when deal does not exist', async () => {
      // Arrange
      mockedGetServerSession.mockResolvedValue(sessionUserA);
      prismaMock.deal.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(deleteDeal('non-existent')).rejects.toThrow('Negócio não encontrado');
    });
  });
});

describe('Data Isolation - Contacts', () => {
  describe('getContacts - List Isolation', () => {
    it('should return only contacts owned by User A when User A is authenticated', async () => {
      // Arrange
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const contactUserA = createMockContact(userA.id, { id: 'contact-a-1' });

      prismaMock.contact.findMany.mockResolvedValue([contactUserA]);

      // Act
      const result = await getContacts();

      // Assert
      expect(prismaMock.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: userA.id,
          }),
        })
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('contact-a-1');
    });

    it('should return only contacts owned by User B when User B is authenticated', async () => {
      // Arrange - Triangulation
      mockedGetServerSession.mockResolvedValue(sessionUserB);

      const contactUserB = createMockContact(userB.id, { id: 'contact-b-1' });

      prismaMock.contact.findMany.mockResolvedValue([contactUserB]);

      // Act
      const result = await getContacts();

      // Assert
      expect(prismaMock.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: userB.id,
          }),
        })
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('getContactById - Single Record Isolation', () => {
    it('should return contact when User A requests their own contact', async () => {
      // Arrange
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const contactUserA = createMockContact(userA.id, { id: 'contact-a-1' });

      prismaMock.contact.findFirst.mockResolvedValue(contactUserA);

      // Act
      const result = await getContactById('contact-a-1');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe('contact-a-1');
    });

    it('should return null when User A requests User B contact', async () => {
      // Arrange
      mockedGetServerSession.mockResolvedValue(sessionUserA);
      prismaMock.contact.findFirst.mockResolvedValue(null);

      // Act
      const result = await getContactById('contact-b-1');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('updateContact - Ownership Verification', () => {
    it('should throw error when User A tries to update User B contact', async () => {
      // Arrange
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const contactUserB = createMockContact(userB.id, { id: 'contact-b-1' });

      prismaMock.contact.findUnique.mockResolvedValue(contactUserB);

      // Act & Assert
      await expect(
        updateContact('contact-b-1', { name: 'Hacked' })
      ).rejects.toThrow('Contato não encontrado');

      expect(prismaMock.contact.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteContact - Ownership Verification', () => {
    it('should throw error when User A tries to delete User B contact', async () => {
      // Arrange
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const contactUserB = createMockContact(userB.id, { id: 'contact-b-1' });

      prismaMock.contact.findUnique.mockResolvedValue(contactUserB);

      // Act & Assert
      await expect(deleteContact('contact-b-1')).rejects.toThrow('Contato não encontrado');

      expect(prismaMock.contact.delete).not.toHaveBeenCalled();
    });
  });
});

describe('Data Isolation - Leads', () => {
  describe('getLeads - List Isolation', () => {
    it('should return only leads owned by User A when User A is authenticated', async () => {
      // Arrange
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const leadUserA = createMockLead(userA.id, { id: 'lead-a-1' });

      prismaMock.lead.findMany.mockResolvedValue([leadUserA]);

      // Act
      const result = await getLeads();

      // Assert
      expect(prismaMock.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: userA.id,
          }),
        })
      );
      expect(result).toHaveLength(1);
    });

    it('should return only leads owned by User B when User B is authenticated', async () => {
      // Arrange - Triangulation
      mockedGetServerSession.mockResolvedValue(sessionUserB);

      const leadUserB = createMockLead(userB.id, { id: 'lead-b-1' });

      prismaMock.lead.findMany.mockResolvedValue([leadUserB]);

      // Act
      const result = await getLeads();

      // Assert
      expect(prismaMock.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: userB.id,
          }),
        })
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('getLeadById - Single Record Isolation', () => {
    it('should return null when User A requests User B lead', async () => {
      // Arrange
      mockedGetServerSession.mockResolvedValue(sessionUserA);
      prismaMock.lead.findFirst.mockResolvedValue(null);

      // Act
      const result = await getLeadById('lead-b-1');

      // Assert
      expect(prismaMock.lead.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'lead-b-1',
            ownerId: userA.id,
          }),
        })
      );
      expect(result).toBeNull();
    });
  });

  describe('updateLead - Ownership Verification', () => {
    it('should throw error when User A tries to update User B lead', async () => {
      // Arrange
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const leadUserB = createMockLead(userB.id, { id: 'lead-b-1' });

      prismaMock.lead.findUnique.mockResolvedValue(leadUserB);

      // Act & Assert
      await expect(
        updateLead('lead-b-1', { businessName: 'Hacked' })
      ).rejects.toThrow('Lead não encontrado');

      expect(prismaMock.lead.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteLead - Ownership Verification', () => {
    it('should throw error when User A tries to delete User B lead', async () => {
      // Arrange
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const leadUserB = createMockLead(userB.id, { id: 'lead-b-1' });

      prismaMock.lead.findUnique.mockResolvedValue(leadUserB);

      // Act & Assert
      await expect(deleteLead('lead-b-1')).rejects.toThrow('Lead não encontrado');

      expect(prismaMock.lead.delete).not.toHaveBeenCalled();
    });
  });
});

describe('Data Isolation - Organizations', () => {
  describe('getOrganizations - List Isolation', () => {
    it('should return only organizations owned by User A when User A is authenticated', async () => {
      // Arrange
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const orgUserA = createMockOrganization(userA.id, { id: 'org-a-1' });

      prismaMock.organization.findMany.mockResolvedValue([orgUserA]);

      // Act
      const result = await getOrganizations();

      // Assert
      expect(prismaMock.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: userA.id,
          }),
        })
      );
      expect(result).toHaveLength(1);
    });

    it('should return only organizations owned by User B when User B is authenticated', async () => {
      // Arrange - Triangulation
      mockedGetServerSession.mockResolvedValue(sessionUserB);

      const orgUserB = createMockOrganization(userB.id, { id: 'org-b-1' });

      prismaMock.organization.findMany.mockResolvedValue([orgUserB]);

      // Act
      const result = await getOrganizations();

      // Assert
      expect(prismaMock.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: userB.id,
          }),
        })
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('updateOrganization - Ownership Verification', () => {
    it('should throw error when User A tries to update User B organization', async () => {
      // Arrange
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const orgUserB = createMockOrganization(userB.id, { id: 'org-b-1' });

      prismaMock.organization.findUnique.mockResolvedValue(orgUserB);

      // Act & Assert
      await expect(
        updateOrganization('org-b-1', { name: 'Hacked Org' })
      ).rejects.toThrow('Organização não encontrada');

      expect(prismaMock.organization.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteOrganization - Ownership Verification', () => {
    it('should throw error when User A tries to delete User B organization', async () => {
      // Arrange
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const orgUserB = createMockOrganization(userB.id, { id: 'org-b-1' });

      prismaMock.organization.findUnique.mockResolvedValue(orgUserB);

      // Act & Assert
      await expect(deleteOrganization('org-b-1')).rejects.toThrow('Organização não encontrada');

      expect(prismaMock.organization.delete).not.toHaveBeenCalled();
    });
  });
});

describe('Data Isolation - Activities', () => {
  describe('getActivities - List Isolation', () => {
    it('should return only activities owned by User A when User A is authenticated', async () => {
      // Arrange
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const activityUserA = createMockActivity(userA.id, { id: 'activity-a-1' });

      prismaMock.activity.findMany.mockResolvedValue([activityUserA]);

      // Act
      const result = await getActivities();

      // Assert
      expect(prismaMock.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: userA.id,
          }),
        })
      );
      expect(result).toHaveLength(1);
    });

    it('should return only activities owned by User B when User B is authenticated', async () => {
      // Arrange - Triangulation
      mockedGetServerSession.mockResolvedValue(sessionUserB);

      const activityUserB = createMockActivity(userB.id, { id: 'activity-b-1' });

      prismaMock.activity.findMany.mockResolvedValue([activityUserB]);

      // Act
      const result = await getActivities();

      // Assert
      expect(prismaMock.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: userB.id,
          }),
        })
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('updateActivity - Ownership Verification', () => {
    it('should throw error when User A tries to update User B activity', async () => {
      // Arrange
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const activityUserB = createMockActivity(userB.id, { id: 'activity-b-1' });

      prismaMock.activity.findUnique.mockResolvedValue(activityUserB);

      // Act & Assert
      await expect(
        updateActivity('activity-b-1', {
          type: 'call',
          subject: 'Hacked Activity',
        })
      ).rejects.toThrow('Atividade não encontrada');

      expect(prismaMock.activity.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteActivity - Ownership Verification', () => {
    it('should throw error when User A tries to delete User B activity', async () => {
      // Arrange
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const activityUserB = createMockActivity(userB.id, { id: 'activity-b-1' });

      prismaMock.activity.findUnique.mockResolvedValue(activityUserB);

      // Act & Assert
      await expect(deleteActivity('activity-b-1')).rejects.toThrow('Atividade não encontrada');

      expect(prismaMock.activity.delete).not.toHaveBeenCalled();
    });
  });
});

describe('Data Isolation - Partners', () => {
  describe('getPartners - List Isolation', () => {
    it('should return only partners owned by User A when User A is authenticated', async () => {
      // Arrange
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const partnerUserA = createMockPartner(userA.id, { id: 'partner-a-1' });

      prismaMock.partner.findMany.mockResolvedValue([partnerUserA]);

      // Act
      const result = await getPartners();

      // Assert
      expect(prismaMock.partner.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: userA.id,
          }),
        })
      );
      expect(result).toHaveLength(1);
    });

    it('should return only partners owned by User B when User B is authenticated', async () => {
      // Arrange - Triangulation
      mockedGetServerSession.mockResolvedValue(sessionUserB);

      const partnerUserB = createMockPartner(userB.id, { id: 'partner-b-1' });

      prismaMock.partner.findMany.mockResolvedValue([partnerUserB]);

      // Act
      const result = await getPartners();

      // Assert
      expect(prismaMock.partner.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: userB.id,
          }),
        })
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('updatePartner - Ownership Verification', () => {
    it('should throw error when User A tries to update User B partner', async () => {
      // Arrange
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const partnerUserB = createMockPartner(userB.id, { id: 'partner-b-1' });

      prismaMock.partner.findUnique.mockResolvedValue(partnerUserB);

      // Act & Assert
      await expect(
        updatePartner('partner-b-1', {
          name: 'Hacked Partner',
          partnerType: 'indicador',
        })
      ).rejects.toThrow('Parceiro não encontrado');

      expect(prismaMock.partner.update).not.toHaveBeenCalled();
    });
  });

  describe('deletePartner - Ownership Verification', () => {
    it('should throw error when User A tries to delete User B partner', async () => {
      // Arrange
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      const partnerUserB = createMockPartner(userB.id, { id: 'partner-b-1' });

      prismaMock.partner.findUnique.mockResolvedValue(partnerUserB);

      // Act & Assert
      await expect(deletePartner('partner-b-1')).rejects.toThrow('Parceiro não encontrado');

      expect(prismaMock.partner.delete).not.toHaveBeenCalled();
    });
  });
});

describe('Authentication Required', () => {
  beforeEach(() => {
    mockedGetServerSession.mockResolvedValue(null);
  });

  it('should throw error when accessing deals without authentication', async () => {
    await expect(getDeals()).rejects.toThrow('Não autorizado');
  });

  it('should throw error when accessing contacts without authentication', async () => {
    await expect(getContacts()).rejects.toThrow('Não autorizado');
  });

  it('should throw error when accessing leads without authentication', async () => {
    await expect(getLeads()).rejects.toThrow('Não autorizado');
  });

  it('should throw error when accessing organizations without authentication', async () => {
    await expect(getOrganizations()).rejects.toThrow('Não autorizado');
  });

  it('should throw error when accessing activities without authentication', async () => {
    await expect(getActivities()).rejects.toThrow('Não autorizado');
  });

  it('should throw error when accessing partners without authentication', async () => {
    await expect(getPartners()).rejects.toThrow('Não autorizado');
  });
});
