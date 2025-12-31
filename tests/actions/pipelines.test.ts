/**
 * Tests for Pipelines Server Actions
 *
 * REGRA FUNDAMENTAL: Quando um teste falha, corrija a IMPLEMENTAÇÃO, nunca o teste.
 * Os testes definem o comportamento esperado do sistema.
 *
 * Note: Pipelines are NOT user-scoped (no ownerId), but require authentication.
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
  getPipelines,
  getPipelineById,
  createPipeline,
  updatePipeline,
  deletePipeline,
  setDefaultPipeline,
} from '@/actions/pipelines';
import {
  sessionUserA,
  sessionUserB,
  sessionAdmin,
} from '../fixtures/multiple-users';

const mockPrisma = prisma as unknown as ReturnType<typeof mockDeep<PrismaClient>>;

// Helper to create mock pipeline
function createMockPipeline(overrides: Partial<{
  id: string;
  name: string;
  isDefault: boolean;
}> = {}) {
  return {
    id: overrides.id || `pipeline-${Date.now()}`,
    name: overrides.name || 'Sales Pipeline',
    isDefault: overrides.isDefault ?? false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('Pipelines Actions', () => {
  beforeEach(() => {
    mockReset(mockPrisma);
    mockSession = null;
  });

  // ===========================================
  // getPipelines Tests
  // ===========================================
  describe('getPipelines', () => {
    it('should return all pipelines when authenticated', async () => {
      mockSession = sessionUserA;
      const pipelines = [
        createMockPipeline({ id: 'pipeline-1', name: 'Sales', isDefault: true }),
        createMockPipeline({ id: 'pipeline-2', name: 'Enterprise' }),
      ];

      mockPrisma.pipeline.findMany.mockResolvedValue(pipelines as any);

      const result = await getPipelines();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Sales');
      expect(mockPrisma.pipeline.findMany).toHaveBeenCalled();
    });

    it('should throw "Não autorizado" without session', async () => {
      mockSession = null;

      await expect(getPipelines()).rejects.toThrow('Não autorizado');
    });

    it('should include stages count in response', async () => {
      mockSession = sessionUserA;
      const pipelines = [{
        ...createMockPipeline({ id: 'pipeline-1' }),
        stages: [],
        _count: { stages: 4 },
      }];

      mockPrisma.pipeline.findMany.mockResolvedValue(pipelines as any);

      await getPipelines();

      expect(mockPrisma.pipeline.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            stages: expect.any(Object),
            _count: expect.objectContaining({
              select: { stages: true },
            }),
          }),
        })
      );
    });

    // Triangulation: User B can also access pipelines
    it('should allow User B to access pipelines', async () => {
      mockSession = sessionUserB;
      mockPrisma.pipeline.findMany.mockResolvedValue([]);

      const result = await getPipelines();

      expect(result).toEqual([]);
      expect(mockPrisma.pipeline.findMany).toHaveBeenCalled();
    });
  });

  // ===========================================
  // getPipelineById Tests
  // ===========================================
  describe('getPipelineById', () => {
    it('should return pipeline by ID when authenticated', async () => {
      mockSession = sessionUserA;
      const pipeline = {
        ...createMockPipeline({ id: 'pipeline-1', name: 'Sales Pipeline' }),
        stages: [],
      };

      mockPrisma.pipeline.findUnique.mockResolvedValue(pipeline as any);

      const result = await getPipelineById('pipeline-1');

      expect(result?.id).toBe('pipeline-1');
      expect(result?.name).toBe('Sales Pipeline');
    });

    it('should return null for non-existent pipeline', async () => {
      mockSession = sessionUserA;
      mockPrisma.pipeline.findUnique.mockResolvedValue(null);

      const result = await getPipelineById('non-existent');

      expect(result).toBeNull();
    });

    it('should throw "Não autorizado" without session', async () => {
      mockSession = null;

      await expect(getPipelineById('pipeline-1')).rejects.toThrow('Não autorizado');
    });

    it('should include stages with deal counts', async () => {
      mockSession = sessionUserA;
      mockPrisma.pipeline.findUnique.mockResolvedValue({
        ...createMockPipeline({ id: 'pipeline-1' }),
        stages: [{
          id: 'stage-1',
          name: 'Qualification',
          order: 1,
          probability: 10,
          _count: { deals: 5 },
        }],
      } as any);

      await getPipelineById('pipeline-1');

      expect(mockPrisma.pipeline.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pipeline-1' },
          include: expect.objectContaining({
            stages: expect.objectContaining({
              include: expect.objectContaining({
                _count: { select: { deals: true } },
              }),
            }),
          }),
        })
      );
    });
  });

  // ===========================================
  // createPipeline Tests
  // ===========================================
  describe('createPipeline', () => {
    const validPipelineData = {
      name: 'New Pipeline',
      isDefault: false,
    };

    it('should create a pipeline with default stages', async () => {
      mockSession = sessionUserA;
      const createdPipeline = {
        ...createMockPipeline({ id: 'pipeline-1', name: 'New Pipeline' }),
        stages: [
          { id: 'stage-1', name: 'Qualificação', order: 1, probability: 10 },
          { id: 'stage-2', name: 'Proposta', order: 2, probability: 30 },
          { id: 'stage-3', name: 'Negociação', order: 3, probability: 60 },
          { id: 'stage-4', name: 'Fechamento', order: 4, probability: 90 },
        ],
      };

      mockPrisma.pipeline.create.mockResolvedValue(createdPipeline as any);

      const result = await createPipeline(validPipelineData);

      expect(result.id).toBe('pipeline-1');
      expect(result.stages).toHaveLength(4);
      expect(mockPrisma.pipeline.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'New Pipeline',
            stages: expect.objectContaining({
              create: expect.arrayContaining([
                expect.objectContaining({ name: 'Qualificação', order: 1 }),
                expect.objectContaining({ name: 'Proposta', order: 2 }),
                expect.objectContaining({ name: 'Negociação', order: 3 }),
                expect.objectContaining({ name: 'Fechamento', order: 4 }),
              ]),
            }),
          }),
        })
      );
    });

    it('should throw error with invalid name (too short)', async () => {
      mockSession = sessionUserA;

      const invalidData = { name: 'A', isDefault: false };

      await expect(createPipeline(invalidData)).rejects.toThrow();
    });

    it('should unset other defaults when creating as default', async () => {
      mockSession = sessionUserA;
      mockPrisma.pipeline.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.pipeline.create.mockResolvedValue({
        ...createMockPipeline({ id: 'pipeline-1', isDefault: true }),
        stages: [],
      } as any);

      await createPipeline({ name: 'Default Pipeline', isDefault: true });

      expect(mockPrisma.pipeline.updateMany).toHaveBeenCalledWith({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    });

    it('should throw "Não autorizado" without session', async () => {
      mockSession = null;

      await expect(createPipeline(validPipelineData)).rejects.toThrow('Não autorizado');
    });

    // Triangulation: User B can create pipeline
    it('should allow User B to create pipeline', async () => {
      mockSession = sessionUserB;
      mockPrisma.pipeline.create.mockResolvedValue({
        ...createMockPipeline({ id: 'pipeline-2', name: 'User B Pipeline' }),
        stages: [],
      } as any);

      const result = await createPipeline({ name: 'User B Pipeline' });

      expect(result.name).toBe('User B Pipeline');
    });
  });

  // ===========================================
  // updatePipeline Tests
  // ===========================================
  describe('updatePipeline', () => {
    const updateData = {
      name: 'Updated Pipeline',
      isDefault: false,
    };

    it('should update pipeline', async () => {
      mockSession = sessionUserA;
      const updatedPipeline = createMockPipeline({ id: 'pipeline-1', name: 'Updated Pipeline' });
      mockPrisma.pipeline.update.mockResolvedValue(updatedPipeline as any);

      const result = await updatePipeline('pipeline-1', updateData);

      expect(result.name).toBe('Updated Pipeline');
      expect(mockPrisma.pipeline.update).toHaveBeenCalledWith({
        where: { id: 'pipeline-1' },
        data: {
          name: 'Updated Pipeline',
          isDefault: false,
        },
      });
    });

    it('should unset other defaults when updating to default', async () => {
      mockSession = sessionUserA;
      mockPrisma.pipeline.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.pipeline.update.mockResolvedValue(
        createMockPipeline({ id: 'pipeline-1', isDefault: true }) as any
      );

      await updatePipeline('pipeline-1', { name: 'New Default', isDefault: true });

      expect(mockPrisma.pipeline.updateMany).toHaveBeenCalledWith({
        where: {
          id: { not: 'pipeline-1' },
          isDefault: true,
        },
        data: { isDefault: false },
      });
    });

    it('should throw validation error with invalid name', async () => {
      mockSession = sessionUserA;

      await expect(updatePipeline('pipeline-1', { name: 'A' })).rejects.toThrow();
    });

    it('should throw "Não autorizado" without session', async () => {
      mockSession = null;

      await expect(updatePipeline('pipeline-1', updateData)).rejects.toThrow('Não autorizado');
    });
  });

  // ===========================================
  // deletePipeline Tests
  // ===========================================
  describe('deletePipeline', () => {
    it('should delete non-default pipeline', async () => {
      mockSession = sessionUserA;
      const pipeline = createMockPipeline({ id: 'pipeline-1', isDefault: false });
      mockPrisma.pipeline.findUnique.mockResolvedValue(pipeline as any);
      mockPrisma.pipeline.delete.mockResolvedValue(pipeline as any);

      await deletePipeline('pipeline-1');

      expect(mockPrisma.pipeline.delete).toHaveBeenCalledWith({
        where: { id: 'pipeline-1' },
      });
    });

    it('should throw error when deleting default pipeline', async () => {
      mockSession = sessionUserA;
      const defaultPipeline = createMockPipeline({ id: 'pipeline-1', isDefault: true });
      mockPrisma.pipeline.findUnique.mockResolvedValue(defaultPipeline as any);

      await expect(deletePipeline('pipeline-1')).rejects.toThrow(
        'Não é possível excluir o pipeline padrão'
      );
      expect(mockPrisma.pipeline.delete).not.toHaveBeenCalled();
    });

    it('should throw "Não autorizado" without session', async () => {
      mockSession = null;

      await expect(deletePipeline('pipeline-1')).rejects.toThrow('Não autorizado');
    });

    // Triangulation: User B can delete non-default pipeline
    it('should allow User B to delete non-default pipeline', async () => {
      mockSession = sessionUserB;
      const pipeline = createMockPipeline({ id: 'pipeline-2', isDefault: false });
      mockPrisma.pipeline.findUnique.mockResolvedValue(pipeline as any);
      mockPrisma.pipeline.delete.mockResolvedValue(pipeline as any);

      await deletePipeline('pipeline-2');

      expect(mockPrisma.pipeline.delete).toHaveBeenCalled();
    });
  });

  // ===========================================
  // setDefaultPipeline Tests
  // ===========================================
  describe('setDefaultPipeline', () => {
    it('should set pipeline as default', async () => {
      mockSession = sessionUserA;
      mockPrisma.pipeline.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.pipeline.update.mockResolvedValue(
        createMockPipeline({ id: 'pipeline-1', isDefault: true }) as any
      );

      await setDefaultPipeline('pipeline-1');

      // Should unset all defaults first
      expect(mockPrisma.pipeline.updateMany).toHaveBeenCalledWith({
        where: { isDefault: true },
        data: { isDefault: false },
      });

      // Then set the new default
      expect(mockPrisma.pipeline.update).toHaveBeenCalledWith({
        where: { id: 'pipeline-1' },
        data: { isDefault: true },
      });
    });

    it('should throw "Não autorizado" without session', async () => {
      mockSession = null;

      await expect(setDefaultPipeline('pipeline-1')).rejects.toThrow('Não autorizado');
    });

    // Triangulation: User B can set default pipeline
    it('should allow User B to set default pipeline', async () => {
      mockSession = sessionUserB;
      mockPrisma.pipeline.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.pipeline.update.mockResolvedValue(
        createMockPipeline({ id: 'pipeline-2', isDefault: true }) as any
      );

      await setDefaultPipeline('pipeline-2');

      expect(mockPrisma.pipeline.update).toHaveBeenCalledWith({
        where: { id: 'pipeline-2' },
        data: { isDefault: true },
      });
    });
  });
});
