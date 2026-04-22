/**
 * Activities Service
 * Pure utility functions for activity data processing
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActivityWithRelations {
  id: string;
  type: string;
  title?: string;
  subject?: string;
  description: string | null;
  dueDate: Date | null;
  completed: boolean;
  completedAt: Date | null;
  dealId: string | null;
  contactId: string | null;
  leadId: string | null;
  partnerId: string | null;
  contactIds: string | null;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActivityStats {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  dueToday: number;
  completionRate: number;
  byType: Record<string, number>;
  avgPerDay: number;
}

export interface ActivityTypeDistribution {
  type: string;
  count: number;
  percentage: number;
}

export interface GroupedActivities {
  key: string;
  label: string;
  count: number;
  activities: ActivityWithRelations[];
}

// ─── Date Range ───────────────────────────────────────────────────────────────

export function getActivitiesByDateRange(
  activities: ActivityWithRelations[],
  start: Date,
  end: Date
): ActivityWithRelations[] {
  return activities.filter((a) => {
    if (!a.dueDate) return false;
    const d = new Date(a.dueDate);
    return d >= start && d <= end;
  });
}

export function getTodayActivities(activities: ActivityWithRelations[]): ActivityWithRelations[] {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return getActivitiesByDateRange(activities, start, end);
}

export function getThisWeekActivities(activities: ActivityWithRelations[]): ActivityWithRelations[] {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() - dayOfWeek);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return getActivitiesByDateRange(activities, start, end);
}

export function getThisMonthActivities(activities: ActivityWithRelations[]): ActivityWithRelations[] {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return getActivitiesByDateRange(activities, start, end);
}

// ─── Overdue / Upcoming ───────────────────────────────────────────────────────

export function getOverdueActivities(activities: ActivityWithRelations[]): ActivityWithRelations[] {
  const now = new Date();
  return activities.filter((a) => {
    if (a.completed || !a.dueDate) return false;
    return new Date(a.dueDate) < now;
  });
}

export function getUpcomingActivities(
  activities: ActivityWithRelations[],
  days = 7
): ActivityWithRelations[] {
  const now = new Date();
  const end = new Date();
  end.setDate(now.getDate() + days);
  return activities.filter((a) => {
    if (a.completed || !a.dueDate) return false;
    const d = new Date(a.dueDate);
    return d >= now && d <= end;
  });
}

export function getActivitiesDueToday(activities: ActivityWithRelations[]): ActivityWithRelations[] {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return activities.filter((a) => {
    if (!a.dueDate) return false;
    const d = new Date(a.dueDate);
    return d >= startOfDay && d <= endOfDay;
  });
}

// ─── Grouping ─────────────────────────────────────────────────────────────────

const MONTHS_PT = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export function groupActivitiesByDay(activities: ActivityWithRelations[]): GroupedActivities[] {
  const map = new Map<string, ActivityWithRelations[]>();
  for (const a of activities) {
    if (!a.dueDate) continue;
    const d = new Date(a.dueDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(a);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, acts]) => ({
      key,
      label: key,
      count: acts.length,
      activities: acts.sort((a, b) => {
        const da = a.dueDate ? new Date(a.dueDate).getTime() : 0;
        const db = b.dueDate ? new Date(b.dueDate).getTime() : 0;
        return da - db;
      }),
    }));
}

export function groupActivitiesByWeek(activities: ActivityWithRelations[]): GroupedActivities[] {
  const map = new Map<string, { start: Date; end: Date; acts: ActivityWithRelations[] }>();
  for (const a of activities) {
    if (!a.dueDate) continue;
    const d = new Date(a.dueDate);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const key = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, "0")}-${String(weekStart.getDate()).padStart(2, "0")}`;
    if (!map.has(key)) map.set(key, { start: weekStart, end: weekEnd, acts: [] });
    map.get(key)!.acts.push(a);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, { start, end, acts }]) => {
      const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return {
        key,
        label: `${fmt(start)} - ${fmt(end)}`,
        count: acts.length,
        activities: acts,
      };
    });
}

export function groupActivitiesByMonth(activities: ActivityWithRelations[]): GroupedActivities[] {
  const map = new Map<string, ActivityWithRelations[]>();
  for (const a of activities) {
    if (!a.dueDate) continue;
    const d = new Date(a.dueDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(a);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, acts]) => {
      const [year, monthStr] = key.split("-");
      const monthIndex = parseInt(monthStr, 10) - 1;
      return {
        key,
        label: `${MONTHS_PT[monthIndex]} ${year}`,
        count: acts.length,
        activities: acts,
      };
    });
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export function calculateActivityStats(activities: ActivityWithRelations[], periodDays?: number): ActivityStats {
  const total = activities.length;
  const completed = activities.filter((a) => a.completed).length;
  const pending = total - completed;
  const overdue = getOverdueActivities(activities).length;
  const dueToday = getActivitiesDueToday(activities).length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const byType: Record<string, number> = {};
  for (const a of activities) {
    byType[a.type] = (byType[a.type] ?? 0) + 1;
  }

  const days = periodDays ?? 1;
  const avgPerDay = days > 0 ? Math.round((total / days) * 10) / 10 : 0;

  return { total, completed, pending, overdue, dueToday, completionRate, byType, avgPerDay };
}

export function getActivityTypeDistribution(
  activities: ActivityWithRelations[]
): ActivityTypeDistribution[] {
  const counts = new Map<string, number>();
  for (const a of activities) {
    counts.set(a.type, (counts.get(a.type) ?? 0) + 1);
  }
  const total = activities.length;
  return Array.from(counts.entries())
    .map(([type, count]) => ({
      type,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);
}
