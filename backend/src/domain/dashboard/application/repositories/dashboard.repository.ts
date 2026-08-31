export interface DashboardStatsInput {
  startDate: Date;
  endDate: Date;
  ownerFilter: { ownerId: string } | Record<string, never>;
  prevStartDate: Date;
  prevEndDate: Date;
}

export interface DashboardStatsRawData {
  users: Array<{ id: string; name: string; email: string }>;
  leads: Array<{ ownerId: string; convertedAt: Date | null }>;
  organizations: Array<{ ownerId: string }>;
  deals: Array<{ ownerId: string; status: string | null; value: number | null; stageId: string | null; stageName: string | null }>;
  // Deals actually WON/LOST within the period, filtered by closedAt — not createdAt. `deals`
  // above answers "created in period"; this answers "closed (won/lost) in period", which is
  // what "resultado da semana/mês" (revenue actually closed) needs.
  closedDeals: Array<{
    id: string;
    title: string;
    ownerId: string;
    status: string | null;
    value: number | null;
    currency: string | null;
    closedAt: Date | null;
    stageId: string | null;
    stageName: string | null;
  }>;
  // Every OPEN deal for the owner, regardless of when it was created — the basis for the
  // forecast ("what is expected to close in this period"), which is a different question
  // from `deals` (created in period) and `closedDeals` (closed in period). Sliced by the
  // use case into in-period / overdue / undated.
  openDeals: Array<{
    id: string;
    title: string;
    ownerId: string;
    value: number | null;
    currency: string | null;
    expectedCloseDate: Date | null;
    stageName: string | null;
  }>;
  contacts: Array<{ ownerId: string }>;
  partners: Array<{ ownerId: string; partnerType: string | null }>;
  activities: Array<{ ownerId: string; type: string; completed: boolean; dueDate: Date | null }>;
  stageChanges: Array<{ changedById: string | null; fromStageName: string | null; toStageName: string }>;
  stages: Array<{ id: string; name: string }>;
  prevCounts: {
    leads: number;
    organizations: number;
    dealsCount: number;
    // Previous period's WON revenue (closedAt-based) — pairs with the now closedAt-based
    // `totals.deals.totalValue` for an apples-to-apples % comparison.
    dealsValue: number;
    contacts: number;
    partners: number;
    activities: number;
  };
}

export interface TimelineStatsInput {
  startDate: Date;
  endDate: Date;
  ownerFilter: { ownerId: string } | Record<string, never>;
}

export interface TimelineRawData {
  leads: Array<{ createdAt: Date; convertedAt: Date | null }>;
  deals: Array<{ createdAt: Date; value: number | null }>;
}

export interface ActivityCalendarInput {
  startDate: Date;
  endDate: Date;
  ownerFilter: { ownerId: string } | Record<string, never>;
}

export interface ActivityCalendarRawData {
  activities: Array<{
    type: string;
    completed: boolean;
    completedAt: Date | null;
    failedAt: Date | null;
    skippedAt: Date | null;
    dueDate: Date | null;
    createdAt: Date;
  }>;
}

export abstract class DashboardRepository {
  abstract fetchStatsData(input: DashboardStatsInput): Promise<DashboardStatsRawData>;
  abstract fetchTimelineData(input: TimelineStatsInput): Promise<TimelineRawData>;
  abstract fetchActivityCalendarData(input: ActivityCalendarInput): Promise<ActivityCalendarRawData>;
}
