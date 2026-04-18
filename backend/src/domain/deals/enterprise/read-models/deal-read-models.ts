export interface DealSummary {
  id: string;
  ownerId: string;
  title: string;
  description: string | null;
  value: number;
  currency: string;
  status: string;
  closedAt: Date | null;
  stageId: string;
  contactId: string | null;
  organizationId: string | null;
  expectedCloseDate: Date | null;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  owner: { id: string; name: string; email: string } | null;
  stage: { id: string; name: string; probability: number } | null;
  contact: { id: string; name: string; email: string | null } | null;
  organization: { id: string; name: string } | null;
  _count: { activities: number; dealProducts: number };
}

export interface DealDetail extends DealSummary {
  // Relations
  activities: Array<{
    id: string;
    type: string;
    subject: string;
    completed: boolean;
    dueDate: Date | null;
    createdAt: Date;
  }>;
  dealProducts: Array<{
    id: string;
    productId: string;
    product: { id: string; name: string } | null;
    quantity: number;
    unitPrice: number;
    discount: number;
    description: string | null;
  }>;
  stageHistory: Array<{
    id: string;
    fromStageId: string | null;
    toStageId: string;
    changedById: string;
    changedAt: Date;
    fromStage: { id: string; name: string } | null;
    toStage: { id: string; name: string } | null;
  }>;
}
