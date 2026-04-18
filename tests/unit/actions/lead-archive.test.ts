import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { prismaMock } from '../../setup';
import { mockSession } from '../../fixtures/users';
import { mockLead, mockArchivedLead, mockConvertedLead } from '../../fixtures/leads';

const mockedGetServerSession = vi.mocked(getServerSession);

import { bulkArchiveLeads, getLeads } from '@/actions/leads';

describe('Lead Archive Feature', () => {
  beforeEach(() => {
    mockedGetServerSession.mockResolvedValue(mockSession);
    prismaMock.sharedEntity.findMany.mockResolvedValue([]);
    prismaMock.sharedEntity.findFirst.mockResolvedValue(null);
  });

  // ==========================================
  // bulkArchiveLeads
  // ==========================================
  describe('bulkArchiveLeads', () => {
    const anotherActiveLead = { ...mockLead, id: 'lead-test-2', businessName: 'Another Co' };

    it('should archive multiple leads at once', async () => {
      prismaMock.lead.findMany.mockResolvedValue([mockLead, anotherActiveLead]);
      prismaMock.lead.updateMany.mockResolvedValue({ count: 2 });

      const result = await bulkArchiveLeads([mockLead.id, anotherActiveLead.id]);

      expect(prismaMock.lead.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [mockLead.id, anotherActiveLead.id] } },
        data: {
          isArchived: true,
          archivedAt: expect.any(Date),
          archivedReason: null,
        },
      });
      expect(result).toEqual({ archived: 2, skipped: 0 });
    });

    it('should archive with a reason', async () => {
      prismaMock.lead.findMany.mockResolvedValue([mockLead]);
      prismaMock.lead.updateMany.mockResolvedValue({ count: 1 });

      await bulkArchiveLeads([mockLead.id], 'Cadência cancelada Q1 2026');

      expect(prismaMock.lead.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ archivedReason: 'Cadência cancelada Q1 2026' }),
        })
      );
    });

    it('should skip already-archived leads and report correct counts', async () => {
      // findMany returns only eligible (non-archived) leads
      prismaMock.lead.findMany.mockResolvedValue([mockLead]); // 1 of 2 eligible
      prismaMock.lead.updateMany.mockResolvedValue({ count: 1 });

      const result = await bulkArchiveLeads([mockLead.id, mockArchivedLead.id]);

      expect(result).toEqual({ archived: 1, skipped: 1 });
    });

    it('should skip converted leads', async () => {
      prismaMock.lead.findMany.mockResolvedValue([]); // converted lead filtered out
      prismaMock.lead.updateMany.mockResolvedValue({ count: 0 });

      const result = await bulkArchiveLeads([mockConvertedLead.id]);

      expect(prismaMock.lead.updateMany).not.toHaveBeenCalled();
      expect(result).toEqual({ archived: 0, skipped: 1 });
    });

    it('should throw if ids array is empty', async () => {
      await expect(bulkArchiveLeads([])).rejects.toThrow('Nenhum lead selecionado');
    });

    it('should throw if user is not authenticated', async () => {
      mockedGetServerSession.mockResolvedValue(null);
      await expect(bulkArchiveLeads([mockLead.id])).rejects.toThrow('Não autorizado');
    });

    it('should call revalidatePath after bulk archiving', async () => {
      prismaMock.lead.findMany.mockResolvedValue([mockLead]);
      prismaMock.lead.updateMany.mockResolvedValue({ count: 1 });

      await bulkArchiveLeads([mockLead.id]);

      expect(revalidatePath).toHaveBeenCalledWith('/leads');
    });

    it('should return all zeros when no eligible leads found', async () => {
      prismaMock.lead.findMany.mockResolvedValue([]);

      const result = await bulkArchiveLeads([mockArchivedLead.id]);

      expect(prismaMock.lead.updateMany).not.toHaveBeenCalled();
      expect(result).toEqual({ archived: 0, skipped: 1 });
    });
  });

  // ==========================================
  // getLeads - isArchived filter
  // ==========================================
  describe('getLeads - archive filtering', () => {
    it('should exclude archived leads by default', async () => {
      prismaMock.lead.findMany.mockResolvedValue([mockLead]);

      await getLeads({});

      expect(prismaMock.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isArchived: false }),
        })
      );
    });

    it('should return only archived leads when archived=yes', async () => {
      prismaMock.lead.findMany.mockResolvedValue([mockArchivedLead]);

      await getLeads({ archived: 'yes' });

      expect(prismaMock.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isArchived: true }),
        })
      );
    });

    it('should return all leads when archived=all', async () => {
      prismaMock.lead.findMany.mockResolvedValue([mockLead, mockArchivedLead]);

      await getLeads({ archived: 'all' });

      const call = prismaMock.lead.findMany.mock.calls[0][0];
      expect(call?.where).not.toHaveProperty('isArchived');
    });
  });
});
