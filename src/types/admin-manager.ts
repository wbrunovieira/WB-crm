export interface UserMetrics {
  userId: string;
  userName: string;
  userEmail: string;
  leads: {
    created: number;
    converted: number;
    conversionRate: number;
  };
  organizations: {
    created: number;
  };
  deals: {
    created: number;
    won: number;
    lost: number;
    open: number;
    totalValue: number;
    avgValue: number;
  };
  contacts: {
    created: number;
  };
  partners: {
    created: number;
  };
  activities: {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
    byType: Record<string, number>;
  };
  stageChanges: number;
}

export interface TotalMetrics {
  leads: {
    total: number;
    converted: number;
    conversionRate: number;
  };
  organizations: {
    total: number;
  };
  deals: {
    total: number;
    won: number;
    lost: number;
    open: number;
    totalValue: number;
    avgValue: number;
    byStage: { stageId: string; stageName: string; count: number; value: number }[];
  };
  contacts: {
    total: number;
  };
  partners: {
    total: number;
    byType: Record<string, number>;
  };
  activities: {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
    byType: Record<string, number>;
  };
  stageChanges: {
    total: number;
    byStage: { fromStage: string; toStage: string; count: number }[];
  };
}

export interface ManagerStats {
  period: {
    startDate: string;
    endDate: string;
  };
  byUser: UserMetrics[];
  totals: TotalMetrics;
  comparison?: {
    leads: number;
    organizations: number;
    deals: number;
    dealsValue: number;
    contacts: number;
    partners: number;
    activities: number;
  };
}
