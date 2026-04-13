import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { prismaMock } from '../../setup';
import { mockSession } from '../../fixtures/users';

const mockedGetServerSession = vi.mocked(getServerSession);

import {
  markActivityFailed,
  markActivitySkipped,
  revertActivityOutcome,
} from '@/actions/activities';

const baseActivity = {
  id: 'act-1',
  type: 'email' as const,
  subject: 'Enviar proposta',
  description: 'Corpo do email',
  dueDate: new Date('2024-12-31'),
  completed: false,
  completedAt: null,
  skippedAt: null,
  skipReason: null,
  failedAt: null,
  failReason: null,
  dealId: null,
  additionalDealIds: null,
  contactId: null,
  contactIds: null,
  leadContactIds: null,
  leadId: 'lead-1',
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

describe('markActivityFailed', () => {
  beforeEach(() => {
    mockedGetServerSession.mockResolvedValue(mockSession);
  });

  it('should mark an activity as failed with a reason', async () => {
    prismaMock.activity.findUnique.mockResolvedValue(baseActivity);
    prismaMock.activity.update.mockResolvedValue({
      ...baseActivity,
      failedAt: new Date(),
      failReason: 'Email voltou - endereço inválido',
    });

    const result = await markActivityFailed('act-1', 'Email voltou - endereço inválido');

    expect(prismaMock.activity.update).toHaveBeenCalledWith({
      where: { id: 'act-1' },
      data: {
        failedAt: expect.any(Date),
        failReason: 'Email voltou - endereço inválido',
      },
    });
    expect(result.failReason).toBe('Email voltou - endereço inválido');
  });

  it('should throw if activity not found', async () => {
    prismaMock.activity.findUnique.mockResolvedValue(null);

    await expect(
      markActivityFailed('nonexistent', 'reason')
    ).rejects.toThrow('Atividade não encontrada');
  });

  it('should throw if user cannot access the activity', async () => {
    prismaMock.activity.findUnique.mockResolvedValue({
      ...baseActivity,
      ownerId: 'other-user-id',
    });

    await expect(
      markActivityFailed('act-1', 'reason')
    ).rejects.toThrow('Atividade não encontrada');
  });

  it('should throw if activity is already completed', async () => {
    prismaMock.activity.findUnique.mockResolvedValue({
      ...baseActivity,
      completed: true,
    });

    await expect(
      markActivityFailed('act-1', 'reason')
    ).rejects.toThrow('já está concluída');
  });

  it('should throw if activity is already skipped', async () => {
    prismaMock.activity.findUnique.mockResolvedValue({
      ...baseActivity,
      skippedAt: new Date(),
      skipReason: 'Sem email',
    });

    await expect(
      markActivityFailed('act-1', 'reason')
    ).rejects.toThrow('já foi pulada');
  });

  it('should throw if activity is already failed', async () => {
    prismaMock.activity.findUnique.mockResolvedValue({
      ...baseActivity,
      failedAt: new Date(),
      failReason: 'Já falhou antes',
    });

    await expect(
      markActivityFailed('act-1', 'reason')
    ).rejects.toThrow('já foi marcada como falha');
  });

  it('should require a reason', async () => {
    await expect(
      markActivityFailed('act-1', '')
    ).rejects.toThrow('motivo');
  });

  it('should require a reason (whitespace only)', async () => {
    await expect(
      markActivityFailed('act-1', '   ')
    ).rejects.toThrow('motivo');
  });
});

describe('markActivitySkipped', () => {
  beforeEach(() => {
    mockedGetServerSession.mockResolvedValue(mockSession);
  });

  it('should mark an activity as skipped with a reason', async () => {
    prismaMock.activity.findUnique.mockResolvedValue(baseActivity);
    prismaMock.activity.update.mockResolvedValue({
      ...baseActivity,
      skippedAt: new Date(),
      skipReason: 'Contato não tem email cadastrado',
    });

    const result = await markActivitySkipped('act-1', 'Contato não tem email cadastrado');

    expect(prismaMock.activity.update).toHaveBeenCalledWith({
      where: { id: 'act-1' },
      data: {
        skippedAt: expect.any(Date),
        skipReason: 'Contato não tem email cadastrado',
      },
    });
    expect(result.skipReason).toBe('Contato não tem email cadastrado');
  });

  it('should throw if activity not found', async () => {
    prismaMock.activity.findUnique.mockResolvedValue(null);

    await expect(
      markActivitySkipped('nonexistent', 'reason')
    ).rejects.toThrow('Atividade não encontrada');
  });

  it('should throw if user cannot access the activity', async () => {
    prismaMock.activity.findUnique.mockResolvedValue({
      ...baseActivity,
      ownerId: 'other-user-id',
    });

    await expect(
      markActivitySkipped('act-1', 'reason')
    ).rejects.toThrow('Atividade não encontrada');
  });

  it('should throw if activity is already completed', async () => {
    prismaMock.activity.findUnique.mockResolvedValue({
      ...baseActivity,
      completed: true,
    });

    await expect(
      markActivitySkipped('act-1', 'reason')
    ).rejects.toThrow('já está concluída');
  });

  it('should throw if activity is already skipped', async () => {
    prismaMock.activity.findUnique.mockResolvedValue({
      ...baseActivity,
      skippedAt: new Date(),
      skipReason: 'Já pulada',
    });

    await expect(
      markActivitySkipped('act-1', 'reason')
    ).rejects.toThrow('já foi pulada');
  });

  it('should require a reason', async () => {
    await expect(
      markActivitySkipped('act-1', '')
    ).rejects.toThrow('motivo');
  });
});

describe('revertActivityOutcome', () => {
  beforeEach(() => {
    mockedGetServerSession.mockResolvedValue(mockSession);
  });

  it('should revert a failed activity back to pending', async () => {
    prismaMock.activity.findUnique.mockResolvedValue({
      ...baseActivity,
      failedAt: new Date(),
      failReason: 'Email voltou',
    });
    prismaMock.activity.update.mockResolvedValue({
      ...baseActivity,
    });

    await revertActivityOutcome('act-1');

    expect(prismaMock.activity.update).toHaveBeenCalledWith({
      where: { id: 'act-1' },
      data: {
        failedAt: null,
        failReason: null,
        skippedAt: null,
        skipReason: null,
      },
    });
  });

  it('should revert a skipped activity back to pending', async () => {
    prismaMock.activity.findUnique.mockResolvedValue({
      ...baseActivity,
      skippedAt: new Date(),
      skipReason: 'Sem email',
    });
    prismaMock.activity.update.mockResolvedValue({
      ...baseActivity,
    });

    await revertActivityOutcome('act-1');

    expect(prismaMock.activity.update).toHaveBeenCalledWith({
      where: { id: 'act-1' },
      data: {
        failedAt: null,
        failReason: null,
        skippedAt: null,
        skipReason: null,
      },
    });
  });

  it('should throw if activity is not failed or skipped', async () => {
    prismaMock.activity.findUnique.mockResolvedValue(baseActivity);

    await expect(
      revertActivityOutcome('act-1')
    ).rejects.toThrow('não está marcada como falha ou pulada');
  });

  it('should throw if activity not found', async () => {
    prismaMock.activity.findUnique.mockResolvedValue(null);

    await expect(
      revertActivityOutcome('act-1')
    ).rejects.toThrow('Atividade não encontrada');
  });
});
