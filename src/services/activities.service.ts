/**
 * Activities Service
 * Phase 9: Architecture Improvements - Service Layer
 *
 * Contains business logic for activity operations:
 * - Date range filtering
 * - Grouping by time periods
 * - Statistics calculation
 */

import type { Activity } from "@prisma/client";

export interface ActivityWithRelations extends Activity {
  deal?: { id: string; title: string } | null;
  contact?: { id: string; name: string } | null;
  lead?: { id: string; businessName: string | null } | null;
  partner?: { id: string; name: string } | null;
}

export interface GroupedActivities {
  key: string;
  label: string;
  activities: ActivityWithRelations[];
  count: number;
}

export interface ActivityStats {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  completionRate: number;
  byType: Record<string, number>;
  avgPerDay: number;
}

// ==================== Date Range Filtering ====================

/**
 * Filters activities by date range
 */
export function getActivitiesByDateRange(
  activities: ActivityWithRelations[],
  startDate: Date,
  endDate: Date
): ActivityWithRelations[] {
  return activities.filter((activity) => {
    const activityDate = activity.dueDate
      ? new Date(activity.dueDate)
      : new Date(activity.createdAt);
    return activityDate >= startDate && activityDate <= endDate;
  });
}

/**
 * Gets activities for today
 */
export function getTodayActivities(
  activities: ActivityWithRelations[]
): ActivityWithRelations[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return getActivitiesByDateRange(activities, today, tomorrow);
}

/**
 * Gets activities for this week
 */
export function getThisWeekActivities(
  activities: ActivityWithRelations[]
): ActivityWithRelations[] {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  return getActivitiesByDateRange(activities, startOfWeek, endOfWeek);
}

/**
 * Gets activities for this month
 */
export function getThisMonthActivities(
  activities: ActivityWithRelations[]
): ActivityWithRelations[] {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

  return getActivitiesByDateRange(activities, startOfMonth, endOfMonth);
}

// ==================== Grouping ====================

/**
 * Groups activities by day
 */
export function groupActivitiesByDay(
  activities: ActivityWithRelations[]
): GroupedActivities[] {
  const groups: Map<string, ActivityWithRelations[]> = new Map();

  activities.forEach((activity) => {
    const date = activity.dueDate
      ? new Date(activity.dueDate)
      : new Date(activity.createdAt);
    const key = date.toISOString().split("T")[0]; // YYYY-MM-DD

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(activity);
  });

  return Array.from(groups.entries())
    .map(([key, acts]) => ({
      key,
      label: formatDateLabel(new Date(key)),
      activities: acts.sort((a, b) => {
        const dateA = a.dueDate ? new Date(a.dueDate) : new Date(a.createdAt);
        const dateB = b.dueDate ? new Date(b.dueDate) : new Date(b.createdAt);
        return dateA.getTime() - dateB.getTime();
      }),
      count: acts.length,
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Groups activities by week
 */
export function groupActivitiesByWeek(
  activities: ActivityWithRelations[]
): GroupedActivities[] {
  const groups: Map<string, ActivityWithRelations[]> = new Map();

  activities.forEach((activity) => {
    const date = activity.dueDate
      ? new Date(activity.dueDate)
      : new Date(activity.createdAt);
    const weekStart = getWeekStart(date);
    const key = weekStart.toISOString().split("T")[0];

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(activity);
  });

  return Array.from(groups.entries())
    .map(([key, acts]) => {
      const weekStart = new Date(key);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      return {
        key,
        label: `${formatShortDate(weekStart)} - ${formatShortDate(weekEnd)}`,
        activities: acts,
        count: acts.length,
      };
    })
    .sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Groups activities by month
 */
export function groupActivitiesByMonth(
  activities: ActivityWithRelations[]
): GroupedActivities[] {
  const groups: Map<string, ActivityWithRelations[]> = new Map();

  activities.forEach((activity) => {
    const date = activity.dueDate
      ? new Date(activity.dueDate)
      : new Date(activity.createdAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(activity);
  });

  return Array.from(groups.entries())
    .map(([key, acts]) => ({
      key,
      label: formatMonthLabel(key),
      activities: acts,
      count: acts.length,
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

// ==================== Overdue & Upcoming ====================

/**
 * Gets overdue activities (past due date, not completed)
 */
export function getOverdueActivities(
  activities: ActivityWithRelations[]
): ActivityWithRelations[] {
  const now = new Date();

  return activities.filter((activity) => {
    if (activity.completed) return false;
    if (!activity.dueDate) return false;

    const dueDate = new Date(activity.dueDate);
    return dueDate < now;
  });
}

/**
 * Gets upcoming activities (future due date, not completed)
 */
export function getUpcomingActivities(
  activities: ActivityWithRelations[],
  days: number = 7
): ActivityWithRelations[] {
  const now = new Date();
  const futureDate = new Date(now);
  futureDate.setDate(futureDate.getDate() + days);

  return activities.filter((activity) => {
    if (activity.completed) return false;
    if (!activity.dueDate) return false;

    const dueDate = new Date(activity.dueDate);
    return dueDate >= now && dueDate <= futureDate;
  });
}

/**
 * Gets activities due today
 */
export function getActivitiesDueToday(
  activities: ActivityWithRelations[]
): ActivityWithRelations[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return activities.filter((activity) => {
    if (!activity.dueDate) return false;
    const dueDate = new Date(activity.dueDate);
    return dueDate >= today && dueDate < tomorrow;
  });
}

// ==================== Statistics ====================

/**
 * Calculates activity statistics
 */
export function calculateActivityStats(
  activities: ActivityWithRelations[],
  periodDays: number = 30
): ActivityStats {
  const total = activities.length;
  const completed = activities.filter((a) => a.completed).length;
  const pending = activities.filter((a) => !a.completed).length;
  const overdue = getOverdueActivities(activities).length;

  // Count by type
  const byType: Record<string, number> = {};
  activities.forEach((activity) => {
    const type = activity.type || "other";
    byType[type] = (byType[type] || 0) + 1;
  });

  return {
    total,
    completed,
    pending,
    overdue,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    byType,
    avgPerDay: periodDays > 0 ? Math.round((total / periodDays) * 10) / 10 : 0,
  };
}

/**
 * Gets activity type distribution
 */
export function getActivityTypeDistribution(
  activities: ActivityWithRelations[]
): Array<{ type: string; count: number; percentage: number }> {
  const total = activities.length;
  if (total === 0) return [];

  const byType: Record<string, number> = {};
  activities.forEach((activity) => {
    const type = activity.type || "other";
    byType[type] = (byType[type] || 0) + 1;
  });

  return Object.entries(byType)
    .map(([type, count]) => ({
      type,
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}

// ==================== Helper Functions ====================

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateLabel(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.getTime() === today.getTime()) return "Hoje";
  if (date.getTime() === tomorrow.getTime()) return "Amanhã";
  if (date.getTime() === yesterday.getTime()) return "Ontem";

  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
  });
}

function formatMonthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}
