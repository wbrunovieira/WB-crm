/**
 * ICP Links Action Tests
 *
 * Tests for src/actions/icp-links.ts including:
 * - Linking Lead to ICP
 * - Linking Organization to ICP
 * - Unlinking Lead from ICP
 * - Unlinking Organization from ICP
 * - Getting ICPs for Lead/Organization
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
  createMockLead,
  createMockOrganization,
  createMockLeadICP,
  createMockOrganizationICP,
} from '../fixtures/multiple-users';

// Import Server Actions (will be created)
import {
  linkLeadToICP,
  linkOrganizationToICP,
  unlinkLeadFromICP,
  unlinkOrganizationFromICP,
  getLeadICPs,
  getOrganizationICPs,
  getICPLeads,
  getICPOrganizations,
} from '@/actions/icp-links';

const mockedGetServerSession = vi.mocked(getServerSession);

// Helper to create mock ICP
function createMockICP(ownerId: string, overrides?: Partial<{
  id: string;
  name: string;
  slug: string;
  content: string;
  status: string;
}>) {
  return {
    id: 'icp-test-id',
    name: 'Test ICP',
    slug: 'test-icp',
    content: 'Descrição do ICP...',
    status: 'active',
    ownerId,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

// ============ LINK LEAD TO ICP TESTS ============

describe('ICP Links - linkLeadToICP', () => {
  beforeEach(() => {
    mockedGetServerSession.mockResolvedValue(sessionUserA);
  });

  describe('successful linking', () => {
    it('should link lead to ICP', async () => {
      const lead = createMockLead(userA.id, { id: 'lead-1' });
      const icp = createMockICP(userA.id, { id: 'icp-1' });
      const link = createMockLeadICP('lead-1', 'icp-1');

      prismaMock.lead.findFirst.mockResolvedValue(lead);
      prismaMock.iCP.findFirst.mockResolvedValue(icp);
      prismaMock.leadICP.findUnique.mockResolvedValue(null); // Not already linked
      prismaMock.leadICP.create.mockResolvedValue(link);

      const result = await linkLeadToICP({
        leadId: 'lead-1',
        icpId: 'icp-1',
      });

      expect(result.leadId).toBe('lead-1');
      expect(result.icpId).toBe('icp-1');
    });

    it('should link lead to ICP with matchScore', async () => {
      const lead = createMockLead(userA.id, { id: 'lead-1' });
      const icp = createMockICP(userA.id, { id: 'icp-1' });
      const link = createMockLeadICP('lead-1', 'icp-1', { matchScore: 85 });

      prismaMock.lead.findFirst.mockResolvedValue(lead);
      prismaMock.iCP.findFirst.mockResolvedValue(icp);
      prismaMock.leadICP.findUnique.mockResolvedValue(null);
      prismaMock.leadICP.create.mockResolvedValue(link);

      const result = await linkLeadToICP({
        leadId: 'lead-1',
        icpId: 'icp-1',
        matchScore: 85,
      });

      expect(result.matchScore).toBe(85);
    });

    it('should link lead to ICP with notes', async () => {
      const lead = createMockLead(userA.id, { id: 'lead-1' });
      const icp = createMockICP(userA.id, { id: 'icp-1' });
      const link = createMockLeadICP('lead-1', 'icp-1', {
        notes: 'Excelente fit',
      });

      prismaMock.lead.findFirst.mockResolvedValue(lead);
      prismaMock.iCP.findFirst.mockResolvedValue(icp);
      prismaMock.leadICP.findUnique.mockResolvedValue(null);
      prismaMock.leadICP.create.mockResolvedValue(link);

      const result = await linkLeadToICP({
        leadId: 'lead-1',
        icpId: 'icp-1',
        notes: 'Excelente fit',
      });

      expect(result.notes).toBe('Excelente fit');
    });
  });

  describe('validation and errors', () => {
    it('should reject linking to non-existent lead', async () => {
      prismaMock.lead.findFirst.mockResolvedValue(null);

      await expect(
        linkLeadToICP({ leadId: 'non-existent', icpId: 'icp-1' })
      ).rejects.toThrow('Lead não encontrado');
    });

    it('should reject linking to non-existent ICP', async () => {
      const lead = createMockLead(userA.id, { id: 'lead-1' });

      prismaMock.lead.findFirst.mockResolvedValue(lead);
      prismaMock.iCP.findFirst.mockResolvedValue(null);

      await expect(
        linkLeadToICP({ leadId: 'lead-1', icpId: 'non-existent' })
      ).rejects.toThrow('ICP não encontrado');
    });

    it('should reject duplicate link', async () => {
      const lead = createMockLead(userA.id, { id: 'lead-1' });
      const icp = createMockICP(userA.id, { id: 'icp-1' });
      const existingLink = createMockLeadICP('lead-1', 'icp-1');

      prismaMock.lead.findFirst.mockResolvedValue(lead);
      prismaMock.iCP.findFirst.mockResolvedValue(icp);
      prismaMock.leadICP.findUnique.mockResolvedValue(existingLink);

      await expect(
        linkLeadToICP({ leadId: 'lead-1', icpId: 'icp-1' })
      ).rejects.toThrow('Lead já está vinculado a este ICP');
    });
  });
});

// ============ LINK ORGANIZATION TO ICP TESTS ============

describe('ICP Links - linkOrganizationToICP', () => {
  beforeEach(() => {
    mockedGetServerSession.mockResolvedValue(sessionUserA);
  });

  describe('successful linking', () => {
    it('should link organization to ICP', async () => {
      const org = createMockOrganization(userA.id, { id: 'org-1' });
      const icp = createMockICP(userA.id, { id: 'icp-1' });
      const link = createMockOrganizationICP('org-1', 'icp-1');

      prismaMock.organization.findFirst.mockResolvedValue(org);
      prismaMock.iCP.findFirst.mockResolvedValue(icp);
      prismaMock.organizationICP.findUnique.mockResolvedValue(null);
      prismaMock.organizationICP.create.mockResolvedValue(link);

      const result = await linkOrganizationToICP({
        organizationId: 'org-1',
        icpId: 'icp-1',
      });

      expect(result.organizationId).toBe('org-1');
      expect(result.icpId).toBe('icp-1');
    });

    it('should link organization to ICP with matchScore', async () => {
      const org = createMockOrganization(userA.id, { id: 'org-1' });
      const icp = createMockICP(userA.id, { id: 'icp-1' });
      const link = createMockOrganizationICP('org-1', 'icp-1', { matchScore: 90 });

      prismaMock.organization.findFirst.mockResolvedValue(org);
      prismaMock.iCP.findFirst.mockResolvedValue(icp);
      prismaMock.organizationICP.findUnique.mockResolvedValue(null);
      prismaMock.organizationICP.create.mockResolvedValue(link);

      const result = await linkOrganizationToICP({
        organizationId: 'org-1',
        icpId: 'icp-1',
        matchScore: 90,
      });

      expect(result.matchScore).toBe(90);
    });
  });

  describe('validation and errors', () => {
    it('should reject linking to non-existent organization', async () => {
      prismaMock.organization.findFirst.mockResolvedValue(null);

      await expect(
        linkOrganizationToICP({ organizationId: 'non-existent', icpId: 'icp-1' })
      ).rejects.toThrow('Organização não encontrada');
    });

    it('should reject duplicate link', async () => {
      const org = createMockOrganization(userA.id, { id: 'org-1' });
      const icp = createMockICP(userA.id, { id: 'icp-1' });
      const existingLink = createMockOrganizationICP('org-1', 'icp-1');

      prismaMock.organization.findFirst.mockResolvedValue(org);
      prismaMock.iCP.findFirst.mockResolvedValue(icp);
      prismaMock.organizationICP.findUnique.mockResolvedValue(existingLink);

      await expect(
        linkOrganizationToICP({ organizationId: 'org-1', icpId: 'icp-1' })
      ).rejects.toThrow('Organização já está vinculada a este ICP');
    });
  });
});

// ============ UNLINK LEAD FROM ICP TESTS ============

describe('ICP Links - unlinkLeadFromICP', () => {
  beforeEach(() => {
    mockedGetServerSession.mockResolvedValue(sessionUserA);
  });

  it('should unlink lead from ICP', async () => {
    const lead = createMockLead(userA.id, { id: 'lead-1' });
    const link = createMockLeadICP('lead-1', 'icp-1', { id: 'link-id' });

    prismaMock.lead.findFirst.mockResolvedValue(lead);
    prismaMock.leadICP.findUnique.mockResolvedValue(link);
    prismaMock.leadICP.delete.mockResolvedValue(link);

    await unlinkLeadFromICP('lead-1', 'icp-1');

    expect(prismaMock.leadICP.delete).toHaveBeenCalledWith({
      where: {
        leadId_icpId: {
          leadId: 'lead-1',
          icpId: 'icp-1',
        },
      },
    });
  });

  it('should throw error if link does not exist', async () => {
    const lead = createMockLead(userA.id, { id: 'lead-1' });

    prismaMock.lead.findFirst.mockResolvedValue(lead);
    prismaMock.leadICP.findUnique.mockResolvedValue(null);

    await expect(
      unlinkLeadFromICP('lead-1', 'icp-1')
    ).rejects.toThrow('Vínculo não encontrado');
  });
});

// ============ UNLINK ORGANIZATION FROM ICP TESTS ============

describe('ICP Links - unlinkOrganizationFromICP', () => {
  beforeEach(() => {
    mockedGetServerSession.mockResolvedValue(sessionUserA);
  });

  it('should unlink organization from ICP', async () => {
    const org = createMockOrganization(userA.id, { id: 'org-1' });
    const link = createMockOrganizationICP('org-1', 'icp-1', { id: 'link-id' });

    prismaMock.organization.findFirst.mockResolvedValue(org);
    prismaMock.organizationICP.findUnique.mockResolvedValue(link);
    prismaMock.organizationICP.delete.mockResolvedValue(link);

    await unlinkOrganizationFromICP('org-1', 'icp-1');

    expect(prismaMock.organizationICP.delete).toHaveBeenCalledWith({
      where: {
        organizationId_icpId: {
          organizationId: 'org-1',
          icpId: 'icp-1',
        },
      },
    });
  });
});

// ============ GET LEAD ICPs TESTS ============

describe('ICP Links - getLeadICPs', () => {
  beforeEach(() => {
    mockedGetServerSession.mockResolvedValue(sessionUserA);
  });

  it('should return ICPs linked to a lead', async () => {
    const lead = createMockLead(userA.id, { id: 'lead-1' });
    const links = [
      {
        ...createMockLeadICP('lead-1', 'icp-1', { matchScore: 85 }),
        icp: createMockICP(userA.id, { id: 'icp-1', name: 'ICP 1' }),
      },
      {
        ...createMockLeadICP('lead-1', 'icp-2', { matchScore: 70 }),
        icp: createMockICP(userA.id, { id: 'icp-2', name: 'ICP 2' }),
      },
    ];

    prismaMock.lead.findFirst.mockResolvedValue(lead);
    prismaMock.leadICP.findMany.mockResolvedValue(links);

    const result = await getLeadICPs('lead-1');

    expect(result).toHaveLength(2);
    expect(result[0].icp.name).toBe('ICP 1');
  });
});

// ============ GET ORGANIZATION ICPs TESTS ============

describe('ICP Links - getOrganizationICPs', () => {
  beforeEach(() => {
    mockedGetServerSession.mockResolvedValue(sessionUserA);
  });

  it('should return ICPs linked to an organization', async () => {
    const org = createMockOrganization(userA.id, { id: 'org-1' });
    const links = [
      {
        ...createMockOrganizationICP('org-1', 'icp-1'),
        icp: createMockICP(userA.id, { id: 'icp-1', name: 'ICP 1' }),
      },
    ];

    prismaMock.organization.findFirst.mockResolvedValue(org);
    prismaMock.organizationICP.findMany.mockResolvedValue(links);

    const result = await getOrganizationICPs('org-1');

    expect(result).toHaveLength(1);
  });
});

// ============ GET ICP LEADS/ORGANIZATIONS TESTS ============

describe('ICP Links - getICPLeads', () => {
  beforeEach(() => {
    mockedGetServerSession.mockResolvedValue(sessionUserA);
  });

  it('should return leads linked to an ICP', async () => {
    const icp = createMockICP(userA.id, { id: 'icp-1' });
    const links = [
      {
        ...createMockLeadICP('lead-1', 'icp-1'),
        lead: createMockLead(userA.id, { id: 'lead-1' }),
      },
      {
        ...createMockLeadICP('lead-2', 'icp-1'),
        lead: createMockLead(userA.id, { id: 'lead-2' }),
      },
    ];

    prismaMock.iCP.findFirst.mockResolvedValue(icp);
    prismaMock.leadICP.findMany.mockResolvedValue(links);

    const result = await getICPLeads('icp-1');

    expect(result).toHaveLength(2);
  });
});

describe('ICP Links - getICPOrganizations', () => {
  beforeEach(() => {
    mockedGetServerSession.mockResolvedValue(sessionUserA);
  });

  it('should return organizations linked to an ICP', async () => {
    const icp = createMockICP(userA.id, { id: 'icp-1' });
    const links = [
      {
        ...createMockOrganizationICP('org-1', 'icp-1'),
        organization: createMockOrganization(userA.id, { id: 'org-1' }),
      },
    ];

    prismaMock.iCP.findFirst.mockResolvedValue(icp);
    prismaMock.organizationICP.findMany.mockResolvedValue(links);

    const result = await getICPOrganizations('icp-1');

    expect(result).toHaveLength(1);
  });
});
