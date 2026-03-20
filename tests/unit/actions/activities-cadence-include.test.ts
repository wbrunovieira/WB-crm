import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { prismaMock } from '../../setup';
import { mockSession } from '../../fixtures/users';

const mockedGetServerSession = vi.mocked(getServerSession);

import { getActivities } from '@/actions/activities';

describe('getActivities - cadence and ICP include', () => {
  beforeEach(() => {
    mockedGetServerSession.mockResolvedValue(mockSession);
  });

  it('should include cadence name and ICP name via cadenceActivity relation', async () => {
    const activitiesWithCadence = [
      {
        id: 'act-1',
        type: 'email',
        subject: 'Etapa 1 - Email',
        completed: false,
        completedAt: null,
        failedAt: null,
        failReason: null,
        skippedAt: null,
        skipReason: null,
        dueDate: new Date(),
        leadId: 'lead-1',
        dealId: null,
        contactId: null,
        partnerId: null,
        ownerId: 'user-test-123',
        deal: null,
        contact: null,
        lead: { id: 'lead-1', businessName: 'Test Lead', isArchived: false },
        partner: null,
        owner: { id: 'user-test-123', name: 'Test User', email: 'test@test.com' },
        cadenceActivity: {
          id: 'lca-1',
          leadCadence: {
            cadence: {
              id: 'cad-1',
              name: 'Cadência IFEE 14 dias',
              icp: {
                id: 'icp-1',
                name: 'Startup de Tech',
              },
            },
          },
        },
      },
      {
        id: 'act-2',
        type: 'call',
        subject: 'Ligação avulsa',
        completed: false,
        completedAt: null,
        failedAt: null,
        failReason: null,
        skippedAt: null,
        skipReason: null,
        dueDate: new Date(),
        leadId: null,
        dealId: 'deal-1',
        contactId: null,
        partnerId: null,
        ownerId: 'user-test-123',
        deal: { id: 'deal-1', title: 'Deal Test', organization: null },
        contact: null,
        lead: null,
        partner: null,
        owner: { id: 'user-test-123', name: 'Test User', email: 'test@test.com' },
        cadenceActivity: null, // not part of any cadence
      },
    ];

    prismaMock.activity.findMany.mockResolvedValue(activitiesWithCadence as never);

    const result = await getActivities();

    // Verify the include contains cadenceActivity with nested relations
    expect(prismaMock.activity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          cadenceActivity: {
            select: {
              id: true,
              leadCadence: {
                select: {
                  cadence: {
                    select: {
                      id: true,
                      name: true,
                      icp: {
                        select: {
                          id: true,
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        }),
      })
    );

    // First activity should have cadence info
    expect(result[0].cadenceActivity).toBeTruthy();
    expect(result[0].cadenceActivity?.leadCadence.cadence.name).toBe('Cadência IFEE 14 dias');
    expect(result[0].cadenceActivity?.leadCadence.cadence.icp?.name).toBe('Startup de Tech');

    // Second activity should have null cadenceActivity
    expect(result[1].cadenceActivity).toBeNull();
  });

  it('should include cadence info for activity with cadence but no ICP', async () => {
    const activitiesNoIcp = [
      {
        id: 'act-1',
        type: 'whatsapp',
        subject: 'WhatsApp followup',
        completed: false,
        completedAt: null,
        failedAt: null,
        failReason: null,
        skippedAt: null,
        skipReason: null,
        dueDate: new Date(),
        leadId: 'lead-1',
        dealId: null,
        contactId: null,
        partnerId: null,
        ownerId: 'user-test-123',
        deal: null,
        contact: null,
        lead: { id: 'lead-1', businessName: 'Test Lead', isArchived: false },
        partner: null,
        owner: { id: 'user-test-123', name: 'Test User', email: 'test@test.com' },
        cadenceActivity: {
          id: 'lca-1',
          leadCadence: {
            cadence: {
              id: 'cad-2',
              name: 'Cadência Genérica',
              icp: null,
            },
          },
        },
      },
    ];

    prismaMock.activity.findMany.mockResolvedValue(activitiesNoIcp as never);

    const result = await getActivities();

    expect(result[0].cadenceActivity?.leadCadence.cadence.name).toBe('Cadência Genérica');
    expect(result[0].cadenceActivity?.leadCadence.cadence.icp).toBeNull();
  });
});
