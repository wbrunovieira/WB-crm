import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { prismaMock } from '../../setup';
import { mockSession, mockAdminSession } from '../../fixtures/users';
import { mockLead, mockArchivedLead, mockConvertedLead } from '../../fixtures/leads';

const mockedGetServerSession = vi.mocked(getServerSession);

// Import actions under test
import { archiveLead, unarchiveLead, getLeads } from '@/actions/leads';

describe('Lead Archive Feature', () => {
  beforeEach(() => {
    mockedGetServerSession.mockResolvedValue(mockSession);
    prismaMock.sharedEntity.findMany.mockResolvedValue([]);
    prismaMock.sharedEntity.findFirst.mockResolvedValue(null);
  });

  // ==========================================
  // archiveLead
  // ==========================================
  describe('archiveLead', () => {
    it('should archive an active lead', async () => {
      // Arrange
      prismaMock.lead.findFirst.mockResolvedValue(mockLead);
      prismaMock.lead.update.mockResolvedValue({ ...mockLead, isArchived: true });

      // Act
      const result = await archiveLead(mockLead.id);

      // Assert
      expect(prismaMock.lead.update).toHaveBeenCalledWith({
        where: { id: mockLead.id },
        data: { isArchived: true },
      });
      expect(result.isArchived).toBe(true);
    });

    it('should throw if lead is not found', async () => {
      // Arrange
      prismaMock.lead.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(archiveLead('nonexistent-id')).rejects.toThrow('Lead não encontrado');
    });

    it('should throw if lead is already archived', async () => {
      // Arrange
      prismaMock.lead.findFirst.mockResolvedValue(mockArchivedLead);

      // Act & Assert
      await expect(archiveLead(mockArchivedLead.id)).rejects.toThrow('Lead já está arquivado');
    });

    it('should throw if lead is already converted', async () => {
      // Arrange
      prismaMock.lead.findFirst.mockResolvedValue(mockConvertedLead);

      // Act & Assert
      await expect(archiveLead(mockConvertedLead.id)).rejects.toThrow('Lead já foi convertido');
    });

    it('should throw if user is not authenticated', async () => {
      // Arrange
      mockedGetServerSession.mockResolvedValue(null);

      // Act & Assert
      await expect(archiveLead(mockLead.id)).rejects.toThrow('Não autorizado');
    });

    it('should call revalidatePath after archiving', async () => {
      // Arrange
      prismaMock.lead.findFirst.mockResolvedValue(mockLead);
      prismaMock.lead.update.mockResolvedValue({ ...mockLead, isArchived: true });

      // Act
      await archiveLead(mockLead.id);

      // Assert
      expect(revalidatePath).toHaveBeenCalledWith('/leads');
      expect(revalidatePath).toHaveBeenCalledWith(`/leads/${mockLead.id}`);
    });
  });

  // ==========================================
  // unarchiveLead
  // ==========================================
  describe('unarchiveLead', () => {
    it('should unarchive an archived lead', async () => {
      // Arrange
      prismaMock.lead.findFirst.mockResolvedValue(mockArchivedLead);
      prismaMock.lead.update.mockResolvedValue({ ...mockArchivedLead, isArchived: false });

      // Act
      const result = await unarchiveLead(mockArchivedLead.id);

      // Assert
      expect(prismaMock.lead.update).toHaveBeenCalledWith({
        where: { id: mockArchivedLead.id },
        data: { isArchived: false },
      });
      expect(result.isArchived).toBe(false);
    });

    it('should throw if lead is not archived', async () => {
      // Arrange
      prismaMock.lead.findFirst.mockResolvedValue(mockLead);

      // Act & Assert
      await expect(unarchiveLead(mockLead.id)).rejects.toThrow('Lead não está arquivado');
    });

    it('should throw if lead is not found', async () => {
      // Arrange
      prismaMock.lead.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(unarchiveLead('nonexistent-id')).rejects.toThrow('Lead não encontrado');
    });

    it('should call revalidatePath after unarchiving', async () => {
      // Arrange
      prismaMock.lead.findFirst.mockResolvedValue(mockArchivedLead);
      prismaMock.lead.update.mockResolvedValue({ ...mockArchivedLead, isArchived: false });

      // Act
      await unarchiveLead(mockArchivedLead.id);

      // Assert
      expect(revalidatePath).toHaveBeenCalledWith('/leads');
      expect(revalidatePath).toHaveBeenCalledWith(`/leads/${mockArchivedLead.id}`);
    });
  });

  // ==========================================
  // getLeads - isArchived filter
  // ==========================================
  describe('getLeads - archive filtering', () => {
    it('should exclude archived leads by default', async () => {
      // Arrange
      prismaMock.lead.findMany.mockResolvedValue([mockLead]);

      // Act
      await getLeads({});

      // Assert
      expect(prismaMock.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isArchived: false,
          }),
        })
      );
    });

    it('should return only archived leads when archived=yes filter is set', async () => {
      // Arrange
      prismaMock.lead.findMany.mockResolvedValue([mockArchivedLead]);

      // Act
      await getLeads({ archived: 'yes' });

      // Assert
      expect(prismaMock.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isArchived: true,
          }),
        })
      );
    });

    it('should return all leads when archived=all filter is set', async () => {
      // Arrange
      prismaMock.lead.findMany.mockResolvedValue([mockLead, mockArchivedLead]);

      // Act
      await getLeads({ archived: 'all' });

      // Assert
      const call = prismaMock.lead.findMany.mock.calls[0][0];
      // Should NOT have isArchived filter
      expect(call?.where).not.toHaveProperty('isArchived');
    });
  });
});
