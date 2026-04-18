export interface StageSummary {
  id: string;
  name: string;
  order: number;
  probability: number;
  pipelineId: string;
  createdAt: Date;
  updatedAt: Date;
  _count: { deals: number };
}

export interface PipelineSummary {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  stages: StageSummary[];
}

export interface PipelineDetail extends PipelineSummary {
  stages: StageSummary[];
}
