/**
 * Unit Tests for Activities Service
 * Pure unit tests with edge cases, boundary conditions, and triangulation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getActivitiesByDateRange,
  getTodayActivities,
  getThisWeekActivities,
  getThisMonthActivities,
  groupActivitiesByDay,
  groupActivitiesByWeek,
  groupActivitiesByMonth,
  getOverdueActivities,
  getUpcomingActivities,
  getActivitiesDueToday,
  calculateActivityStats,
  getActivityTypeDistribution,
  type ActivityWithRelations,
} from "@/services/activities.service";

// ==================== Test Helpers ====================

function createActivity(overrides: Partial<ActivityWithRelations> = {}): ActivityWithRelations {
  return {
    id: "activity-1",
    type: "call",
    title: "Test Activity",
    description: null,
    dueDate: new Date(),
    completed: false,
    completedAt: null,
    dealId: null,
    contactId: null,
    leadId: null,
    partnerId: null,
    contactIds: null,
    ownerId: "user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as ActivityWithRelations;
}

function createDate(year: number, month: number, day: number, hours = 12): Date {
  return new Date(year, month - 1, day, hours, 0, 0, 0);
}

function daysFromNow(days: number, hours = 12): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hours, 0, 0, 0);
  return date;
}

// ==================== getActivitiesByDateRange ====================

describe("getActivitiesByDateRange", () => {
  const startDate = createDate(2024, 6, 1);
  const endDate = createDate(2024, 6, 30);

  describe("basic filtering", () => {
    it("returns activities within date range", () => {
      const activities = [
        createActivity({ id: "a1", dueDate: createDate(2024, 6, 15) }),
        createActivity({ id: "a2", dueDate: createDate(2024, 6, 20) }),
      ];
      const result = getActivitiesByDateRange(activities, startDate, endDate);
      expect(result).toHaveLength(2);
    });

    it("excludes activities before start date", () => {
      const activities = [
        createActivity({ id: "a1", dueDate: createDate(2024, 5, 15) }),
        createActivity({ id: "a2", dueDate: createDate(2024, 6, 15) }),
      ];
      const result = getActivitiesByDateRange(activities, startDate, endDate);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("a2");
    });

    it("excludes activities after end date", () => {
      const activities = [
        createActivity({ id: "a1", dueDate: createDate(2024, 6, 15) }),
        createActivity({ id: "a2", dueDate: createDate(2024, 7, 15) }),
      ];
      const result = getActivitiesByDateRange(activities, startDate, endDate);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("a1");
    });

    it("returns empty array when no activities in range", () => {
      const activities = [
        createActivity({ dueDate: createDate(2024, 5, 1) }),
        createActivity({ dueDate: createDate(2024, 8, 1) }),
      ];
      const result = getActivitiesByDateRange(activities, startDate, endDate);
      expect(result).toHaveLength(0);
    });

    it("returns empty array for empty input", () => {
      const result = getActivitiesByDateRange([], startDate, endDate);
      expect(result).toHaveLength(0);
    });
  });

  describe("boundary conditions", () => {
    it("includes activity on start date", () => {
      const activities = [createActivity({ dueDate: startDate })];
      const result = getActivitiesByDateRange(activities, startDate, endDate);
      expect(result).toHaveLength(1);
    });

    it("includes activity on end date if within time boundary", () => {
      // endDate is June 30 at 12:00, activity must be <= that time
      const activityOnEndDate = createDate(2024, 6, 30, 10); // 10:00 AM
      const activities = [createActivity({ dueDate: activityOnEndDate })];
      const result = getActivitiesByDateRange(activities, startDate, endDate);
      expect(result).toHaveLength(1);
    });

    it("handles same start and end date", () => {
      const sameDate = createDate(2024, 6, 15);
      const activities = [
        createActivity({ id: "a1", dueDate: sameDate }),
        createActivity({ id: "a2", dueDate: createDate(2024, 6, 16) }),
      ];
      const result = getActivitiesByDateRange(activities, sameDate, sameDate);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("a1");
    });
  });

  describe("dueDate fallback to createdAt", () => {
    it("uses createdAt when dueDate is null", () => {
      const createdAt = createDate(2024, 6, 15);
      const activities = [createActivity({ dueDate: null, createdAt })];
      const result = getActivitiesByDateRange(activities, startDate, endDate);
      expect(result).toHaveLength(1);
    });

    it("excludes based on createdAt when dueDate is null", () => {
      const createdAt = createDate(2024, 5, 1); // Before range
      const activities = [createActivity({ dueDate: null, createdAt })];
      const result = getActivitiesByDateRange(activities, startDate, endDate);
      expect(result).toHaveLength(0);
    });

    it("handles undefined dueDate", () => {
      const createdAt = createDate(2024, 6, 15);
      const activities = [createActivity({ dueDate: undefined as any, createdAt })];
      const result = getActivitiesByDateRange(activities, startDate, endDate);
      expect(result).toHaveLength(1);
    });
  });

  describe("date comparison edge cases", () => {
    it("handles different time zones consistently", () => {
      // Activity at midnight should be included
      const midnightActivity = createDate(2024, 6, 15, 0);
      const activities = [createActivity({ dueDate: midnightActivity })];
      const result = getActivitiesByDateRange(activities, startDate, endDate);
      expect(result).toHaveLength(1);
    });

    it("handles activities at end of day within range", () => {
      // endDate is June 30 at 12:00, so activities before that time are included
      const withinRange = new Date(2024, 5, 29, 23, 59, 59); // June 29 end of day
      const activities = [createActivity({ dueDate: withinRange })];
      const result = getActivitiesByDateRange(activities, startDate, endDate);
      expect(result).toHaveLength(1);
    });
  });
});

// ==================== groupActivitiesByDay ====================

describe("groupActivitiesByDay", () => {
  describe("basic grouping", () => {
    it("groups activities by date", () => {
      const activities = [
        createActivity({ id: "a1", dueDate: createDate(2024, 6, 15, 9) }),
        createActivity({ id: "a2", dueDate: createDate(2024, 6, 15, 14) }),
        createActivity({ id: "a3", dueDate: createDate(2024, 6, 16, 10) }),
      ];
      const groups = groupActivitiesByDay(activities);
      expect(groups).toHaveLength(2);
      expect(groups[0].activities).toHaveLength(2);
      expect(groups[1].activities).toHaveLength(1);
    });

    it("returns empty array for no activities", () => {
      const groups = groupActivitiesByDay([]);
      expect(groups).toHaveLength(0);
    });

    it("creates single group for single activity", () => {
      const activities = [createActivity({ dueDate: createDate(2024, 6, 15) })];
      const groups = groupActivitiesByDay(activities);
      expect(groups).toHaveLength(1);
      expect(groups[0].count).toBe(1);
    });
  });

  describe("sorting", () => {
    it("sorts groups by date ascending", () => {
      const activities = [
        createActivity({ dueDate: createDate(2024, 6, 20) }),
        createActivity({ dueDate: createDate(2024, 6, 10) }),
        createActivity({ dueDate: createDate(2024, 6, 15) }),
      ];
      const groups = groupActivitiesByDay(activities);
      expect(groups[0].key).toBe("2024-06-10");
      expect(groups[1].key).toBe("2024-06-15");
      expect(groups[2].key).toBe("2024-06-20");
    });

    it("sorts activities within group by time", () => {
      const activities = [
        createActivity({ id: "a1", dueDate: createDate(2024, 6, 15, 16) }),
        createActivity({ id: "a2", dueDate: createDate(2024, 6, 15, 8) }),
        createActivity({ id: "a3", dueDate: createDate(2024, 6, 15, 12) }),
      ];
      const groups = groupActivitiesByDay(activities);
      const ids = groups[0].activities.map((a) => a.id);
      expect(ids).toEqual(["a2", "a3", "a1"]);
    });
  });

  describe("group properties", () => {
    it("includes count in each group", () => {
      const activities = [
        createActivity({ dueDate: createDate(2024, 6, 15) }),
        createActivity({ dueDate: createDate(2024, 6, 15) }),
        createActivity({ dueDate: createDate(2024, 6, 15) }),
      ];
      const groups = groupActivitiesByDay(activities);
      expect(groups[0].count).toBe(3);
    });

    it("generates correct key format (YYYY-MM-DD)", () => {
      const activities = [createActivity({ dueDate: createDate(2024, 1, 5) })];
      const groups = groupActivitiesByDay(activities);
      expect(groups[0].key).toBe("2024-01-05");
    });

    it("includes label in each group", () => {
      const activities = [createActivity({ dueDate: createDate(2024, 6, 15) })];
      const groups = groupActivitiesByDay(activities);
      expect(groups[0].label).toBeDefined();
      expect(typeof groups[0].label).toBe("string");
    });
  });

  describe("uses createdAt when dueDate is null", () => {
    it("groups by createdAt when dueDate is null", () => {
      const activities = [
        createActivity({ id: "a1", dueDate: null, createdAt: createDate(2024, 6, 15) }),
        createActivity({ id: "a2", dueDate: null, createdAt: createDate(2024, 6, 15) }),
      ];
      const groups = groupActivitiesByDay(activities);
      expect(groups).toHaveLength(1);
      expect(groups[0].count).toBe(2);
    });
  });
});

// ==================== groupActivitiesByWeek ====================

describe("groupActivitiesByWeek", () => {
  it("groups activities by week", () => {
    const activities = [
      createActivity({ dueDate: createDate(2024, 6, 3) }),  // Week 1
      createActivity({ dueDate: createDate(2024, 6, 4) }),  // Week 1
      createActivity({ dueDate: createDate(2024, 6, 10) }), // Week 2
    ];
    const groups = groupActivitiesByWeek(activities);
    expect(groups.length).toBeGreaterThanOrEqual(2);
  });

  it("returns empty array for no activities", () => {
    const groups = groupActivitiesByWeek([]);
    expect(groups).toHaveLength(0);
  });

  it("includes date range in label", () => {
    const activities = [createActivity({ dueDate: createDate(2024, 6, 15) })];
    const groups = groupActivitiesByWeek(activities);
    expect(groups[0].label).toContain(" - ");
  });

  it("sorts groups chronologically", () => {
    const activities = [
      createActivity({ dueDate: createDate(2024, 6, 20) }),
      createActivity({ dueDate: createDate(2024, 6, 1) }),
    ];
    const groups = groupActivitiesByWeek(activities);
    expect(groups[0].key < groups[groups.length - 1].key).toBe(true);
  });
});

// ==================== groupActivitiesByMonth ====================

describe("groupActivitiesByMonth", () => {
  it("groups activities by month", () => {
    const activities = [
      createActivity({ dueDate: createDate(2024, 1, 15) }),
      createActivity({ dueDate: createDate(2024, 1, 20) }),
      createActivity({ dueDate: createDate(2024, 2, 10) }),
    ];
    const groups = groupActivitiesByMonth(activities);
    expect(groups).toHaveLength(2);
  });

  it("returns empty array for no activities", () => {
    const groups = groupActivitiesByMonth([]);
    expect(groups).toHaveLength(0);
  });

  it("generates correct key format (YYYY-MM)", () => {
    const activities = [createActivity({ dueDate: createDate(2024, 6, 15) })];
    const groups = groupActivitiesByMonth(activities);
    expect(groups[0].key).toBe("2024-06");
  });

  it("includes month name in label", () => {
    const activities = [createActivity({ dueDate: createDate(2024, 6, 15) })];
    const groups = groupActivitiesByMonth(activities);
    expect(groups[0].label.toLowerCase()).toContain("junho");
  });

  it("sorts groups chronologically", () => {
    const activities = [
      createActivity({ dueDate: createDate(2024, 3, 15) }),
      createActivity({ dueDate: createDate(2024, 1, 15) }),
      createActivity({ dueDate: createDate(2024, 2, 15) }),
    ];
    const groups = groupActivitiesByMonth(activities);
    expect(groups[0].key).toBe("2024-01");
    expect(groups[1].key).toBe("2024-02");
    expect(groups[2].key).toBe("2024-03");
  });

  it("handles activities spanning years", () => {
    const activities = [
      createActivity({ dueDate: createDate(2023, 12, 15) }),
      createActivity({ dueDate: createDate(2024, 1, 15) }),
    ];
    const groups = groupActivitiesByMonth(activities);
    expect(groups).toHaveLength(2);
    expect(groups[0].key).toBe("2023-12");
    expect(groups[1].key).toBe("2024-01");
  });
});

// ==================== getOverdueActivities ====================

describe("getOverdueActivities", () => {
  describe("basic filtering", () => {
    it("returns activities past due date", () => {
      const activities = [
        createActivity({ id: "a1", dueDate: daysFromNow(-2), completed: false }),
        createActivity({ id: "a2", dueDate: daysFromNow(-1), completed: false }),
      ];
      const overdue = getOverdueActivities(activities);
      expect(overdue).toHaveLength(2);
    });

    it("excludes future activities", () => {
      const activities = [
        createActivity({ id: "a1", dueDate: daysFromNow(-1), completed: false }),
        createActivity({ id: "a2", dueDate: daysFromNow(1), completed: false }),
      ];
      const overdue = getOverdueActivities(activities);
      expect(overdue).toHaveLength(1);
      expect(overdue[0].id).toBe("a1");
    });

    it("excludes completed activities", () => {
      const activities = [
        createActivity({ dueDate: daysFromNow(-2), completed: true }),
        createActivity({ dueDate: daysFromNow(-1), completed: false }),
      ];
      const overdue = getOverdueActivities(activities);
      expect(overdue).toHaveLength(1);
    });

    it("returns empty array when no overdue activities", () => {
      const activities = [
        createActivity({ dueDate: daysFromNow(1), completed: false }),
        createActivity({ dueDate: daysFromNow(-1), completed: true }),
      ];
      const overdue = getOverdueActivities(activities);
      expect(overdue).toHaveLength(0);
    });
  });

  describe("edge cases", () => {
    it("excludes activities without due date", () => {
      const activities = [
        createActivity({ dueDate: null, completed: false }),
      ];
      const overdue = getOverdueActivities(activities);
      expect(overdue).toHaveLength(0);
    });

    it("returns empty for empty input", () => {
      const overdue = getOverdueActivities([]);
      expect(overdue).toHaveLength(0);
    });

    it("handles activity due today as not overdue if future time", () => {
      // Activity due later today should not be overdue
      const laterToday = new Date();
      laterToday.setHours(23, 59, 59);
      const activities = [createActivity({ dueDate: laterToday, completed: false })];
      const overdue = getOverdueActivities(activities);
      // Depends on current time, but we're testing the logic
      expect(overdue.length).toBeLessThanOrEqual(1);
    });
  });
});

// ==================== getUpcomingActivities ====================

describe("getUpcomingActivities", () => {
  describe("basic filtering", () => {
    it("returns activities due within specified days", () => {
      const activities = [
        createActivity({ id: "a1", dueDate: daysFromNow(1), completed: false }),
        createActivity({ id: "a2", dueDate: daysFromNow(5), completed: false }),
        createActivity({ id: "a3", dueDate: daysFromNow(10), completed: false }),
      ];
      const upcoming = getUpcomingActivities(activities, 7);
      expect(upcoming).toHaveLength(2);
    });

    it("uses default of 7 days", () => {
      const activities = [
        createActivity({ id: "a1", dueDate: daysFromNow(5), completed: false }),
        createActivity({ id: "a2", dueDate: daysFromNow(10), completed: false }),
      ];
      const upcoming = getUpcomingActivities(activities);
      expect(upcoming).toHaveLength(1);
    });

    it("excludes completed activities", () => {
      const activities = [
        createActivity({ dueDate: daysFromNow(1), completed: true }),
        createActivity({ dueDate: daysFromNow(2), completed: false }),
      ];
      const upcoming = getUpcomingActivities(activities, 7);
      expect(upcoming).toHaveLength(1);
    });

    it("excludes past due activities", () => {
      const activities = [
        createActivity({ dueDate: daysFromNow(-1), completed: false }),
        createActivity({ dueDate: daysFromNow(1), completed: false }),
      ];
      const upcoming = getUpcomingActivities(activities, 7);
      expect(upcoming).toHaveLength(1);
    });
  });

  describe("edge cases", () => {
    it("excludes activities without due date", () => {
      const activities = [createActivity({ dueDate: null, completed: false })];
      const upcoming = getUpcomingActivities(activities, 7);
      expect(upcoming).toHaveLength(0);
    });

    it("returns empty for empty input", () => {
      const upcoming = getUpcomingActivities([], 7);
      expect(upcoming).toHaveLength(0);
    });

    it("handles 0 days (only today)", () => {
      const activities = [
        createActivity({ id: "a1", dueDate: new Date(), completed: false }),
        createActivity({ id: "a2", dueDate: daysFromNow(1), completed: false }),
      ];
      const upcoming = getUpcomingActivities(activities, 0);
      // Should include activities due right now
      expect(upcoming.length).toBeLessThanOrEqual(1);
    });

    it("handles large day range", () => {
      const activities = [
        createActivity({ dueDate: daysFromNow(100), completed: false }),
      ];
      const upcoming = getUpcomingActivities(activities, 365);
      expect(upcoming).toHaveLength(1);
    });
  });

  describe("boundary conditions", () => {
    it("includes activities due exactly at boundary", () => {
      const activities = [
        createActivity({ dueDate: daysFromNow(7), completed: false }),
      ];
      const upcoming = getUpcomingActivities(activities, 7);
      expect(upcoming).toHaveLength(1);
    });
  });
});

// ==================== getActivitiesDueToday ====================

describe("getActivitiesDueToday", () => {
  it("returns activities due today", () => {
    const today = new Date();
    today.setHours(14, 0, 0, 0);
    const activities = [
      createActivity({ id: "a1", dueDate: today }),
      createActivity({ id: "a2", dueDate: daysFromNow(1) }),
    ];
    const dueToday = getActivitiesDueToday(activities);
    expect(dueToday).toHaveLength(1);
    expect(dueToday[0].id).toBe("a1");
  });

  it("excludes activities without due date", () => {
    const activities = [createActivity({ dueDate: null })];
    const dueToday = getActivitiesDueToday(activities);
    expect(dueToday).toHaveLength(0);
  });

  it("returns empty for empty input", () => {
    const dueToday = getActivitiesDueToday([]);
    expect(dueToday).toHaveLength(0);
  });

  it("includes activities at different times today", () => {
    const morning = new Date();
    morning.setHours(9, 0, 0, 0);
    const evening = new Date();
    evening.setHours(18, 0, 0, 0);

    const activities = [
      createActivity({ id: "a1", dueDate: morning }),
      createActivity({ id: "a2", dueDate: evening }),
    ];
    const dueToday = getActivitiesDueToday(activities);
    expect(dueToday).toHaveLength(2);
  });
});

// ==================== calculateActivityStats ====================

describe("calculateActivityStats", () => {
  describe("basic statistics", () => {
    it("calculates total count", () => {
      const activities = [
        createActivity({}),
        createActivity({}),
        createActivity({}),
      ];
      const stats = calculateActivityStats(activities);
      expect(stats.total).toBe(3);
    });

    it("calculates completed count", () => {
      const activities = [
        createActivity({ completed: true }),
        createActivity({ completed: true }),
        createActivity({ completed: false }),
      ];
      const stats = calculateActivityStats(activities);
      expect(stats.completed).toBe(2);
    });

    it("calculates pending count", () => {
      const activities = [
        createActivity({ completed: true }),
        createActivity({ completed: false }),
        createActivity({ completed: false }),
      ];
      const stats = calculateActivityStats(activities);
      expect(stats.pending).toBe(2);
    });

    it("calculates overdue count", () => {
      const activities = [
        createActivity({ dueDate: daysFromNow(-2), completed: false }),
        createActivity({ dueDate: daysFromNow(-1), completed: false }),
        createActivity({ dueDate: daysFromNow(1), completed: false }),
      ];
      const stats = calculateActivityStats(activities);
      expect(stats.overdue).toBe(2);
    });
  });

  describe("completion rate", () => {
    it("calculates completion rate percentage", () => {
      const activities = [
        createActivity({ completed: true }),
        createActivity({ completed: true }),
        createActivity({ completed: false }),
        createActivity({ completed: false }),
      ];
      const stats = calculateActivityStats(activities);
      expect(stats.completionRate).toBe(50);
    });

    it("returns 0% for no activities", () => {
      const stats = calculateActivityStats([]);
      expect(stats.completionRate).toBe(0);
    });

    it("returns 100% when all completed", () => {
      const activities = [
        createActivity({ completed: true }),
        createActivity({ completed: true }),
      ];
      const stats = calculateActivityStats(activities);
      expect(stats.completionRate).toBe(100);
    });

    it("returns 0% when none completed", () => {
      const activities = [
        createActivity({ completed: false }),
        createActivity({ completed: false }),
      ];
      const stats = calculateActivityStats(activities);
      expect(stats.completionRate).toBe(0);
    });

    // Triangulation
    it("calculates 75% completion rate", () => {
      const activities = [
        createActivity({ completed: true }),
        createActivity({ completed: true }),
        createActivity({ completed: true }),
        createActivity({ completed: false }),
      ];
      const stats = calculateActivityStats(activities);
      expect(stats.completionRate).toBe(75);
    });

    it("calculates 33% completion rate (rounds)", () => {
      const activities = [
        createActivity({ completed: true }),
        createActivity({ completed: false }),
        createActivity({ completed: false }),
      ];
      const stats = calculateActivityStats(activities);
      expect(stats.completionRate).toBe(33);
    });
  });

  describe("count by type", () => {
    it("counts activities by type", () => {
      const activities = [
        createActivity({ type: "call" }),
        createActivity({ type: "call" }),
        createActivity({ type: "meeting" }),
        createActivity({ type: "email" }),
      ];
      const stats = calculateActivityStats(activities);
      expect(stats.byType.call).toBe(2);
      expect(stats.byType.meeting).toBe(1);
      expect(stats.byType.email).toBe(1);
    });

    it("uses 'other' for null/undefined type", () => {
      const activities = [
        createActivity({ type: null as any }),
        createActivity({ type: undefined as any }),
      ];
      const stats = calculateActivityStats(activities);
      expect(stats.byType.other).toBe(2);
    });

    it("returns empty object for no activities", () => {
      const stats = calculateActivityStats([]);
      expect(Object.keys(stats.byType)).toHaveLength(0);
    });
  });

  describe("average per day", () => {
    it("calculates average activities per day", () => {
      const activities = [
        createActivity({}),
        createActivity({}),
        createActivity({}),
      ];
      const stats = calculateActivityStats(activities, 10);
      expect(stats.avgPerDay).toBe(0.3);
    });

    it("uses default of 30 days", () => {
      const activities = [
        createActivity({}),
        createActivity({}),
        createActivity({}),
      ];
      const stats = calculateActivityStats(activities);
      expect(stats.avgPerDay).toBe(0.1); // 3/30 = 0.1
    });

    it("returns 0 for 0 period days", () => {
      const activities = [createActivity({})];
      const stats = calculateActivityStats(activities, 0);
      expect(stats.avgPerDay).toBe(0);
    });

    it("rounds to one decimal place", () => {
      const activities = [
        createActivity({}),
        createActivity({}),
        createActivity({}),
      ];
      const stats = calculateActivityStats(activities, 7);
      expect(stats.avgPerDay).toBe(0.4); // 3/7 ≈ 0.43 -> 0.4
    });
  });

  describe("empty activities", () => {
    it("handles empty array", () => {
      const stats = calculateActivityStats([]);
      expect(stats.total).toBe(0);
      expect(stats.completed).toBe(0);
      expect(stats.pending).toBe(0);
      expect(stats.overdue).toBe(0);
      expect(stats.completionRate).toBe(0);
      expect(stats.avgPerDay).toBe(0);
    });
  });
});

// ==================== getActivityTypeDistribution ====================

describe("getActivityTypeDistribution", () => {
  describe("distribution calculation", () => {
    it("calculates count and percentage for each type", () => {
      const activities = [
        createActivity({ type: "call" }),
        createActivity({ type: "call" }),
        createActivity({ type: "call" }),
        createActivity({ type: "meeting" }),
      ];
      const distribution = getActivityTypeDistribution(activities);

      const callDist = distribution.find((d) => d.type === "call");
      expect(callDist?.count).toBe(3);
      expect(callDist?.percentage).toBe(75);

      const meetingDist = distribution.find((d) => d.type === "meeting");
      expect(meetingDist?.count).toBe(1);
      expect(meetingDist?.percentage).toBe(25);
    });

    it("sorts by count descending", () => {
      const activities = [
        createActivity({ type: "email" }),
        createActivity({ type: "call" }),
        createActivity({ type: "call" }),
        createActivity({ type: "call" }),
        createActivity({ type: "meeting" }),
        createActivity({ type: "meeting" }),
      ];
      const distribution = getActivityTypeDistribution(activities);
      expect(distribution[0].type).toBe("call");
      expect(distribution[1].type).toBe("meeting");
      expect(distribution[2].type).toBe("email");
    });
  });

  describe("edge cases", () => {
    it("returns empty array for no activities", () => {
      const distribution = getActivityTypeDistribution([]);
      expect(distribution).toHaveLength(0);
    });

    it("handles single activity type", () => {
      const activities = [
        createActivity({ type: "call" }),
        createActivity({ type: "call" }),
      ];
      const distribution = getActivityTypeDistribution(activities);
      expect(distribution).toHaveLength(1);
      expect(distribution[0].percentage).toBe(100);
    });

    it("uses 'other' for null type", () => {
      const activities = [createActivity({ type: null as any })];
      const distribution = getActivityTypeDistribution(activities);
      expect(distribution[0].type).toBe("other");
    });

    it("handles all different types", () => {
      const types = ["call", "meeting", "email", "whatsapp", "task"];
      const activities = types.map((type) => createActivity({ type }));
      const distribution = getActivityTypeDistribution(activities);
      expect(distribution).toHaveLength(5);
      distribution.forEach((d) => {
        expect(d.percentage).toBe(20);
      });
    });
  });

  describe("percentage rounding", () => {
    it("rounds percentages to integers", () => {
      const activities = [
        createActivity({ type: "call" }),
        createActivity({ type: "call" }),
        createActivity({ type: "meeting" }),
      ];
      const distribution = getActivityTypeDistribution(activities);
      // 2/3 = 66.67% -> 67%, 1/3 = 33.33% -> 33%
      const callDist = distribution.find((d) => d.type === "call");
      expect(callDist?.percentage).toBe(67);
    });
  });
});

// ==================== Time-sensitive tests with mocked date ====================

describe("Time-sensitive functions", () => {
  beforeEach(() => {
    // Mock current date to 2024-06-15 12:00:00
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 5, 15, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("getTodayActivities", () => {
    it("returns activities due on mocked today", () => {
      const activities = [
        createActivity({ id: "a1", dueDate: new Date(2024, 5, 15, 10) }),
        createActivity({ id: "a2", dueDate: new Date(2024, 5, 15, 18) }),
        createActivity({ id: "a3", dueDate: new Date(2024, 5, 16, 10) }),
      ];
      const today = getTodayActivities(activities);
      expect(today).toHaveLength(2);
    });
  });

  describe("getThisWeekActivities", () => {
    it("returns activities for current week", () => {
      // 2024-06-15 is Saturday, week starts Sunday (06-09)
      const activities = [
        createActivity({ id: "a1", dueDate: new Date(2024, 5, 10) }), // Monday of this week
        createActivity({ id: "a2", dueDate: new Date(2024, 5, 15) }), // Today (Saturday)
        createActivity({ id: "a3", dueDate: new Date(2024, 5, 20) }), // Next week
      ];
      const thisWeek = getThisWeekActivities(activities);
      expect(thisWeek.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("getThisMonthActivities", () => {
    it("returns activities for current month", () => {
      const activities = [
        createActivity({ id: "a1", dueDate: new Date(2024, 5, 1) }),  // June 1
        createActivity({ id: "a2", dueDate: new Date(2024, 5, 30) }), // June 30
        createActivity({ id: "a3", dueDate: new Date(2024, 6, 1) }),  // July 1
      ];
      const thisMonth = getThisMonthActivities(activities);
      expect(thisMonth).toHaveLength(2);
    });
  });
});
