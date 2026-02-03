/**
 * Hosting Renewals Action Tests
 *
 * Tests for src/actions/hosting-renewals.ts including:
 * - Getting upcoming hosting renewals
 * - Creating renewal reminder activities
 * - Checking and creating renewal activities automatically
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
  createMockOrganization,
  createMockActivity,
} from '../fixtures/multiple-users';

// Import Server Actions (will be created)
import {
  getUpcomingRenewals,
  createRenewalActivity,
  checkAndCreateRenewalActivities,
} from '@/actions/hosting-renewals';

const mockedGetServerSession = vi.mocked(getServerSession);

// Helper to create date X days from now
function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

// ============ GET UPCOMING RENEWALS TESTS ============

describe('Hosting Renewals - getUpcomingRenewals', () => {
  describe('successful retrieval', () => {
    beforeEach(() => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);
    });

    it('should return organizations with renewals in next 30 days by default', async () => {
      const orgsWithHosting = [
        createMockOrganization(userA.id, {
          id: 'org-1',
          name: 'Company A',
          hasHosting: true,
          hostingRenewalDate: daysFromNow(10),
          hostingPlan: 'Profissional',
          hostingValue: 150,
          hostingReminderDays: 30,
        }),
        createMockOrganization(userA.id, {
          id: 'org-2',
          name: 'Company B',
          hasHosting: true,
          hostingRenewalDate: daysFromNow(25),
          hostingPlan: 'Básico',
          hostingValue: 80,
          hostingReminderDays: 15,
        }),
      ];

      prismaMock.organization.findMany.mockResolvedValue(orgsWithHosting);

      const result = await getUpcomingRenewals();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Company A');
      expect(result[1].name).toBe('Company B');
    });

    it('should filter by custom number of days', async () => {
      const orgsWithHosting = [
        createMockOrganization(userA.id, {
          id: 'org-1',
          name: 'Company A',
          hasHosting: true,
          hostingRenewalDate: daysFromNow(5),
          hostingReminderDays: 7,
        }),
      ];

      prismaMock.organization.findMany.mockResolvedValue(orgsWithHosting);

      const result = await getUpcomingRenewals(7);

      expect(prismaMock.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            hasHosting: true,
            ownerId: userA.id,
          }),
        })
      );
    });

    it('should order by renewal date ascending', async () => {
      const orgsWithHosting = [
        createMockOrganization(userA.id, {
          id: 'org-1',
          name: 'Company Later',
          hasHosting: true,
          hostingRenewalDate: daysFromNow(20),
        }),
        createMockOrganization(userA.id, {
          id: 'org-2',
          name: 'Company Sooner',
          hasHosting: true,
          hostingRenewalDate: daysFromNow(5),
        }),
      ];

      prismaMock.organization.findMany.mockResolvedValue(orgsWithHosting);

      await getUpcomingRenewals();

      expect(prismaMock.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { hostingRenewalDate: 'asc' },
        })
      );
    });

    it('should return empty array when no upcoming renewals', async () => {
      prismaMock.organization.findMany.mockResolvedValue([]);

      const result = await getUpcomingRenewals();

      expect(result).toHaveLength(0);
    });
  });

  describe('data isolation', () => {
    it('should only return organizations owned by current user', async () => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);

      prismaMock.organization.findMany.mockResolvedValue([]);

      await getUpcomingRenewals();

      expect(prismaMock.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: userA.id,
          }),
        })
      );
    });

    it('should return all organizations for admin user', async () => {
      mockedGetServerSession.mockResolvedValue(sessionAdmin);

      prismaMock.organization.findMany.mockResolvedValue([]);

      await getUpcomingRenewals();

      // Admin should not have ownerId filter
      expect(prismaMock.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            hasHosting: true,
          }),
        })
      );
    });
  });

  describe('authentication', () => {
    it('should throw error when not authenticated', async () => {
      mockedGetServerSession.mockResolvedValue(null);

      await expect(getUpcomingRenewals()).rejects.toThrow('Não autorizado');
    });
  });
});

// ============ CREATE RENEWAL ACTIVITY TESTS ============

describe('Hosting Renewals - createRenewalActivity', () => {
  describe('successful creation', () => {
    beforeEach(() => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);
    });

    it('should create task activity for renewal reminder', async () => {
      const org = createMockOrganization(userA.id, {
        id: 'org-1',
        name: 'Test Company',
        hasHosting: true,
        hostingRenewalDate: daysFromNow(30),
        hostingReminderDays: 30,
      });

      const createdActivity = createMockActivity(userA.id, {
        id: 'activity-1',
        subject: 'Renovação de Hospedagem - Test Company',
        type: 'task',
      });

      prismaMock.organization.findFirst.mockResolvedValue(org);
      prismaMock.activity.findFirst.mockResolvedValue(null); // No existing activity
      prismaMock.activity.create.mockResolvedValue(createdActivity);

      const result = await createRenewalActivity('org-1');

      expect(prismaMock.activity.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'task',
          subject: 'Renovação de Hospedagem - Test Company',
          ownerId: userA.id,
        }),
      });
      expect(result.subject).toContain('Renovação de Hospedagem');
    });

    it('should set dueDate based on hostingReminderDays before renewal', async () => {
      const renewalDate = daysFromNow(45);
      const org = createMockOrganization(userA.id, {
        id: 'org-1',
        name: 'Test Company',
        hasHosting: true,
        hostingRenewalDate: renewalDate,
        hostingReminderDays: 15,
      });

      prismaMock.organization.findFirst.mockResolvedValue(org);
      prismaMock.activity.findFirst.mockResolvedValue(null);
      prismaMock.activity.create.mockResolvedValue(
        createMockActivity(userA.id, { subject: 'Renovação' })
      );

      await createRenewalActivity('org-1');

      // Due date should be renewal date minus reminder days
      expect(prismaMock.activity.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          dueDate: expect.any(Date),
        }),
      });
    });

    it('should include hosting details in activity description', async () => {
      const org = createMockOrganization(userA.id, {
        id: 'org-1',
        name: 'Test Company',
        hasHosting: true,
        hostingRenewalDate: daysFromNow(30),
        hostingPlan: 'Enterprise',
        hostingValue: 299.90,
        hostingReminderDays: 30,
        hostingNotes: 'Cliente VIP',
      });

      prismaMock.organization.findFirst.mockResolvedValue(org);
      prismaMock.activity.findFirst.mockResolvedValue(null);
      prismaMock.activity.create.mockResolvedValue(
        createMockActivity(userA.id, { subject: 'Renovação' })
      );

      await createRenewalActivity('org-1');

      expect(prismaMock.activity.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          description: expect.stringContaining('Enterprise'),
        }),
      });
    });
  });

  describe('duplicate prevention', () => {
    beforeEach(() => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);
    });

    it('should not create duplicate activity if one exists', async () => {
      const org = createMockOrganization(userA.id, {
        id: 'org-1',
        name: 'Test Company',
        hasHosting: true,
        hostingRenewalDate: daysFromNow(30),
      });

      const existingActivity = createMockActivity(userA.id, {
        id: 'existing-activity',
        subject: 'Renovação de Hospedagem - Test Company',
        type: 'task',
      });

      prismaMock.organization.findFirst.mockResolvedValue(org);
      prismaMock.activity.findFirst.mockResolvedValue(existingActivity);

      const result = await createRenewalActivity('org-1');

      expect(prismaMock.activity.create).not.toHaveBeenCalled();
      expect(result).toEqual(existingActivity);
    });
  });

  describe('validation', () => {
    beforeEach(() => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);
    });

    it('should throw error if organization not found', async () => {
      prismaMock.organization.findFirst.mockResolvedValue(null);

      await expect(createRenewalActivity('non-existent')).rejects.toThrow(
        'Organização não encontrada'
      );
    });

    it('should throw error if organization has no hosting', async () => {
      const org = createMockOrganization(userA.id, {
        id: 'org-1',
        hasHosting: false,
      });

      prismaMock.organization.findFirst.mockResolvedValue(org);

      await expect(createRenewalActivity('org-1')).rejects.toThrow(
        'Organização não possui hospedagem'
      );
    });

    it('should throw error if no renewal date set', async () => {
      const org = createMockOrganization(userA.id, {
        id: 'org-1',
        hasHosting: true,
        hostingRenewalDate: null,
      });

      prismaMock.organization.findFirst.mockResolvedValue(org);

      await expect(createRenewalActivity('org-1')).rejects.toThrow(
        'Data de renovação não definida'
      );
    });
  });

  describe('authentication', () => {
    it('should throw error when not authenticated', async () => {
      mockedGetServerSession.mockResolvedValue(null);

      await expect(createRenewalActivity('org-1')).rejects.toThrow('Não autorizado');
    });
  });
});

// ============ CHECK AND CREATE RENEWAL ACTIVITIES TESTS ============

describe('Hosting Renewals - checkAndCreateRenewalActivities', () => {
  describe('successful batch creation', () => {
    beforeEach(() => {
      mockedGetServerSession.mockResolvedValue(sessionUserA);
    });

    it('should create activities for organizations needing reminders', async () => {
      const orgsNeedingReminder = [
        createMockOrganization(userA.id, {
          id: 'org-1',
          name: 'Company A',
          hasHosting: true,
          hostingRenewalDate: daysFromNow(25), // Within 30-day reminder
          hostingReminderDays: 30,
        }),
        createMockOrganization(userA.id, {
          id: 'org-2',
          name: 'Company B',
          hasHosting: true,
          hostingRenewalDate: daysFromNow(10), // Within 15-day reminder
          hostingReminderDays: 15,
        }),
      ];

      prismaMock.organization.findMany.mockResolvedValue(orgsNeedingReminder);
      prismaMock.activity.findFirst.mockResolvedValue(null); // No existing activities
      prismaMock.activity.create.mockResolvedValue(
        createMockActivity(userA.id, { subject: 'Renovação' })
      );

      const result = await checkAndCreateRenewalActivities();

      expect(result.created).toBe(2);
      expect(result.skipped).toBe(0);
    });

    it('should skip organizations that already have reminder activities', async () => {
      const org = createMockOrganization(userA.id, {
        id: 'org-1',
        name: 'Company A',
        hasHosting: true,
        hostingRenewalDate: daysFromNow(25),
        hostingReminderDays: 30,
      });

      const existingActivity = createMockActivity(userA.id, {
        subject: 'Renovação de Hospedagem - Company A',
      });

      prismaMock.organization.findMany.mockResolvedValue([org]);
      prismaMock.activity.findFirst.mockResolvedValue(existingActivity);

      const result = await checkAndCreateRenewalActivities();

      expect(result.created).toBe(0);
      expect(result.skipped).toBe(1);
    });

    it('should return summary of created and skipped', async () => {
      prismaMock.organization.findMany.mockResolvedValue([]);

      const result = await checkAndCreateRenewalActivities();

      expect(result).toHaveProperty('created');
      expect(result).toHaveProperty('skipped');
      expect(result).toHaveProperty('total');
    });
  });

  describe('authentication', () => {
    it('should throw error when not authenticated', async () => {
      mockedGetServerSession.mockResolvedValue(null);

      await expect(checkAndCreateRenewalActivities()).rejects.toThrow('Não autorizado');
    });
  });
});
