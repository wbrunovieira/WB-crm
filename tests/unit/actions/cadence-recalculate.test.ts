import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { prismaMock } from '../../setup';
import { mockSession } from '../../fixtures/users';
import { addDays } from 'date-fns';

const mockedGetServerSession = vi.mocked(getServerSession);

import { toggleActivityCompleted } from '@/actions/activities';

const baseActivity = {
  id: 'act-1',
  type: 'email' as const,
  subject: 'Etapa 1 - Email',
  description: null,
  dueDate: new Date('2026-03-10'), // was scheduled for March 10
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
  leadId: 'lead-1',
  organizationId: null,
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
  gotoDuration: null,
  callContactType: null,
  meetingNoShow: false,
  emailMessageId: null,
  emailSubject: null,
  emailThreadId: null,
  emailFromAddress: null,
  emailFromName: null,
  emailReplied: false,
  emailTrackingToken: null,
  emailOpenCount: 0,
  emailOpenedAt: null,
  emailLastOpenedAt: null,
  emailLinkClickCount: 0,
  emailLinkClickedAt: null,
  emailLastLinkClickedAt: null,
  ownerId: 'user-test-123',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

describe('toggleActivityCompleted - cadence date recalculation', () => {
  beforeEach(() => {
    mockedGetServerSession.mockResolvedValue(mockSession);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-18T12:00:00Z')); // "today" is March 18
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should recalculate subsequent cadence activity dates when completing late', async () => {
    // Activity from cadence step day 1 (scheduled March 10, completing March 18 = 8 days late)
    prismaMock.activity.findUnique.mockResolvedValue(baseActivity);
    prismaMock.activity.update.mockResolvedValue({ ...baseActivity, completed: true });

    // This activity belongs to a cadence
    const cadenceActivity = {
      id: 'lca-1',
      leadCadenceId: 'lc-1',
      cadenceStepId: 'step-1',
      activityId: 'act-1',
      scheduledDate: new Date('2026-03-10'),
      createdAt: new Date(),
      cadenceStep: { id: 'step-1', dayNumber: 1 },
    };

    prismaMock.leadCadenceActivity.findFirst.mockResolvedValue(cadenceActivity as never);

    // Subsequent activities in the same cadence (steps day 3, 5, 7)
    const subsequentActivities = [
      {
        id: 'lca-2',
        leadCadenceId: 'lc-1',
        cadenceStepId: 'step-2',
        activityId: 'act-2',
        scheduledDate: new Date('2026-03-12'), // day 3
        createdAt: new Date(),
        cadenceStep: { id: 'step-2', dayNumber: 3 },
        activity: {
          id: 'act-2',
          completed: false,
          failedAt: null,
          skippedAt: null,
          dueDate: new Date('2026-03-12'),
        },
      },
      {
        id: 'lca-3',
        leadCadenceId: 'lc-1',
        cadenceStepId: 'step-3',
        activityId: 'act-3',
        scheduledDate: new Date('2026-03-14'), // day 5
        createdAt: new Date(),
        cadenceStep: { id: 'step-3', dayNumber: 5 },
        activity: {
          id: 'act-3',
          completed: false,
          failedAt: null,
          skippedAt: null,
          dueDate: new Date('2026-03-14'),
        },
      },
      {
        id: 'lca-4',
        leadCadenceId: 'lc-1',
        cadenceStepId: 'step-4',
        activityId: 'act-4',
        scheduledDate: new Date('2026-03-16'), // day 7
        createdAt: new Date(),
        cadenceStep: { id: 'step-4', dayNumber: 7 },
        activity: {
          id: 'act-4',
          completed: false,
          failedAt: null,
          skippedAt: null,
          dueDate: new Date('2026-03-16'),
        },
      },
    ];

    prismaMock.leadCadenceActivity.findMany.mockResolvedValue(subsequentActivities as never);
    prismaMock.activity.update.mockResolvedValue({ ...baseActivity, completed: true });

    await toggleActivityCompleted('act-1');

    // The completed step is day 1, completed on March 18
    // Step day 3 → interval from day 1 = 2 days → March 18 + 2 = March 20
    // Step day 5 → interval from day 1 = 4 days → March 18 + 4 = March 22
    // Step day 7 → interval from day 1 = 6 days → March 18 + 6 = March 24

    // First call: complete the activity itself
    expect(prismaMock.activity.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'act-1' },
        data: { completed: true, completedAt: new Date('2026-03-18T12:00:00Z') },
      })
    );

    // Subsequent calls: update due dates
    expect(prismaMock.activity.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'act-2' },
        data: expect.objectContaining({
          dueDate: addDays(new Date('2026-03-18T12:00:00Z'), 2),
        }),
      })
    );

    expect(prismaMock.activity.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'act-3' },
        data: expect.objectContaining({
          dueDate: addDays(new Date('2026-03-18T12:00:00Z'), 4),
        }),
      })
    );

    expect(prismaMock.activity.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'act-4' },
        data: expect.objectContaining({
          dueDate: addDays(new Date('2026-03-18T12:00:00Z'), 6),
        }),
      })
    );
  });

  it('should not recalculate if activity is not part of a cadence', async () => {
    prismaMock.activity.findUnique.mockResolvedValue(baseActivity);
    prismaMock.activity.update.mockResolvedValue({ ...baseActivity, completed: true });
    prismaMock.leadCadenceActivity.findFirst.mockResolvedValue(null);

    await toggleActivityCompleted('act-1');

    // Only the toggle update, no date recalculations
    expect(prismaMock.activity.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.leadCadenceActivity.findMany).not.toHaveBeenCalled();
  });

  it('should not recalculate when uncompleting (toggling back to pending)', async () => {
    const completedActivity = { ...baseActivity, completed: true };
    prismaMock.activity.findUnique.mockResolvedValue(completedActivity);
    prismaMock.activity.update.mockResolvedValue({ ...completedActivity, completed: false });

    await toggleActivityCompleted('act-1');

    // Should not even check for cadence link
    expect(prismaMock.leadCadenceActivity.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.activity.update).toHaveBeenCalledTimes(1);
  });

  it('should skip already completed/failed/skipped activities in recalculation', async () => {
    prismaMock.activity.findUnique.mockResolvedValue(baseActivity);
    prismaMock.activity.update.mockResolvedValue({ ...baseActivity, completed: true });

    const cadenceActivity = {
      id: 'lca-1',
      leadCadenceId: 'lc-1',
      cadenceStepId: 'step-1',
      activityId: 'act-1',
      scheduledDate: new Date('2026-03-10'),
      createdAt: new Date(),
      cadenceStep: { id: 'step-1', dayNumber: 1 },
    };

    prismaMock.leadCadenceActivity.findFirst.mockResolvedValue(cadenceActivity as never);

    // One completed, one pending
    const subsequentActivities = [
      {
        id: 'lca-2',
        leadCadenceId: 'lc-1',
        cadenceStepId: 'step-2',
        activityId: 'act-2',
        scheduledDate: new Date('2026-03-12'),
        createdAt: new Date(),
        cadenceStep: { id: 'step-2', dayNumber: 3 },
        activity: {
          id: 'act-2',
          completed: true, // already completed
          failedAt: null,
          skippedAt: null,
          dueDate: new Date('2026-03-12'),
        },
      },
      {
        id: 'lca-3',
        leadCadenceId: 'lc-1',
        cadenceStepId: 'step-3',
        activityId: 'act-3',
        scheduledDate: new Date('2026-03-14'),
        createdAt: new Date(),
        cadenceStep: { id: 'step-3', dayNumber: 5 },
        activity: {
          id: 'act-3',
          completed: false, // pending → should be recalculated
          failedAt: null,
          skippedAt: null,
          dueDate: new Date('2026-03-14'),
        },
      },
    ];

    prismaMock.leadCadenceActivity.findMany.mockResolvedValue(subsequentActivities as never);
    prismaMock.activity.update.mockResolvedValue({ ...baseActivity, completed: true });

    await toggleActivityCompleted('act-1');

    // Toggle + only 1 recalculation (act-3, the pending one)
    expect(prismaMock.activity.update).toHaveBeenCalledTimes(2);

    // act-2 (completed) should NOT be updated
    expect(prismaMock.activity.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'act-2' } })
    );

    // act-3 (pending) should be updated: day 5 - day 1 = 4 days from now
    expect(prismaMock.activity.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'act-3' },
        data: expect.objectContaining({
          dueDate: addDays(new Date('2026-03-18T12:00:00Z'), 4),
        }),
      })
    );
  });

  it('should not recalculate if completed on time (same day)', async () => {
    // Scheduled for today (March 18), completing today → no delay
    const onTimeActivity = {
      ...baseActivity,
      dueDate: new Date('2026-03-18'),
    };

    prismaMock.activity.findUnique.mockResolvedValue(onTimeActivity);
    prismaMock.activity.update.mockResolvedValue({ ...onTimeActivity, completed: true });

    const cadenceActivity = {
      id: 'lca-1',
      leadCadenceId: 'lc-1',
      cadenceStepId: 'step-1',
      activityId: 'act-1',
      scheduledDate: new Date('2026-03-18'),
      createdAt: new Date(),
      cadenceStep: { id: 'step-1', dayNumber: 1 },
    };

    prismaMock.leadCadenceActivity.findFirst.mockResolvedValue(cadenceActivity as never);

    await toggleActivityCompleted('act-1');

    // Only the toggle, no recalculation needed (not late)
    expect(prismaMock.activity.update).toHaveBeenCalledTimes(1);
  });

  it('should recalculate even if only 1 day late', async () => {
    // Scheduled for March 17, completing March 18 → 1 day late, should recalculate
    const oneDayLateActivity = {
      ...baseActivity,
      dueDate: new Date('2026-03-17'),
    };

    prismaMock.activity.findUnique.mockResolvedValue(oneDayLateActivity);
    prismaMock.activity.update.mockResolvedValue({ ...oneDayLateActivity, completed: true });

    const cadenceActivity = {
      id: 'lca-1',
      leadCadenceId: 'lc-1',
      cadenceStepId: 'step-1',
      activityId: 'act-1',
      scheduledDate: new Date('2026-03-17'),
      createdAt: new Date(),
      cadenceStep: { id: 'step-1', dayNumber: 1 },
    };

    prismaMock.leadCadenceActivity.findFirst.mockResolvedValue(cadenceActivity as never);

    const subsequentActivities = [
      {
        id: 'lca-2',
        leadCadenceId: 'lc-1',
        cadenceStepId: 'step-2',
        activityId: 'act-2',
        scheduledDate: new Date('2026-03-19'),
        createdAt: new Date(),
        cadenceStep: { id: 'step-2', dayNumber: 3 },
        activity: {
          id: 'act-2',
          completed: false,
          failedAt: null,
          skippedAt: null,
          dueDate: new Date('2026-03-19'),
        },
      },
    ];

    prismaMock.leadCadenceActivity.findMany.mockResolvedValue(subsequentActivities as never);
    prismaMock.activity.update.mockResolvedValue({ ...oneDayLateActivity, completed: true });

    await toggleActivityCompleted('act-1');

    // Toggle + 1 recalculation
    expect(prismaMock.activity.update).toHaveBeenCalledTimes(2);

    // day 3 - day 1 = 2 days from now (March 18 + 2 = March 20)
    expect(prismaMock.activity.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'act-2' },
        data: expect.objectContaining({
          dueDate: addDays(new Date('2026-03-18T12:00:00Z'), 2),
        }),
      })
    );
  });
});
