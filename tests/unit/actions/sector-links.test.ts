/**
 * Sector Link Action Tests — TDD
 *
 * Tests for sector ↔ lead and sector ↔ organization links in src/actions/sectors.ts
 * RULE: Fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { prismaMock } from '../../setup';
import { sessionUserA } from '../../fixtures/multiple-users';
import { mockSector, mockLeadSector, mockOrganizationSector } from '../../fixtures/sectors';
import { mockLead } from '../../fixtures/leads';

import {
  linkLeadToSector,
  unlinkLeadFromSector,
  getLeadSectors,
  linkOrganizationToSector,
  unlinkOrganizationFromSector,
  getOrganizationSectors,
} from '@/actions/sectors';

const mockedGetServerSession = vi.mocked(getServerSession);

const mockOrg = {
  id: 'org-test-1',
  ownerId: 'user-test-123',
  name: 'Test Org',
};

describe('Sector Link Actions', () => {
  beforeEach(() => {
    mockedGetServerSession.mockResolvedValue(sessionUserA);
    prismaMock.sharedEntity.findMany.mockResolvedValue([]);
    prismaMock.sharedEntity.findFirst.mockResolvedValue(null);
  });

  // ==========================================
  // linkLeadToSector
  // ==========================================
  describe('linkLeadToSector', () => {
    it('should create a LeadSector link', async () => {
      prismaMock.lead.findFirst.mockResolvedValue(mockLead);
      prismaMock.sector.findFirst.mockResolvedValue(mockSector);
      prismaMock.leadSector.findUnique.mockResolvedValue(null);
      prismaMock.leadSector.create.mockResolvedValue(mockLeadSector);

      await linkLeadToSector(mockLead.id, mockSector.id);

      expect(prismaMock.leadSector.create).toHaveBeenCalledWith({
        data: { leadId: mockLead.id, sectorId: mockSector.id },
      });
    });

    it('should throw if already linked', async () => {
      prismaMock.lead.findFirst.mockResolvedValue(mockLead);
      prismaMock.sector.findFirst.mockResolvedValue(mockSector);
      prismaMock.leadSector.findUnique.mockResolvedValue(mockLeadSector);

      await expect(linkLeadToSector(mockLead.id, mockSector.id)).rejects.toThrow('Lead já está vinculado a este setor');
    });

    it('should throw if lead not found', async () => {
      prismaMock.lead.findFirst.mockResolvedValue(null);
      await expect(linkLeadToSector('bad-lead', mockSector.id)).rejects.toThrow('Lead não encontrado');
    });

    it('should throw if sector not found', async () => {
      prismaMock.lead.findFirst.mockResolvedValue(mockLead);
      prismaMock.sector.findFirst.mockResolvedValue(null);
      await expect(linkLeadToSector(mockLead.id, 'bad-sector')).rejects.toThrow('Setor não encontrado');
    });

    it('should call revalidatePath after linking', async () => {
      prismaMock.lead.findFirst.mockResolvedValue(mockLead);
      prismaMock.sector.findFirst.mockResolvedValue(mockSector);
      prismaMock.leadSector.findUnique.mockResolvedValue(null);
      prismaMock.leadSector.create.mockResolvedValue(mockLeadSector);

      await linkLeadToSector(mockLead.id, mockSector.id);

      expect(revalidatePath).toHaveBeenCalledWith(`/leads/${mockLead.id}`);
    });

    it('should throw if not authenticated', async () => {
      mockedGetServerSession.mockResolvedValue(null);
      await expect(linkLeadToSector(mockLead.id, mockSector.id)).rejects.toThrow('Não autorizado');
    });
  });

  // ==========================================
  // unlinkLeadFromSector
  // ==========================================
  describe('unlinkLeadFromSector', () => {
    it('should delete the LeadSector link', async () => {
      prismaMock.leadSector.findUnique.mockResolvedValue(mockLeadSector);
      prismaMock.leadSector.delete.mockResolvedValue(mockLeadSector);

      await unlinkLeadFromSector(mockLead.id, mockSector.id);

      expect(prismaMock.leadSector.delete).toHaveBeenCalledWith({
        where: { leadId_sectorId: { leadId: mockLead.id, sectorId: mockSector.id } },
      });
    });

    it('should throw if link not found', async () => {
      prismaMock.leadSector.findUnique.mockResolvedValue(null);
      await expect(unlinkLeadFromSector(mockLead.id, mockSector.id)).rejects.toThrow('Vínculo não encontrado');
    });

    it('should call revalidatePath after unlinking', async () => {
      prismaMock.leadSector.findUnique.mockResolvedValue(mockLeadSector);
      prismaMock.leadSector.delete.mockResolvedValue(mockLeadSector);

      await unlinkLeadFromSector(mockLead.id, mockSector.id);

      expect(revalidatePath).toHaveBeenCalledWith(`/leads/${mockLead.id}`);
    });

    it('should throw if not authenticated', async () => {
      mockedGetServerSession.mockResolvedValue(null);
      await expect(unlinkLeadFromSector(mockLead.id, mockSector.id)).rejects.toThrow('Não autorizado');
    });
  });

  // ==========================================
  // getLeadSectors
  // ==========================================
  describe('getLeadSectors', () => {
    it('should return sectors for a lead', async () => {
      prismaMock.leadSector.findMany.mockResolvedValue([
        { ...mockLeadSector, sector: mockSector },
      ] as never[]);

      const result = await getLeadSectors(mockLead.id);

      expect(prismaMock.leadSector.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { leadId: mockLead.id },
          include: expect.objectContaining({ sector: true }),
        })
      );
      expect(result).toHaveLength(1);
    });

    it('should throw if not authenticated', async () => {
      mockedGetServerSession.mockResolvedValue(null);
      await expect(getLeadSectors(mockLead.id)).rejects.toThrow('Não autorizado');
    });
  });

  // ==========================================
  // linkOrganizationToSector
  // ==========================================
  describe('linkOrganizationToSector', () => {
    it('should create an OrganizationSector link', async () => {
      prismaMock.organization.findFirst.mockResolvedValue(mockOrg as never);
      prismaMock.sector.findFirst.mockResolvedValue(mockSector);
      prismaMock.organizationSector.findUnique.mockResolvedValue(null);
      prismaMock.organizationSector.create.mockResolvedValue(mockOrganizationSector);

      await linkOrganizationToSector(mockOrg.id, mockSector.id);

      expect(prismaMock.organizationSector.create).toHaveBeenCalledWith({
        data: { organizationId: mockOrg.id, sectorId: mockSector.id },
      });
    });

    it('should throw if already linked', async () => {
      prismaMock.organization.findFirst.mockResolvedValue(mockOrg as never);
      prismaMock.sector.findFirst.mockResolvedValue(mockSector);
      prismaMock.organizationSector.findUnique.mockResolvedValue(mockOrganizationSector);

      await expect(linkOrganizationToSector(mockOrg.id, mockSector.id)).rejects.toThrow('Organização já está vinculada a este setor');
    });

    it('should throw if organization not found', async () => {
      prismaMock.organization.findFirst.mockResolvedValue(null);
      await expect(linkOrganizationToSector('bad-org', mockSector.id)).rejects.toThrow('Organização não encontrada');
    });

    it('should throw if sector not found', async () => {
      prismaMock.organization.findFirst.mockResolvedValue(mockOrg as never);
      prismaMock.sector.findFirst.mockResolvedValue(null);
      await expect(linkOrganizationToSector(mockOrg.id, 'bad-sector')).rejects.toThrow('Setor não encontrado');
    });

    it('should call revalidatePath after linking', async () => {
      prismaMock.organization.findFirst.mockResolvedValue(mockOrg as never);
      prismaMock.sector.findFirst.mockResolvedValue(mockSector);
      prismaMock.organizationSector.findUnique.mockResolvedValue(null);
      prismaMock.organizationSector.create.mockResolvedValue(mockOrganizationSector);

      await linkOrganizationToSector(mockOrg.id, mockSector.id);

      expect(revalidatePath).toHaveBeenCalledWith(`/organizations/${mockOrg.id}`);
    });
  });

  // ==========================================
  // unlinkOrganizationFromSector
  // ==========================================
  describe('unlinkOrganizationFromSector', () => {
    it('should delete the OrganizationSector link', async () => {
      prismaMock.organizationSector.findUnique.mockResolvedValue(mockOrganizationSector);
      prismaMock.organizationSector.delete.mockResolvedValue(mockOrganizationSector);

      await unlinkOrganizationFromSector(mockOrg.id, mockSector.id);

      expect(prismaMock.organizationSector.delete).toHaveBeenCalledWith({
        where: { organizationId_sectorId: { organizationId: mockOrg.id, sectorId: mockSector.id } },
      });
    });

    it('should throw if link not found', async () => {
      prismaMock.organizationSector.findUnique.mockResolvedValue(null);
      await expect(unlinkOrganizationFromSector(mockOrg.id, mockSector.id)).rejects.toThrow('Vínculo não encontrado');
    });

    it('should call revalidatePath after unlinking', async () => {
      prismaMock.organizationSector.findUnique.mockResolvedValue(mockOrganizationSector);
      prismaMock.organizationSector.delete.mockResolvedValue(mockOrganizationSector);

      await unlinkOrganizationFromSector(mockOrg.id, mockSector.id);

      expect(revalidatePath).toHaveBeenCalledWith(`/organizations/${mockOrg.id}`);
    });

    it('should throw if not authenticated', async () => {
      mockedGetServerSession.mockResolvedValue(null);
      await expect(unlinkOrganizationFromSector(mockOrg.id, mockSector.id)).rejects.toThrow('Não autorizado');
    });
  });

  // ==========================================
  // getOrganizationSectors
  // ==========================================
  describe('getOrganizationSectors', () => {
    it('should return sectors for an organization', async () => {
      prismaMock.organizationSector.findMany.mockResolvedValue([
        { ...mockOrganizationSector, sector: mockSector },
      ] as never[]);

      const result = await getOrganizationSectors(mockOrg.id);

      expect(prismaMock.organizationSector.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: mockOrg.id },
          include: expect.objectContaining({ sector: true }),
        })
      );
      expect(result).toHaveLength(1);
    });

    it('should throw if not authenticated', async () => {
      mockedGetServerSession.mockResolvedValue(null);
      await expect(getOrganizationSectors(mockOrg.id)).rejects.toThrow('Não autorizado');
    });
  });
});
