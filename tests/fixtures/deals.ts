import type { Deal, Pipeline, Stage } from '@prisma/client';

export const mockPipeline: Pipeline = {
  id: 'pipeline-test-1',
  name: 'Pipeline Padrão',
  isDefault: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockStage: Stage = {
  id: 'stage-test-1',
  name: 'Prospecção',
  order: 1,
  pipelineId: 'pipeline-test-1',
  probability: 10,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockStageNegotiation: Stage = {
  id: 'stage-test-2',
  name: 'Negociação',
  order: 2,
  pipelineId: 'pipeline-test-1',
  probability: 50,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockStageWon: Stage = {
  id: 'stage-test-3',
  name: 'Ganho',
  order: 3,
  pipelineId: 'pipeline-test-1',
  probability: 100,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockDeal: Deal = {
  id: 'deal-test-1',
  title: 'Desenvolvimento de E-commerce',
  value: 50000,
  currency: 'BRL',
  status: 'open',
  stageId: 'stage-test-1',
  contactId: 'contact-test-1',
  organizationId: 'org-test-1',
  ownerId: 'user-test-123',
  expectedCloseDate: new Date('2024-12-31'),
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockDealWon: Deal = {
  ...mockDeal,
  id: 'deal-won-1',
  status: 'won',
  stageId: 'stage-test-3',
};

export const mockDealLost: Deal = {
  ...mockDeal,
  id: 'deal-lost-1',
  status: 'lost',
};

export const mockDealWithoutOrganization: Deal = {
  ...mockDeal,
  id: 'deal-no-org-1',
  organizationId: null,
};
