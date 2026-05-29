export interface FunnelStats {
  leadsTotal: number;
  callsTotal: number;
  connectionsTotal: number;
  meetingsTotal: number;
  dealsWon: number;
  dealsTotal: number;
}

export interface WeeklyGoalRecord {
  id: string;
  weekStart: Date;
  targetSales: number;
  ownerId: string;
}

export interface WeeklyFunnelActivity {
  type: string;
  gotoDuration: number | null;
  gotoCallOutcome: string | null;
  callContactType: string | null;
  completed: boolean;
  meetingNoShow: boolean;
  dueDate: Date | null;
  leadId: string | null;
  contactId: string | null;
}

export interface WeeklyFunnelDeal {
  status: string;
  closedAt: Date | null;
}

export interface WeeklyFunnelData {
  activities: WeeklyFunnelActivity[];
  wonDeals: WeeklyFunnelDeal[];
  targetSales: number;
}

/**
 * Read-model port for the sales funnel dashboard. `ownerId === undefined` on
 * getStats means "all owners" (admin scope); the use case resolves the scope.
 */
export abstract class FunnelRepository {
  abstract getStats(ownerId?: string): Promise<FunnelStats>;
  abstract findWeeklyGoals(ownerId: string): Promise<WeeklyGoalRecord[]>;
  abstract findWeeklyData(ownerId: string, weekStart: Date, weekEnd: Date): Promise<WeeklyFunnelData>;
  abstract upsertWeeklyGoal(ownerId: string, weekStart: Date, targetSales: number): Promise<WeeklyGoalRecord>;
}
