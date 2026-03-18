import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { prismaMock } from '../../setup';
import { mockSession } from '../../fixtures/users';

const mockedGetServerSession = vi.mocked(getServerSession);

import { toggleActivityCompleted } from '@/actions/activities';

const baseActivity = {
  id: 'act-1',
  type: 'call' as const,
  subject: 'Ligar para lead',
  description: null,
  dueDate: new Date('2026-03-17'),
  completed: false,
  completedAt: null,
  failedAt: null,
  failReason: null,
  skippedAt: null,
  skipReason: null,
  dealId: null,
  contactId: null,
  contactIds: null,
  leadContactIds: null,
  leadId: 'lead-1',
  partnerId: null,
  ownerId: 'user-test-123',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

describe('toggleActivityCompleted - completedAt tracking', () => {
  beforeEach(() => {
    mockedGetServerSession.mockResolvedValue(mockSession);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-18T14:30:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should set completedAt to current date when completing', async () => {
    prismaMock.activity.findUnique.mockResolvedValue(baseActivity);
    prismaMock.activity.update.mockResolvedValue({ ...baseActivity, completed: true, completedAt: new Date() });
    prismaMock.leadCadenceActivity.findFirst.mockResolvedValue(null);

    await toggleActivityCompleted('act-1');

    expect(prismaMock.activity.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'act-1' },
        data: expect.objectContaining({
          completed: true,
          completedAt: new Date('2026-03-18T14:30:00Z'),
        }),
      })
    );
  });

  it('should set completedAt to null when uncompleting', async () => {
    const completedActivity = {
      ...baseActivity,
      completed: true,
      completedAt: new Date('2026-03-18T10:00:00Z'),
    };

    prismaMock.activity.findUnique.mockResolvedValue(completedActivity);
    prismaMock.activity.update.mockResolvedValue({ ...completedActivity, completed: false, completedAt: null });

    await toggleActivityCompleted('act-1');

    expect(prismaMock.activity.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'act-1' },
        data: expect.objectContaining({
          completed: false,
          completedAt: null,
        }),
      })
    );
  });
});
