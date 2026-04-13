import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { prismaMock } from '../../setup';
import { mockSession } from '../../fixtures/users';
import { mockLead, mockLeadContact } from '../../fixtures/leads';

const mockedGetServerSession = vi.mocked(getServerSession);

import { assignLeadContactsToActivity, removeLeadContactsFromActivity } from '@/actions/activities';

const mockActivity = {
  id: 'activity-test-1',
  type: 'linkedin' as const,
  subject: 'Etapa 1 - LinkedIn',
  description: 'Enviar mensagem no LinkedIn',
  dueDate: new Date('2024-02-01'),
  completed: false,
  completedAt: null,
  failedAt: null,
  failReason: null,
  skippedAt: null,
  skipReason: null,
  dealId: null,
  additionalDealIds: null,
  contactId: null,
  contactIds: null,
  leadContactIds: null,
  leadId: 'lead-test-1',
  partnerId: null,
  gotoCallId: null,
  gotoRecordingId: null,
  gotoRecordingDriveId: null,
  gotoRecordingUrl: null,
  gotoRecordingUrl2: null,
  gotoTranscriptionJobId: null,
  gotoTranscriptionJobId2: null,
  gotoTranscriptText: null,
  gotoCallOutcome: null,
  emailMessageId: null,
  emailSubject: null,
  emailThreadId: null,
  emailFromAddress: null,
  emailFromName: null,
  emailReplied: false,
  ownerId: 'user-test-123',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockLeadContact2 = {
  id: 'lead-contact-2',
  leadId: 'lead-test-1',
  name: 'Maria Santos',
  role: 'CTO',
  email: 'maria@testcompany.com',
  phone: '+5511977777777',
  whatsapp: '+5511977777777',
  linkedin: 'in/mariasantos',
  instagram: '@mariasantos',
  isPrimary: false,
  isActive: true,
  languages: null,
  convertedToContactId: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

describe('Activity Lead Contacts Assignment', () => {
  beforeEach(() => {
    mockedGetServerSession.mockResolvedValue(mockSession);
  });

  // ==========================================
  // assignLeadContactsToActivity
  // ==========================================
  describe('assignLeadContactsToActivity', () => {
    it('should assign a single lead contact to an activity', async () => {
      // Arrange
      prismaMock.activity.findUnique.mockResolvedValue(mockActivity);
      prismaMock.leadContact.findMany.mockResolvedValue([mockLeadContact]);
      prismaMock.activity.update.mockResolvedValue({
        ...mockActivity,
        leadContactIds: JSON.stringify(['lead-contact-1']),
      });

      // Act
      const result = await assignLeadContactsToActivity(
        'activity-test-1',
        ['lead-contact-1']
      );

      // Assert
      expect(prismaMock.activity.update).toHaveBeenCalledWith({
        where: { id: 'activity-test-1' },
        data: { leadContactIds: JSON.stringify(['lead-contact-1']) },
      });
      expect(result.leadContactIds).toBe(JSON.stringify(['lead-contact-1']));
    });

    it('should assign multiple lead contacts to an activity', async () => {
      // Arrange
      prismaMock.activity.findUnique.mockResolvedValue(mockActivity);
      prismaMock.leadContact.findMany.mockResolvedValue([mockLeadContact, mockLeadContact2]);
      prismaMock.activity.update.mockResolvedValue({
        ...mockActivity,
        leadContactIds: JSON.stringify(['lead-contact-1', 'lead-contact-2']),
      });

      // Act
      const result = await assignLeadContactsToActivity(
        'activity-test-1',
        ['lead-contact-1', 'lead-contact-2']
      );

      // Assert
      expect(prismaMock.activity.update).toHaveBeenCalledWith({
        where: { id: 'activity-test-1' },
        data: { leadContactIds: JSON.stringify(['lead-contact-1', 'lead-contact-2']) },
      });
      expect(result.leadContactIds).toBe(JSON.stringify(['lead-contact-1', 'lead-contact-2']));
    });

    it('should throw if activity is not found', async () => {
      // Arrange
      prismaMock.activity.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        assignLeadContactsToActivity('nonexistent', ['lead-contact-1'])
      ).rejects.toThrow('Atividade não encontrada');
    });

    it('should throw if user is not authenticated', async () => {
      // Arrange
      mockedGetServerSession.mockResolvedValue(null);

      // Act & Assert
      await expect(
        assignLeadContactsToActivity('activity-test-1', ['lead-contact-1'])
      ).rejects.toThrow('Não autorizado');
    });

    it('should throw if activity has no lead linked', async () => {
      // Arrange
      prismaMock.activity.findUnique.mockResolvedValue({
        ...mockActivity,
        leadId: null,
      });

      // Act & Assert
      await expect(
        assignLeadContactsToActivity('activity-test-1', ['lead-contact-1'])
      ).rejects.toThrow('Atividade não está vinculada a um lead');
    });

    it('should throw if lead contacts do not belong to the activity lead', async () => {
      // Arrange
      prismaMock.activity.findUnique.mockResolvedValue(mockActivity);
      // Returns empty - contacts not found for this lead
      prismaMock.leadContact.findMany.mockResolvedValue([]);

      // Act & Assert
      await expect(
        assignLeadContactsToActivity('activity-test-1', ['wrong-contact-id'])
      ).rejects.toThrow('Contatos inválidos para este lead');
    });

    it('should throw if some lead contacts do not belong to the activity lead', async () => {
      // Arrange
      prismaMock.activity.findUnique.mockResolvedValue(mockActivity);
      // Only 1 of 2 found
      prismaMock.leadContact.findMany.mockResolvedValue([mockLeadContact]);

      // Act & Assert
      await expect(
        assignLeadContactsToActivity('activity-test-1', ['lead-contact-1', 'wrong-contact-id'])
      ).rejects.toThrow('Contatos inválidos para este lead');
    });

    it('should throw if user does not own the activity', async () => {
      // Arrange
      prismaMock.activity.findUnique.mockResolvedValue({
        ...mockActivity,
        ownerId: 'other-user-id',
      });

      // Act & Assert
      await expect(
        assignLeadContactsToActivity('activity-test-1', ['lead-contact-1'])
      ).rejects.toThrow('Atividade não encontrada');
    });
  });

  // ==========================================
  // removeLeadContactsFromActivity
  // ==========================================
  describe('removeLeadContactsFromActivity', () => {
    it('should remove all lead contacts from an activity', async () => {
      // Arrange
      prismaMock.activity.findUnique.mockResolvedValue({
        ...mockActivity,
        leadContactIds: JSON.stringify(['lead-contact-1', 'lead-contact-2']),
      });
      prismaMock.activity.update.mockResolvedValue({
        ...mockActivity,
        leadContactIds: null,
      });

      // Act
      const result = await removeLeadContactsFromActivity('activity-test-1');

      // Assert
      expect(prismaMock.activity.update).toHaveBeenCalledWith({
        where: { id: 'activity-test-1' },
        data: { leadContactIds: null },
      });
      expect(result.leadContactIds).toBeNull();
    });

    it('should throw if activity is not found', async () => {
      // Arrange
      prismaMock.activity.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        removeLeadContactsFromActivity('nonexistent')
      ).rejects.toThrow('Atividade não encontrada');
    });

    it('should throw if user is not authenticated', async () => {
      // Arrange
      mockedGetServerSession.mockResolvedValue(null);

      // Act & Assert
      await expect(
        removeLeadContactsFromActivity('activity-test-1')
      ).rejects.toThrow('Não autorizado');
    });
  });
});
