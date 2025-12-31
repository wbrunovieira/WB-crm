/**
 * Tests for Pipeline View Server Actions
 *
 * REGRA FUNDAMENTAL: Quando um teste falha, corrija a IMPLEMENTAÇÃO, nunca o teste.
 * Os testes definem o comportamento esperado do sistema.
 *
 * Note: Pipeline view filters deals by ownerId - each user sees only their own deals.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import type { PrismaClient } from '@prisma/client';
import type { Session } from 'next-auth';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: mockDeep<PrismaClient>(),
}));

// Variable to control session mock
let mockSession: Session | null = null;

// Mock NextAuth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(() => Promise.resolve(mockSession)),
}));

// Import after mocks
import { prisma } from '@/lib/prisma';
import { getPipelineView } from '@/actions/pipeline-view';
import {
  sessionUserA,
  sessionUserB,
} from '../fixtures/multiple-users';

const mockPrisma = prisma as unknown as ReturnType<typeof mockDeep<PrismaClient>>;

// Helper to create mock pipeline with stages and deals
function createMockPipelineView(overrides: Partial<{
  id: string;
  name: string;
  isDefault: boolean;
  stages: Array<{
    id: string;
    name: string;
    order: number;
    probability: number;
    deals: Array<{
      id: string;
      title: string;
      value: number;
      ownerId: string;
      status: string;
      contact?: { id: string; name: string; email: string } | null;
      organization?: { id: string; name: string } | null;
      activities?: Array<{
        id: string;
        subject: string;
        type: string;
        dueDate: Date | null;
      }>;
    }>;
  }>;
}> = {}) {
  return {
    id: overrides.id || 'pipeline-1',
    name: overrides.name || 'Sales Pipeline',
    isDefault: overrides.isDefault ?? true,
    createdAt: new Date(),
    updatedAt: new Date(),
    stages: overrides.stages || [
      {
        id: 'stage-1',
        name: 'Qualification',
        order: 1,
        probability: 10,
        pipelineId: overrides.id || 'pipeline-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        deals: [],
      },
    ],
  };
}

describe('Pipeline View Actions', () => {
  beforeEach(() => {
    mockReset(mockPrisma);
    mockSession = null;
  });

  // ===========================================
  // getPipelineView Tests
  // ===========================================
  describe('getPipelineView', () => {
    it('should return default pipeline when no pipelineId provided', async () => {
      mockSession = sessionUserA;
      const pipeline = createMockPipelineView({
        id: 'pipeline-default',
        name: 'Default Sales',
        isDefault: true,
      });

      mockPrisma.pipeline.findFirst.mockResolvedValue(pipeline as any);

      const result = await getPipelineView();

      expect(result.id).toBe('pipeline-default');
      expect(result.name).toBe('Default Sales');
      expect(mockPrisma.pipeline.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isDefault: true },
        })
      );
    });

    it('should return specific pipeline when pipelineId provided', async () => {
      mockSession = sessionUserA;
      const pipeline = createMockPipelineView({
        id: 'pipeline-specific',
        name: 'Enterprise Pipeline',
        isDefault: false,
      });

      mockPrisma.pipeline.findUnique.mockResolvedValue(pipeline as any);

      const result = await getPipelineView('pipeline-specific');

      expect(result.id).toBe('pipeline-specific');
      expect(result.name).toBe('Enterprise Pipeline');
      expect(mockPrisma.pipeline.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pipeline-specific' },
        })
      );
    });

    it('should throw "Não autorizado" without session', async () => {
      mockSession = null;

      await expect(getPipelineView()).rejects.toThrow('Não autorizado');
    });

    it('should throw "Pipeline não encontrado" when pipeline does not exist', async () => {
      mockSession = sessionUserA;
      mockPrisma.pipeline.findFirst.mockResolvedValue(null);

      await expect(getPipelineView()).rejects.toThrow('Pipeline não encontrado');
    });

    it('should throw "Pipeline não encontrado" when specific pipeline does not exist', async () => {
      mockSession = sessionUserA;
      mockPrisma.pipeline.findUnique.mockResolvedValue(null);

      await expect(getPipelineView('non-existent')).rejects.toThrow('Pipeline não encontrado');
    });

    it('should filter deals by ownerId', async () => {
      mockSession = sessionUserA;
      const pipeline = createMockPipelineView({
        stages: [
          {
            id: 'stage-1',
            name: 'Qualification',
            order: 1,
            probability: 10,
            deals: [
              {
                id: 'deal-1',
                title: 'User A Deal',
                value: 1000,
                ownerId: sessionUserA.user.id,
                status: 'open',
              },
            ],
          },
        ],
      });

      mockPrisma.pipeline.findFirst.mockResolvedValue(pipeline as any);

      await getPipelineView();

      expect(mockPrisma.pipeline.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            stages: expect.objectContaining({
              include: expect.objectContaining({
                deals: expect.objectContaining({
                  where: {
                    ownerId: sessionUserA.user.id,
                    status: 'open',
                  },
                }),
              }),
            }),
          }),
        })
      );
    });

    it('should filter deals by status: open', async () => {
      mockSession = sessionUserA;
      mockPrisma.pipeline.findFirst.mockResolvedValue(createMockPipelineView() as any);

      await getPipelineView();

      expect(mockPrisma.pipeline.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            stages: expect.objectContaining({
              include: expect.objectContaining({
                deals: expect.objectContaining({
                  where: expect.objectContaining({
                    status: 'open',
                  }),
                }),
              }),
            }),
          }),
        })
      );
    });

    it('should include contact info with deals', async () => {
      mockSession = sessionUserA;
      const pipeline = createMockPipelineView({
        stages: [
          {
            id: 'stage-1',
            name: 'Qualification',
            order: 1,
            probability: 10,
            deals: [
              {
                id: 'deal-1',
                title: 'Deal with contact',
                value: 5000,
                ownerId: sessionUserA.user.id,
                status: 'open',
                contact: {
                  id: 'contact-1',
                  name: 'John Doe',
                  email: 'john@example.com',
                },
              },
            ],
          },
        ],
      });

      mockPrisma.pipeline.findFirst.mockResolvedValue(pipeline as any);

      const result = await getPipelineView();

      expect(result.stages[0].deals[0].contact).toEqual({
        id: 'contact-1',
        name: 'John Doe',
        email: 'john@example.com',
      });
    });

    it('should include organization info with deals', async () => {
      mockSession = sessionUserA;
      const pipeline = createMockPipelineView({
        stages: [
          {
            id: 'stage-1',
            name: 'Qualification',
            order: 1,
            probability: 10,
            deals: [
              {
                id: 'deal-1',
                title: 'Deal with org',
                value: 10000,
                ownerId: sessionUserA.user.id,
                status: 'open',
                organization: {
                  id: 'org-1',
                  name: 'Acme Corp',
                },
              },
            ],
          },
        ],
      });

      mockPrisma.pipeline.findFirst.mockResolvedValue(pipeline as any);

      const result = await getPipelineView();

      expect(result.stages[0].deals[0].organization).toEqual({
        id: 'org-1',
        name: 'Acme Corp',
      });
    });

    it('should include next pending activity with deals', async () => {
      mockSession = sessionUserA;
      const dueDate = new Date('2025-02-01');
      const pipeline = createMockPipelineView({
        stages: [
          {
            id: 'stage-1',
            name: 'Qualification',
            order: 1,
            probability: 10,
            deals: [
              {
                id: 'deal-1',
                title: 'Deal with activity',
                value: 2000,
                ownerId: sessionUserA.user.id,
                status: 'open',
                activities: [
                  {
                    id: 'activity-1',
                    subject: 'Follow up call',
                    type: 'call',
                    dueDate,
                  },
                ],
              },
            ],
          },
        ],
      });

      mockPrisma.pipeline.findFirst.mockResolvedValue(pipeline as any);

      const result = await getPipelineView();

      expect(result.stages[0].deals[0].activities).toHaveLength(1);
      expect(result.stages[0].deals[0].activities[0].subject).toBe('Follow up call');
    });

    it('should order stages by order ascending', async () => {
      mockSession = sessionUserA;
      mockPrisma.pipeline.findFirst.mockResolvedValue(createMockPipelineView() as any);

      await getPipelineView();

      expect(mockPrisma.pipeline.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            stages: expect.objectContaining({
              orderBy: { order: 'asc' },
            }),
          }),
        })
      );
    });

    it('should order deals by createdAt descending', async () => {
      mockSession = sessionUserA;
      mockPrisma.pipeline.findFirst.mockResolvedValue(createMockPipelineView() as any);

      await getPipelineView();

      expect(mockPrisma.pipeline.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            stages: expect.objectContaining({
              include: expect.objectContaining({
                deals: expect.objectContaining({
                  orderBy: { createdAt: 'desc' },
                }),
              }),
            }),
          }),
        })
      );
    });

    it('should limit activities to 1 (next pending)', async () => {
      mockSession = sessionUserA;
      mockPrisma.pipeline.findFirst.mockResolvedValue(createMockPipelineView() as any);

      await getPipelineView();

      expect(mockPrisma.pipeline.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            stages: expect.objectContaining({
              include: expect.objectContaining({
                deals: expect.objectContaining({
                  include: expect.objectContaining({
                    activities: expect.objectContaining({
                      take: 1,
                      where: { completed: false },
                    }),
                  }),
                }),
              }),
            }),
          }),
        })
      );
    });

    // Triangulation: User B sees only their own deals
    it('should filter deals by User B ownerId', async () => {
      mockSession = sessionUserB;
      mockPrisma.pipeline.findFirst.mockResolvedValue(createMockPipelineView() as any);

      await getPipelineView();

      expect(mockPrisma.pipeline.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            stages: expect.objectContaining({
              include: expect.objectContaining({
                deals: expect.objectContaining({
                  where: {
                    ownerId: sessionUserB.user.id,
                    status: 'open',
                  },
                }),
              }),
            }),
          }),
        })
      );
    });

    it('should return stages with empty deals array when no deals match', async () => {
      mockSession = sessionUserA;
      const pipeline = createMockPipelineView({
        stages: [
          {
            id: 'stage-1',
            name: 'Qualification',
            order: 1,
            probability: 10,
            deals: [],
          },
          {
            id: 'stage-2',
            name: 'Proposal',
            order: 2,
            probability: 30,
            deals: [],
          },
        ],
      });

      mockPrisma.pipeline.findFirst.mockResolvedValue(pipeline as any);

      const result = await getPipelineView();

      expect(result.stages).toHaveLength(2);
      expect(result.stages[0].deals).toEqual([]);
      expect(result.stages[1].deals).toEqual([]);
    });

    it('should return pipeline with multiple stages and deals', async () => {
      mockSession = sessionUserA;
      const pipeline = createMockPipelineView({
        stages: [
          {
            id: 'stage-1',
            name: 'Qualification',
            order: 1,
            probability: 10,
            deals: [
              { id: 'deal-1', title: 'Deal 1', value: 1000, ownerId: sessionUserA.user.id, status: 'open' },
              { id: 'deal-2', title: 'Deal 2', value: 2000, ownerId: sessionUserA.user.id, status: 'open' },
            ],
          },
          {
            id: 'stage-2',
            name: 'Proposal',
            order: 2,
            probability: 30,
            deals: [
              { id: 'deal-3', title: 'Deal 3', value: 5000, ownerId: sessionUserA.user.id, status: 'open' },
            ],
          },
          {
            id: 'stage-3',
            name: 'Negotiation',
            order: 3,
            probability: 60,
            deals: [],
          },
        ],
      });

      mockPrisma.pipeline.findFirst.mockResolvedValue(pipeline as any);

      const result = await getPipelineView();

      expect(result.stages).toHaveLength(3);
      expect(result.stages[0].deals).toHaveLength(2);
      expect(result.stages[1].deals).toHaveLength(1);
      expect(result.stages[2].deals).toHaveLength(0);
    });
  });
});
