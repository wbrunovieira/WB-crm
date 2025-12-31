/**
 * Tests for Stages Server Actions
 *
 * REGRA FUNDAMENTAL: Quando um teste falha, corrija a IMPLEMENTAÇÃO, nunca o teste.
 * Os testes definem o comportamento esperado do sistema.
 *
 * Note: Stages are NOT user-scoped (no ownerId). They are admin-managed entities.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import type { PrismaClient } from '@prisma/client';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: mockDeep<PrismaClient>(),
}));

// Mock revalidatePath
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Import after mocks
import { prisma } from '@/lib/prisma';
import {
  getStages,
  getStagesByPipeline,
  createStage,
  updateStage,
  deleteStage,
  reorderStages,
} from '@/actions/stages';

const mockPrisma = prisma as unknown as ReturnType<typeof mockDeep<PrismaClient>>;

// Helper to create mock stage
function createMockStage(overrides: Partial<{
  id: string;
  name: string;
  order: number;
  probability: number;
  pipelineId: string;
}> = {}) {
  return {
    id: overrides.id || `stage-${Date.now()}`,
    name: overrides.name || 'Qualification',
    order: overrides.order ?? 1,
    probability: overrides.probability ?? 10,
    pipelineId: overrides.pipelineId || 'pipeline-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('Stages Actions', () => {
  beforeEach(() => {
    mockReset(mockPrisma);
  });

  // ===========================================
  // getStages Tests
  // ===========================================
  describe('getStages', () => {
    it('should return all stages', async () => {
      const stages = [
        createMockStage({ id: 'stage-1', name: 'Qualification', order: 1 }),
        createMockStage({ id: 'stage-2', name: 'Proposal', order: 2 }),
        createMockStage({ id: 'stage-3', name: 'Negotiation', order: 3 }),
      ];

      mockPrisma.stage.findMany.mockResolvedValue(stages as any);

      const result = await getStages();

      expect(result).toHaveLength(3);
      expect(mockPrisma.stage.findMany).toHaveBeenCalledWith({
        orderBy: { order: 'asc' },
        include: {
          pipeline: {
            select: {
              id: true,
              name: true,
              isDefault: true,
            },
          },
        },
      });
    });

    it('should return empty array when no stages exist', async () => {
      mockPrisma.stage.findMany.mockResolvedValue([]);

      const result = await getStages();

      expect(result).toEqual([]);
    });

    it('should include pipeline info in response', async () => {
      const stages = [{
        ...createMockStage({ id: 'stage-1' }),
        pipeline: { id: 'pipeline-1', name: 'Sales', isDefault: true },
      }];

      mockPrisma.stage.findMany.mockResolvedValue(stages as any);

      const result = await getStages();

      expect(result[0].pipeline).toBeDefined();
      expect(result[0].pipeline.name).toBe('Sales');
    });
  });

  // ===========================================
  // getStagesByPipeline Tests
  // ===========================================
  describe('getStagesByPipeline', () => {
    it('should return stages for specific pipeline', async () => {
      const stages = [
        createMockStage({ id: 'stage-1', pipelineId: 'pipeline-1', order: 1 }),
        createMockStage({ id: 'stage-2', pipelineId: 'pipeline-1', order: 2 }),
      ];

      mockPrisma.stage.findMany.mockResolvedValue(stages as any);

      const result = await getStagesByPipeline('pipeline-1');

      expect(result).toHaveLength(2);
      expect(mockPrisma.stage.findMany).toHaveBeenCalledWith({
        where: { pipelineId: 'pipeline-1' },
        orderBy: { order: 'asc' },
        include: {
          _count: {
            select: {
              deals: true,
            },
          },
        },
      });
    });

    it('should return empty array for pipeline with no stages', async () => {
      mockPrisma.stage.findMany.mockResolvedValue([]);

      const result = await getStagesByPipeline('pipeline-empty');

      expect(result).toEqual([]);
    });

    it('should include deal counts', async () => {
      const stages = [{
        ...createMockStage({ id: 'stage-1' }),
        _count: { deals: 5 },
      }];

      mockPrisma.stage.findMany.mockResolvedValue(stages as any);

      const result = await getStagesByPipeline('pipeline-1');

      expect(result[0]._count.deals).toBe(5);
    });
  });

  // ===========================================
  // createStage Tests
  // ===========================================
  describe('createStage', () => {
    const validStageData = {
      name: 'New Stage',
      order: 5,
      probability: 50,
      pipelineId: 'pipeline-1',
    };

    it('should create a stage with valid data', async () => {
      const createdStage = createMockStage({
        id: 'stage-new',
        name: 'New Stage',
        order: 5,
        probability: 50,
        pipelineId: 'pipeline-1',
      });

      mockPrisma.stage.create.mockResolvedValue(createdStage as any);

      const result = await createStage(validStageData);

      expect(result.id).toBe('stage-new');
      expect(result.name).toBe('New Stage');
      expect(mockPrisma.stage.create).toHaveBeenCalledWith({
        data: {
          name: 'New Stage',
          order: 5,
          probability: 50,
          pipelineId: 'pipeline-1',
        },
      });
    });

    it('should throw error with invalid name (too short)', async () => {
      const invalidData = { ...validStageData, name: 'A' };

      await expect(createStage(invalidData)).rejects.toThrow();
    });

    it('should throw error with negative order', async () => {
      const invalidData = { ...validStageData, order: -1 };

      await expect(createStage(invalidData)).rejects.toThrow();
    });

    it('should throw error with probability over 100', async () => {
      const invalidData = { ...validStageData, probability: 150 };

      await expect(createStage(invalidData)).rejects.toThrow();
    });

    it('should throw error with probability under 0', async () => {
      const invalidData = { ...validStageData, probability: -10 };

      await expect(createStage(invalidData)).rejects.toThrow();
    });

    it('should accept probability of 0', async () => {
      const dataWithZeroProbability = { ...validStageData, probability: 0 };
      mockPrisma.stage.create.mockResolvedValue(
        createMockStage({ ...dataWithZeroProbability }) as any
      );

      await createStage(dataWithZeroProbability);

      expect(mockPrisma.stage.create).toHaveBeenCalled();
    });

    it('should accept probability of 100', async () => {
      const dataWith100Probability = { ...validStageData, probability: 100 };
      mockPrisma.stage.create.mockResolvedValue(
        createMockStage({ ...dataWith100Probability }) as any
      );

      await createStage(dataWith100Probability);

      expect(mockPrisma.stage.create).toHaveBeenCalled();
    });
  });

  // ===========================================
  // updateStage Tests
  // ===========================================
  describe('updateStage', () => {
    const updateData = {
      name: 'Updated Stage',
      order: 3,
      probability: 75,
      pipelineId: 'pipeline-1',
    };

    it('should update stage with valid data', async () => {
      const updatedStage = createMockStage({
        id: 'stage-1',
        name: 'Updated Stage',
        order: 3,
        probability: 75,
      });

      mockPrisma.stage.update.mockResolvedValue(updatedStage as any);

      const result = await updateStage('stage-1', updateData);

      expect(result.name).toBe('Updated Stage');
      expect(result.probability).toBe(75);
      expect(mockPrisma.stage.update).toHaveBeenCalledWith({
        where: { id: 'stage-1' },
        data: {
          name: 'Updated Stage',
          order: 3,
          probability: 75,
        },
      });
    });

    it('should throw validation error with invalid name', async () => {
      const invalidData = { ...updateData, name: 'A' };

      await expect(updateStage('stage-1', invalidData)).rejects.toThrow();
    });

    it('should throw validation error with invalid probability', async () => {
      const invalidData = { ...updateData, probability: 120 };

      await expect(updateStage('stage-1', invalidData)).rejects.toThrow();
    });
  });

  // ===========================================
  // deleteStage Tests
  // ===========================================
  describe('deleteStage', () => {
    it('should delete stage with no deals', async () => {
      const stage = {
        ...createMockStage({ id: 'stage-1' }),
        _count: { deals: 0 },
      };
      mockPrisma.stage.findUnique.mockResolvedValue(stage as any);
      mockPrisma.stage.delete.mockResolvedValue(stage as any);

      await deleteStage('stage-1');

      expect(mockPrisma.stage.delete).toHaveBeenCalledWith({
        where: { id: 'stage-1' },
      });
    });

    it('should throw error when stage has deals', async () => {
      const stageWithDeals = {
        ...createMockStage({ id: 'stage-1' }),
        _count: { deals: 3 },
      };
      mockPrisma.stage.findUnique.mockResolvedValue(stageWithDeals as any);

      await expect(deleteStage('stage-1')).rejects.toThrow(
        'Não é possível excluir este estágio pois existem 3 negócio(s) vinculado(s)'
      );
      expect(mockPrisma.stage.delete).not.toHaveBeenCalled();
    });

    it('should throw error for non-existent stage', async () => {
      mockPrisma.stage.findUnique.mockResolvedValue(null);

      await expect(deleteStage('non-existent')).rejects.toThrow('Estágio não encontrado');
    });

    it('should throw error when stage has single deal', async () => {
      const stageWithOneDeal = {
        ...createMockStage({ id: 'stage-1' }),
        _count: { deals: 1 },
      };
      mockPrisma.stage.findUnique.mockResolvedValue(stageWithOneDeal as any);

      await expect(deleteStage('stage-1')).rejects.toThrow(
        'Não é possível excluir este estágio pois existem 1 negócio(s) vinculado(s)'
      );
    });
  });

  // ===========================================
  // reorderStages Tests
  // ===========================================
  describe('reorderStages', () => {
    it('should reorder stages', async () => {
      const stageIds = ['stage-3', 'stage-1', 'stage-2'];
      mockPrisma.stage.update.mockResolvedValue({} as any);

      await reorderStages('pipeline-1', stageIds);

      // Should update each stage with new order (1-based)
      expect(mockPrisma.stage.update).toHaveBeenCalledTimes(3);
      expect(mockPrisma.stage.update).toHaveBeenCalledWith({
        where: { id: 'stage-3' },
        data: { order: 1 },
      });
      expect(mockPrisma.stage.update).toHaveBeenCalledWith({
        where: { id: 'stage-1' },
        data: { order: 2 },
      });
      expect(mockPrisma.stage.update).toHaveBeenCalledWith({
        where: { id: 'stage-2' },
        data: { order: 3 },
      });
    });

    it('should handle empty stage list', async () => {
      await reorderStages('pipeline-1', []);

      expect(mockPrisma.stage.update).not.toHaveBeenCalled();
    });

    it('should handle single stage', async () => {
      mockPrisma.stage.update.mockResolvedValue({} as any);

      await reorderStages('pipeline-1', ['stage-1']);

      expect(mockPrisma.stage.update).toHaveBeenCalledTimes(1);
      expect(mockPrisma.stage.update).toHaveBeenCalledWith({
        where: { id: 'stage-1' },
        data: { order: 1 },
      });
    });
  });
});
