/**
 * Tests for Activities Server Actions
 *
 * REGRA FUNDAMENTAL: Quando um teste falha, corrija a IMPLEMENTAÇÃO, nunca o teste.
 * Os testes definem o comportamento esperado do sistema.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import type { PrismaClient } from '@prisma/client';
import type { Session } from 'next-auth';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: mockDeep<PrismaClient>(),
}));

// Mock revalidatePath
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Variable to control session mock
let mockSession: Session | null = null;

// Mock NextAuth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(() => Promise.resolve(mockSession)),
}));

// Import after mocks
import { prisma } from '@/lib/prisma';
import {
  createActivity,
  getActivities,
  getActivityById,
  updateActivity,
  deleteActivity,
  toggleActivityCompleted,
  updateActivityDueDate,
} from '@/actions/activities';
import {
  userA,
  userB,
  adminUser,
  sessionUserA,
  sessionUserB,
  sessionAdmin,
  createMockActivity,
} from '../fixtures/multiple-users';

const mockPrisma = prisma as unknown as ReturnType<typeof mockDeep<PrismaClient>>;

describe('Activities Actions', () => {
  beforeEach(() => {
    mockReset(mockPrisma);
    mockSession = null;
  });

  // ===========================================
  // createActivity Tests
  // ===========================================
  describe('createActivity', () => {
    const validActivityData = {
      type: 'call' as const,
      subject: 'Follow-up call',
      description: 'Call to discuss proposal',
      dueDate: new Date('2025-02-01'),
      completed: false,
      dealId: null,
      contactId: null,
      contactIds: null,
      leadId: null,
      partnerId: null,
    };

    it('should create an activity with valid data', async () => {
      mockSession = sessionUserA;
      const createdActivity = {
        id: 'activity-1',
        ...validActivityData,
        ownerId: userA.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.activity.create.mockResolvedValue(createdActivity as any);

      const result = await createActivity(validActivityData);

      expect(result.id).toBe('activity-1');
      expect(result.subject).toBe('Follow-up call');
      expect(mockPrisma.activity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'call',
            subject: 'Follow-up call',
            ownerId: userA.id,
          }),
        })
      );
    });

    it('should throw error with invalid subject (too short)', async () => {
      mockSession = sessionUserA;

      const invalidData = { ...validActivityData, subject: 'A' };

      await expect(createActivity(invalidData)).rejects.toThrow();
    });

    it('should throw error with invalid type', async () => {
      mockSession = sessionUserA;

      const invalidData = { ...validActivityData, type: 'invalid' as any };

      await expect(createActivity(invalidData)).rejects.toThrow();
    });

    it('should set ownerId to current user', async () => {
      mockSession = sessionUserA;
      mockPrisma.activity.create.mockResolvedValue({
        id: 'activity-1',
        ...validActivityData,
        ownerId: userA.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await createActivity(validActivityData);

      expect(mockPrisma.activity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ownerId: userA.id,
          }),
        })
      );
    });

    // Test all activity types
    it.each([
      'call',
      'meeting',
      'email',
      'task',
      'whatsapp',
      'visit',
      'instagram',
    ] as const)('should create activity with type %s', async (type) => {
      mockSession = sessionUserA;
      const dataWithType = { ...validActivityData, type };
      mockPrisma.activity.create.mockResolvedValue({
        id: 'activity-1',
        ...dataWithType,
        ownerId: userA.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await createActivity(dataWithType);

      expect(mockPrisma.activity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type,
          }),
        })
      );
    });

    it('should create activity with dealId', async () => {
      mockSession = sessionUserA;
      const dataWithDeal = { ...validActivityData, dealId: 'deal-1' };
      mockPrisma.activity.create.mockResolvedValue({
        id: 'activity-1',
        ...dataWithDeal,
        ownerId: userA.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await createActivity(dataWithDeal);

      expect(mockPrisma.activity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dealId: 'deal-1',
          }),
        })
      );
    });

    it('should create activity with leadId', async () => {
      mockSession = sessionUserA;
      const dataWithLead = { ...validActivityData, leadId: 'lead-1' };
      mockPrisma.activity.create.mockResolvedValue({
        id: 'activity-1',
        ...dataWithLead,
        ownerId: userA.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await createActivity(dataWithLead);

      expect(mockPrisma.activity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            leadId: 'lead-1',
          }),
        })
      );
    });

    it('should create activity with partnerId', async () => {
      mockSession = sessionUserA;
      const dataWithPartner = { ...validActivityData, partnerId: 'partner-1' };
      mockPrisma.activity.create.mockResolvedValue({
        id: 'activity-1',
        ...dataWithPartner,
        ownerId: userA.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await createActivity(dataWithPartner);

      expect(mockPrisma.activity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            partnerId: 'partner-1',
          }),
        })
      );
    });

    it('should create activity with multiple contactIds', async () => {
      mockSession = sessionUserA;
      const dataWithContacts = {
        ...validActivityData,
        contactIds: ['contact-1', 'contact-2', 'contact-3'],
      };
      mockPrisma.activity.create.mockResolvedValue({
        id: 'activity-1',
        ...dataWithContacts,
        contactId: 'contact-1', // First contact becomes primary
        contactIds: JSON.stringify(['contact-1', 'contact-2', 'contact-3']),
        ownerId: userA.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await createActivity(dataWithContacts);

      expect(mockPrisma.activity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            contactId: 'contact-1', // First becomes primary
            contactIds: JSON.stringify(['contact-1', 'contact-2', 'contact-3']),
          }),
        })
      );
    });

    it('should throw "Não autorizado" without session', async () => {
      mockSession = null;

      await expect(createActivity(validActivityData)).rejects.toThrow('Não autorizado');
    });

    // Triangulation: User B can create their own activity
    it('should allow User B to create their own activity', async () => {
      mockSession = sessionUserB;
      mockPrisma.activity.create.mockResolvedValue({
        id: 'activity-2',
        ...validActivityData,
        ownerId: userB.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await createActivity(validActivityData);

      expect(mockPrisma.activity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ownerId: userB.id,
          }),
        })
      );
    });
  });

  // ===========================================
  // getActivities Tests
  // ===========================================
  describe('getActivities', () => {
    it('should filter activities by owner for non-admin user', async () => {
      mockSession = sessionUserA;
      const userAActivities = [
        createMockActivity(userA.id, { id: 'activity-1', subject: 'Call 1' }),
        createMockActivity(userA.id, { id: 'activity-2', subject: 'Call 2' }),
      ];

      mockPrisma.activity.findMany.mockResolvedValue(userAActivities as any);

      await getActivities({});

      expect(mockPrisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: userA.id,
          }),
        })
      );
    });

    it('should return all activities for admin user', async () => {
      mockSession = sessionAdmin;
      const allActivities = [
        createMockActivity(userA.id, { id: 'activity-1' }),
        createMockActivity(userB.id, { id: 'activity-2' }),
      ];

      mockPrisma.activity.findMany.mockResolvedValue(allActivities as any);

      await getActivities({});

      // Admin should not have ownerId filter
      const call = mockPrisma.activity.findMany.mock.calls[0][0];
      expect(call?.where?.ownerId).toBeUndefined();
    });

    it('should filter by type', async () => {
      mockSession = sessionUserA;
      mockPrisma.activity.findMany.mockResolvedValue([]);

      await getActivities({ type: 'meeting' });

      expect(mockPrisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: 'meeting',
          }),
        })
      );
    });

    it('should filter by completed status', async () => {
      mockSession = sessionUserA;
      mockPrisma.activity.findMany.mockResolvedValue([]);

      await getActivities({ completed: false });

      expect(mockPrisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            completed: false,
          }),
        })
      );
    });

    it('should filter by dealId', async () => {
      mockSession = sessionUserA;
      mockPrisma.activity.findMany.mockResolvedValue([]);

      await getActivities({ dealId: 'deal-1' });

      expect(mockPrisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dealId: 'deal-1',
          }),
        })
      );
    });

    it('should filter by contactId', async () => {
      mockSession = sessionUserA;
      mockPrisma.activity.findMany.mockResolvedValue([]);

      await getActivities({ contactId: 'contact-1' });

      expect(mockPrisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            contactId: 'contact-1',
          }),
        })
      );
    });

    it('should filter by leadId', async () => {
      mockSession = sessionUserA;
      mockPrisma.activity.findMany.mockResolvedValue([]);

      await getActivities({ leadId: 'lead-1' });

      expect(mockPrisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            leadId: 'lead-1',
          }),
        })
      );
    });

    it('should throw "Não autorizado" without session', async () => {
      mockSession = null;

      await expect(getActivities({})).rejects.toThrow('Não autorizado');
    });

    // Triangulation: User B sees only their activities
    it('should filter by User B ownerId when User B queries', async () => {
      mockSession = sessionUserB;
      mockPrisma.activity.findMany.mockResolvedValue([]);

      await getActivities({});

      expect(mockPrisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: userB.id,
          }),
        })
      );
    });
  });

  // ===========================================
  // getActivityById Tests
  // ===========================================
  describe('getActivityById', () => {
    it('should return activity owned by current user', async () => {
      mockSession = sessionUserA;
      const activity = createMockActivity(userA.id, { id: 'activity-1', subject: 'My Activity' });
      mockPrisma.activity.findFirst.mockResolvedValue(activity as any);

      const result = await getActivityById('activity-1');

      expect(result?.id).toBe('activity-1');
      expect(result?.subject).toBe('My Activity');
      expect(mockPrisma.activity.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'activity-1',
            ownerId: userA.id,
          }),
        })
      );
    });

    it('should return null when accessing activity owned by another user', async () => {
      mockSession = sessionUserA;
      // findFirst with ownerFilter returns null for records not owned by user
      mockPrisma.activity.findFirst.mockResolvedValue(null);

      const result = await getActivityById('activity-2');

      expect(result).toBeNull();
    });

    it('should return null for non-existent activity', async () => {
      mockSession = sessionUserA;
      mockPrisma.activity.findFirst.mockResolvedValue(null);

      const result = await getActivityById('non-existent');

      expect(result).toBeNull();
    });

    it('should allow admin to access any activity (no ownerId filter)', async () => {
      mockSession = sessionAdmin;
      const userAActivity = createMockActivity(userA.id, { id: 'activity-1', subject: 'User A Activity' });
      mockPrisma.activity.findFirst.mockResolvedValue(userAActivity as any);

      const result = await getActivityById('activity-1');

      expect(result?.id).toBe('activity-1');
      // Admin should not have ownerId filter
      const call = mockPrisma.activity.findFirst.mock.calls[0][0];
      expect(call?.where?.ownerId).toBeUndefined();
    });

    it('should throw "Não autorizado" without session', async () => {
      mockSession = null;

      await expect(getActivityById('activity-1')).rejects.toThrow('Não autorizado');
    });

    // Triangulation: User B can access their own activity
    it('should allow User B to access their own activity', async () => {
      mockSession = sessionUserB;
      const userBActivity = createMockActivity(userB.id, { id: 'activity-b', subject: 'User B Activity' });
      mockPrisma.activity.findFirst.mockResolvedValue(userBActivity as any);

      const result = await getActivityById('activity-b');

      expect(result?.id).toBe('activity-b');
    });

    // Triangulation: User B cannot access User A's activity - returns null
    it('should return null when User B tries to access User A activity', async () => {
      mockSession = sessionUserB;
      // findFirst with ownerFilter returns null for records not owned by user
      mockPrisma.activity.findFirst.mockResolvedValue(null);

      const result = await getActivityById('activity-a');

      expect(result).toBeNull();
    });
  });

  // ===========================================
  // updateActivity Tests
  // ===========================================
  describe('updateActivity', () => {
    const updateData = {
      type: 'meeting' as const,
      subject: 'Updated Activity',
      description: 'Updated description',
      dueDate: new Date('2025-03-01'),
      completed: false,
      dealId: null,
      contactId: null,
      contactIds: null,
      leadId: null,
      partnerId: null,
    };

    it('should update activity owned by current user', async () => {
      mockSession = sessionUserA;
      const existingActivity = createMockActivity(userA.id, { id: 'activity-1', subject: 'Old Subject' });
      mockPrisma.activity.findUnique.mockResolvedValue(existingActivity as any);
      mockPrisma.activity.update.mockResolvedValue({
        ...existingActivity,
        ...updateData,
      } as any);

      const result = await updateActivity('activity-1', updateData);

      expect(result.subject).toBe('Updated Activity');
      expect(mockPrisma.activity.update).toHaveBeenCalled();
    });

    it('should throw error when updating activity owned by another user', async () => {
      mockSession = sessionUserA;
      const otherUserActivity = createMockActivity(userB.id, { id: 'activity-2', subject: 'Not Mine' });
      mockPrisma.activity.findUnique.mockResolvedValue(otherUserActivity as any);

      await expect(updateActivity('activity-2', updateData)).rejects.toThrow('Atividade não encontrada');
    });

    it('should throw error for non-existent activity', async () => {
      mockSession = sessionUserA;
      mockPrisma.activity.findUnique.mockResolvedValue(null);

      await expect(updateActivity('non-existent', updateData)).rejects.toThrow('Atividade não encontrada');
    });

    it('should allow admin to update any activity', async () => {
      mockSession = sessionAdmin;
      const userAActivity = createMockActivity(userA.id, { id: 'activity-1', subject: 'User A Activity' });
      mockPrisma.activity.findUnique.mockResolvedValue(userAActivity as any);
      mockPrisma.activity.update.mockResolvedValue({
        ...userAActivity,
        ...updateData,
      } as any);

      const result = await updateActivity('activity-1', updateData);

      expect(result.subject).toBe('Updated Activity');
    });

    it('should throw validation error with invalid data', async () => {
      mockSession = sessionUserA;
      const existingActivity = createMockActivity(userA.id, { id: 'activity-1' });
      mockPrisma.activity.findUnique.mockResolvedValue(existingActivity as any);

      const invalidData = { ...updateData, subject: 'A' }; // Too short

      await expect(updateActivity('activity-1', invalidData)).rejects.toThrow();
    });

    it('should throw "Não autorizado" without session', async () => {
      mockSession = null;

      await expect(updateActivity('activity-1', updateData)).rejects.toThrow('Não autorizado');
    });

    // Triangulation: User B can update their own activity
    it('should allow User B to update their own activity', async () => {
      mockSession = sessionUserB;
      const userBActivity = createMockActivity(userB.id, { id: 'activity-b' });
      mockPrisma.activity.findUnique.mockResolvedValue(userBActivity as any);
      mockPrisma.activity.update.mockResolvedValue({
        ...userBActivity,
        ...updateData,
      } as any);

      const result = await updateActivity('activity-b', updateData);

      expect(result.subject).toBe('Updated Activity');
    });
  });

  // ===========================================
  // toggleActivityCompleted Tests
  // ===========================================
  describe('toggleActivityCompleted', () => {
    it('should toggle activity completed from false to true', async () => {
      mockSession = sessionUserA;
      const existingActivity = { ...createMockActivity(userA.id, { id: 'activity-1' }), completed: false };
      mockPrisma.activity.findUnique.mockResolvedValue(existingActivity as any);
      mockPrisma.activity.update.mockResolvedValue({
        ...existingActivity,
        completed: true,
      } as any);

      const result = await toggleActivityCompleted('activity-1');

      expect(result.completed).toBe(true);
      expect(mockPrisma.activity.update).toHaveBeenCalledWith({
        where: { id: 'activity-1' },
        data: { completed: true },
      });
    });

    it('should toggle activity completed from true to false', async () => {
      mockSession = sessionUserA;
      const existingActivity = { ...createMockActivity(userA.id, { id: 'activity-1' }), completed: true };
      mockPrisma.activity.findUnique.mockResolvedValue(existingActivity as any);
      mockPrisma.activity.update.mockResolvedValue({
        ...existingActivity,
        completed: false,
      } as any);

      const result = await toggleActivityCompleted('activity-1');

      expect(result.completed).toBe(false);
      expect(mockPrisma.activity.update).toHaveBeenCalledWith({
        where: { id: 'activity-1' },
        data: { completed: false },
      });
    });

    it('should throw error when toggling activity owned by another user', async () => {
      mockSession = sessionUserA;
      const otherUserActivity = createMockActivity(userB.id, { id: 'activity-2' });
      mockPrisma.activity.findUnique.mockResolvedValue(otherUserActivity as any);

      await expect(toggleActivityCompleted('activity-2')).rejects.toThrow('Atividade não encontrada');
    });

    it('should throw error for non-existent activity', async () => {
      mockSession = sessionUserA;
      mockPrisma.activity.findUnique.mockResolvedValue(null);

      await expect(toggleActivityCompleted('non-existent')).rejects.toThrow('Atividade não encontrada');
    });

    it('should allow admin to toggle any activity', async () => {
      mockSession = sessionAdmin;
      const userAActivity = { ...createMockActivity(userA.id, { id: 'activity-1' }), completed: false };
      mockPrisma.activity.findUnique.mockResolvedValue(userAActivity as any);
      mockPrisma.activity.update.mockResolvedValue({
        ...userAActivity,
        completed: true,
      } as any);

      const result = await toggleActivityCompleted('activity-1');

      expect(result.completed).toBe(true);
    });

    it('should throw "Não autorizado" without session', async () => {
      mockSession = null;

      await expect(toggleActivityCompleted('activity-1')).rejects.toThrow('Não autorizado');
    });

    // Triangulation: User B can toggle their own activity
    it('should allow User B to toggle their own activity', async () => {
      mockSession = sessionUserB;
      const userBActivity = { ...createMockActivity(userB.id, { id: 'activity-b' }), completed: false };
      mockPrisma.activity.findUnique.mockResolvedValue(userBActivity as any);
      mockPrisma.activity.update.mockResolvedValue({
        ...userBActivity,
        completed: true,
      } as any);

      const result = await toggleActivityCompleted('activity-b');

      expect(result.completed).toBe(true);
    });
  });

  // ===========================================
  // updateActivityDueDate Tests
  // ===========================================
  describe('updateActivityDueDate', () => {
    const newDueDate = new Date('2025-04-15');

    it('should update activity due date for owned activity', async () => {
      mockSession = sessionUserA;
      const existingActivity = createMockActivity(userA.id, { id: 'activity-1' });
      mockPrisma.activity.findUnique.mockResolvedValue(existingActivity as any);
      mockPrisma.activity.update.mockResolvedValue({
        ...existingActivity,
        dueDate: newDueDate,
      } as any);

      const result = await updateActivityDueDate('activity-1', newDueDate);

      expect(result.dueDate).toEqual(newDueDate);
      expect(mockPrisma.activity.update).toHaveBeenCalledWith({
        where: { id: 'activity-1' },
        data: { dueDate: newDueDate },
      });
    });

    it('should throw error when updating due date of activity owned by another user', async () => {
      mockSession = sessionUserA;
      const otherUserActivity = createMockActivity(userB.id, { id: 'activity-2' });
      mockPrisma.activity.findUnique.mockResolvedValue(otherUserActivity as any);

      await expect(updateActivityDueDate('activity-2', newDueDate)).rejects.toThrow('Atividade não encontrada');
    });

    it('should throw error for non-existent activity', async () => {
      mockSession = sessionUserA;
      mockPrisma.activity.findUnique.mockResolvedValue(null);

      await expect(updateActivityDueDate('non-existent', newDueDate)).rejects.toThrow('Atividade não encontrada');
    });

    it('should allow admin to update any activity due date', async () => {
      mockSession = sessionAdmin;
      const userAActivity = createMockActivity(userA.id, { id: 'activity-1' });
      mockPrisma.activity.findUnique.mockResolvedValue(userAActivity as any);
      mockPrisma.activity.update.mockResolvedValue({
        ...userAActivity,
        dueDate: newDueDate,
      } as any);

      const result = await updateActivityDueDate('activity-1', newDueDate);

      expect(result.dueDate).toEqual(newDueDate);
    });

    it('should throw "Não autorizado" without session', async () => {
      mockSession = null;

      await expect(updateActivityDueDate('activity-1', newDueDate)).rejects.toThrow('Não autorizado');
    });

    // Triangulation: User B can update due date of their own activity
    it('should allow User B to update due date of their own activity', async () => {
      mockSession = sessionUserB;
      const userBActivity = createMockActivity(userB.id, { id: 'activity-b' });
      mockPrisma.activity.findUnique.mockResolvedValue(userBActivity as any);
      mockPrisma.activity.update.mockResolvedValue({
        ...userBActivity,
        dueDate: newDueDate,
      } as any);

      const result = await updateActivityDueDate('activity-b', newDueDate);

      expect(result.dueDate).toEqual(newDueDate);
    });

    // Triangulation: User B cannot update due date of User A's activity
    it('should block User B from updating due date of User A activity', async () => {
      mockSession = sessionUserB;
      const userAActivity = createMockActivity(userA.id, { id: 'activity-a' });
      mockPrisma.activity.findUnique.mockResolvedValue(userAActivity as any);

      await expect(updateActivityDueDate('activity-a', newDueDate)).rejects.toThrow('Atividade não encontrada');
    });
  });

  // ===========================================
  // deleteActivity Tests
  // ===========================================
  describe('deleteActivity', () => {
    it('should delete activity owned by current user', async () => {
      mockSession = sessionUserA;
      const existingActivity = createMockActivity(userA.id, { id: 'activity-1' });
      mockPrisma.activity.findUnique.mockResolvedValue(existingActivity as any);
      mockPrisma.activity.delete.mockResolvedValue(existingActivity as any);

      await deleteActivity('activity-1');

      expect(mockPrisma.activity.delete).toHaveBeenCalledWith({
        where: { id: 'activity-1' },
      });
    });

    it('should throw error when deleting activity owned by another user', async () => {
      mockSession = sessionUserA;
      const otherUserActivity = createMockActivity(userB.id, { id: 'activity-2' });
      mockPrisma.activity.findUnique.mockResolvedValue(otherUserActivity as any);

      await expect(deleteActivity('activity-2')).rejects.toThrow('Atividade não encontrada');
    });

    it('should throw error for non-existent activity', async () => {
      mockSession = sessionUserA;
      mockPrisma.activity.findUnique.mockResolvedValue(null);

      await expect(deleteActivity('non-existent')).rejects.toThrow('Atividade não encontrada');
    });

    it('should allow admin to delete any activity', async () => {
      mockSession = sessionAdmin;
      const userAActivity = createMockActivity(userA.id, { id: 'activity-1' });
      mockPrisma.activity.findUnique.mockResolvedValue(userAActivity as any);
      mockPrisma.activity.delete.mockResolvedValue(userAActivity as any);

      await deleteActivity('activity-1');

      expect(mockPrisma.activity.delete).toHaveBeenCalled();
    });

    it('should throw "Não autorizado" without session', async () => {
      mockSession = null;

      await expect(deleteActivity('activity-1')).rejects.toThrow('Não autorizado');
    });

    // Triangulation: User B can delete their own activity
    it('should allow User B to delete their own activity', async () => {
      mockSession = sessionUserB;
      const userBActivity = createMockActivity(userB.id, { id: 'activity-b' });
      mockPrisma.activity.findUnique.mockResolvedValue(userBActivity as any);
      mockPrisma.activity.delete.mockResolvedValue(userBActivity as any);

      await deleteActivity('activity-b');

      expect(mockPrisma.activity.delete).toHaveBeenCalledWith({
        where: { id: 'activity-b' },
      });
    });

    // Triangulation: User B cannot delete User A's activity
    it('should block User B from deleting User A activity', async () => {
      mockSession = sessionUserB;
      const userAActivity = createMockActivity(userA.id, { id: 'activity-a' });
      mockPrisma.activity.findUnique.mockResolvedValue(userAActivity as any);

      await expect(deleteActivity('activity-a')).rejects.toThrow('Atividade não encontrada');
    });
  });
});
