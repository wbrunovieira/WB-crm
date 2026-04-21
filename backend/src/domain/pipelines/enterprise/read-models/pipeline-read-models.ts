export interface PipelineViewDeal {
  id: string;
  title: string;
  value: number | null;
  currency: string;
  probability: number | null;
  status: string;
  createdAt: Date;
  contact: { id: string; name: string; email: string | null } | null;
  organization: { id: string; name: string } | null;
  nextActivity: { id: string; subject: string; type: string; dueDate: Date | null } | null;
}

export interface PipelineViewStage {
  id: string;
  name: string;
  order: number;
  probability: number;
  deals: PipelineViewDeal[];
}

export interface PipelineView {
  id: string;
  name: string;
  isDefault: boolean;
  stages: PipelineViewStage[];
}

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
