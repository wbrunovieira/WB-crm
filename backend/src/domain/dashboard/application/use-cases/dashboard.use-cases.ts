import { Injectable } from "@nestjs/common";
import { Either, right } from "@/core/either";
import {
  DashboardRepository,
} from "../repositories/dashboard.repository";

// ── Date range helpers ──────────────────────────────────────────────────────

type Period = "today" | "week" | "month" | "custom";

function resolveDateRange(
  period: Period,
  startDate?: Date,
  endDate?: Date,
): { startDate: Date; endDate: Date } {
  if (period === "custom" && startDate && endDate) return { startDate, endDate };
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);
  if (period === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (period === "week") {
    start.setDate(now.getDate() - 7);
    start.setHours(0, 0, 0, 0);
  } else {
    start.setMonth(now.getMonth() - 1);
    start.setHours(0, 0, 0, 0);
  }
  return { startDate: start, endDate: end };
}

function previousPeriod(start: Date, end: Date): { startDate: Date; endDate: Date } {
  const len = end.getTime() - start.getTime();
  return {
    startDate: new Date(start.getTime() - len),
    endDate: new Date(start.getTime() - 1),
  };
}

function pct(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

// ── Output types ─────────────────────────────────────────────────────────────

export interface UserMetrics {
  userId: string;
  userName: string;
  userEmail: string;
  leads: { created: number; converted: number; conversionRate: number };
  organizations: { created: number };
  deals: { created: number; won: number; lost: number; open: number; totalValue: number; avgValue: number };
  contacts: { created: number };
  partners: { created: number };
  activities: { total: number; completed: number; pending: number; overdue: number; byType: Record<string, number> };
  stageChanges: number;
}

export interface TotalMetrics {
  leads: { total: number; converted: number; conversionRate: number };
  organizations: { total: number };
  deals: {
    total: number; won: number; lost: number; open: number; totalValue: number; avgValue: number;
    byStage: { stageId: string; stageName: string; count: number; value: number }[];
  };
  contacts: { total: number };
  partners: { total: number; byType: Record<string, number> };
  activities: { total: number; completed: number; pending: number; overdue: number; byType: Record<string, number> };
  stageChanges: { total: number; byStage: { fromStage: string; toStage: string; count: number }[] };
}

export interface ManagerStats {
  period: { startDate: string; endDate: string };
  byUser: UserMetrics[];
  totals: TotalMetrics;
  comparison: {
    leads: number;
    organizations: number;
    deals: number;
    dealsValue: number;
    contacts: number;
    partners: number;
    activities: number;
  };
}

export interface TimelinePoint {
  date: string;
  leads: number;
  converted: number;
  deals: number;
  dealsValue: number;
}

export interface DailyActivityData {
  date: string;
  total: number;
  completed: number;
  pending: number;
  failed: number;
  skipped: number;
  byType: Record<string, number>;
  completedByType: Record<string, number>;
  pendingByType: Record<string, number>;
  failedByType: Record<string, number>;
  skippedByType: Record<string, number>;
}

// ── Use cases ─────────────────────────────────────────────────────────────────

@Injectable()
export class GetManagerStatsUseCase {
  constructor(private readonly repo: DashboardRepository) {}

  async execute(input: {
    requesterId: string;
    requesterRole: string;
    ownerId?: string;
    period?: Period;
    startDate?: Date;
    endDate?: Date;
  }): Promise<Either<Error, ManagerStats>> {
    const { startDate, endDate } = resolveDateRange(input.period ?? "month", input.startDate, input.endDate);
    const { startDate: prevStart, endDate: prevEnd } = previousPeriod(startDate, endDate);

    const ownerFilter: { ownerId: string } | Record<string, never> =
      input.requesterRole === "admin"
        ? (input.ownerId ? { ownerId: input.ownerId } : {})
        : { ownerId: input.requesterId };

    const raw = await this.repo.fetchStatsData({ startDate, endDate, ownerFilter, prevStartDate: prevStart, prevEndDate: prevEnd });

    const now = new Date();

    // Per-user metrics (only include users with any activity in the period)
    const byUser: UserMetrics[] = raw.users
      .map(user => {
        const uLeads = raw.leads.filter(l => l.ownerId === user.id);
        const uOrgs = raw.organizations.filter(o => o.ownerId === user.id);
        const uDeals = raw.deals.filter(d => d.ownerId === user.id);
        const uContacts = raw.contacts.filter(c => c.ownerId === user.id);
        const uPartners = raw.partners.filter(p => p.ownerId === user.id);
        const uActivities = raw.activities.filter(a => a.ownerId === user.id);
        const uStageChanges = raw.stageChanges.filter(s => s.changedById === user.id);

        const converted = uLeads.filter(l => l.convertedAt !== null).length;
        const won = uDeals.filter(d => d.status === "won").length;
        const lost = uDeals.filter(d => d.status === "lost").length;
        const open = uDeals.filter(d => d.status === "open").length;
        const totalValue = uDeals.reduce((s, d) => s + (d.value ?? 0), 0);
        const completed = uActivities.filter(a => a.completed).length;
        const overdue = uActivities.filter(a => !a.completed && a.dueDate && new Date(a.dueDate) < now).length;
        const byType: Record<string, number> = {};
        uActivities.forEach(a => { byType[a.type] = (byType[a.type] ?? 0) + 1; });

        return {
          userId: user.id,
          userName: user.name || "Sem nome",
          userEmail: user.email,
          leads: { created: uLeads.length, converted, conversionRate: uLeads.length > 0 ? Math.round((converted / uLeads.length) * 100) : 0 },
          organizations: { created: uOrgs.length },
          deals: { created: uDeals.length, won, lost, open, totalValue, avgValue: uDeals.length > 0 ? totalValue / uDeals.length : 0 },
          contacts: { created: uContacts.length },
          partners: { created: uPartners.length },
          activities: { total: uActivities.length, completed, pending: uActivities.length - completed, overdue, byType },
          stageChanges: uStageChanges.length,
        };
      })
      .filter(u => u.leads.created + u.organizations.created + u.deals.created + u.contacts.created + u.partners.created + u.activities.total + u.stageChanges > 0);

    // Totals
    const convTotal = raw.leads.filter(l => l.convertedAt !== null).length;
    const totalDealValue = raw.deals.reduce((s, d) => s + (d.value ?? 0), 0);
    const partnersByType: Record<string, number> = {};
    raw.partners.forEach(p => { if (p.partnerType) partnersByType[p.partnerType] = (partnersByType[p.partnerType] ?? 0) + 1; });
    const actByType: Record<string, number> = {};
    raw.activities.forEach(a => { actByType[a.type] = (actByType[a.type] ?? 0) + 1; });
    const completedTotal = raw.activities.filter(a => a.completed).length;
    const overdueTotal = raw.activities.filter(a => !a.completed && a.dueDate && new Date(a.dueDate) < now).length;
    const dealsByStage = raw.stages
      .map(stage => {
        const stageDeals = raw.deals.filter(d => d.stageId === stage.id);
        return { stageId: stage.id, stageName: stage.name, count: stageDeals.length, value: stageDeals.reduce((s, d) => s + (d.value ?? 0), 0) };
      })
      .filter(s => s.count > 0);
    const stageChangeMap = new Map<string, number>();
    raw.stageChanges.forEach(sc => {
      const key = `${sc.fromStageName ?? "Início"}:::${sc.toStageName}`;
      stageChangeMap.set(key, (stageChangeMap.get(key) ?? 0) + 1);
    });
    const stageChangesSummary = Array.from(stageChangeMap.entries()).map(([key, count]) => {
      const [fromStage, toStage] = key.split(":::");
      return { fromStage, toStage, count };
    });

    const totals: TotalMetrics = {
      leads: { total: raw.leads.length, converted: convTotal, conversionRate: raw.leads.length > 0 ? Math.round((convTotal / raw.leads.length) * 100) : 0 },
      organizations: { total: raw.organizations.length },
      deals: {
        total: raw.deals.length,
        won: raw.deals.filter(d => d.status === "won").length,
        lost: raw.deals.filter(d => d.status === "lost").length,
        open: raw.deals.filter(d => d.status === "open").length,
        totalValue: totalDealValue,
        avgValue: raw.deals.length > 0 ? totalDealValue / raw.deals.length : 0,
        byStage: dealsByStage,
      },
      contacts: { total: raw.contacts.length },
      partners: { total: raw.partners.length, byType: partnersByType },
      activities: { total: raw.activities.length, completed: completedTotal, pending: raw.activities.length - completedTotal, overdue: overdueTotal, byType: actByType },
      stageChanges: { total: raw.stageChanges.length, byStage: stageChangesSummary },
    };

    const p = raw.prevCounts;
    const comparison = {
      leads: pct(raw.leads.length, p.leads),
      organizations: pct(raw.organizations.length, p.organizations),
      deals: pct(raw.deals.length, p.dealsCount),
      dealsValue: pct(totalDealValue, p.dealsValue),
      contacts: pct(raw.contacts.length, p.contacts),
      partners: pct(raw.partners.length, p.partners),
      activities: pct(raw.activities.length, p.activities),
    };

    return right({
      period: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      byUser,
      totals,
      comparison,
    });
  }
}

@Injectable()
export class GetTimelineDataUseCase {
  constructor(private readonly repo: DashboardRepository) {}

  async execute(input: {
    requesterId: string;
    requesterRole: string;
    period?: Period;
    startDate?: Date;
    endDate?: Date;
  }): Promise<Either<Error, TimelinePoint[]>> {
    const { startDate, endDate } = resolveDateRange(input.period ?? "month", input.startDate, input.endDate);
    const ownerFilter: { ownerId: string } | Record<string, never> =
      input.requesterRole === "admin" ? {} : { ownerId: input.requesterId };

    const raw = await this.repo.fetchTimelineData({ startDate, endDate, ownerFilter });

    const byDate: Record<string, { leads: number; converted: number; deals: number; dealsValue: number }> = {};
    raw.leads.forEach(l => {
      const d = l.createdAt.toISOString().split("T")[0];
      if (!byDate[d]) byDate[d] = { leads: 0, converted: 0, deals: 0, dealsValue: 0 };
      byDate[d].leads++;
      if (l.convertedAt) byDate[d].converted++;
    });
    raw.deals.forEach(d => {
      const day = d.createdAt.toISOString().split("T")[0];
      if (!byDate[day]) byDate[day] = { leads: 0, converted: 0, deals: 0, dealsValue: 0 };
      byDate[day].deals++;
      byDate[day].dealsValue += d.value ?? 0;
    });

    const timeline: TimelinePoint[] = Object.entries(byDate)
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return right(timeline);
  }
}

@Injectable()
export class GetActivityCalendarUseCase {
  constructor(private readonly repo: DashboardRepository) {}

  async execute(input: {
    requesterId: string;
    requesterRole: string;
    year?: number;
    month?: number;
  }): Promise<Either<Error, DailyActivityData[]>> {
    const now = new Date();
    const year = input.year ?? now.getFullYear();
    const month = input.month ?? now.getMonth() + 1;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    const ownerFilter: { ownerId: string } | Record<string, never> =
      input.requesterRole === "admin" ? {} : { ownerId: input.requesterId };

    const raw = await this.repo.fetchActivityCalendarData({ startDate, endDate, ownerFilter });

    const dayMap = new Map<string, DailyActivityData>();

    raw.activities.forEach(activity => {
      let dateStr: string;
      if (activity.completed && activity.completedAt) {
        dateStr = activity.completedAt.toISOString().split("T")[0];
      } else if (activity.failedAt) {
        dateStr = activity.failedAt.toISOString().split("T")[0];
      } else if (activity.skippedAt) {
        dateStr = activity.skippedAt.toISOString().split("T")[0];
      } else {
        dateStr = (activity.dueDate ?? activity.createdAt).toISOString().split("T")[0];
      }

      if (!dayMap.has(dateStr)) {
        dayMap.set(dateStr, { date: dateStr, total: 0, completed: 0, pending: 0, failed: 0, skipped: 0, byType: {}, completedByType: {}, pendingByType: {}, failedByType: {}, skippedByType: {} });
      }
      const day = dayMap.get(dateStr)!;
      day.total++;
      day.byType[activity.type] = (day.byType[activity.type] ?? 0) + 1;

      if (activity.completed) {
        day.completed++;
        day.completedByType[activity.type] = (day.completedByType[activity.type] ?? 0) + 1;
      } else if (activity.failedAt) {
        day.failed++;
        day.failedByType[activity.type] = (day.failedByType[activity.type] ?? 0) + 1;
      } else if (activity.skippedAt) {
        day.skipped++;
        day.skippedByType[activity.type] = (day.skippedByType[activity.type] ?? 0) + 1;
      } else {
        day.pending++;
        day.pendingByType[activity.type] = (day.pendingByType[activity.type] ?? 0) + 1;
      }
    });

    const calendar = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    return right(calendar);
  }
}
