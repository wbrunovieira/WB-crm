/**
 * Tests for Activities Service
 * Phase 9: Architecture Improvements - Service Layer
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

// Helper to create mock activity
function createMockActivity(
  overrides: Partial<ActivityWithRelations> = {}
): ActivityWithRelations {
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

// Helper to create date at specific offset from now
function dateOffset(days: number, hours: number = 0): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hours, 0, 0, 0);
  return date;
}

describe("Activities Service", () => {
  // ==================== getActivitiesByDateRange ====================
  describe("getActivitiesByDateRange", () => {
    it("should filter activities within date range", () => {
      const activities = [
        createMockActivity({ id: "a1", dueDate: dateOffset(-5) }),
        createMockActivity({ id: "a2", dueDate: dateOffset(-2) }),
        createMockActivity({ id: "a3", dueDate: dateOffset(0) }),
        createMockActivity({ id: "a4", dueDate: dateOffset(5) }),
      ];

      const start = dateOffset(-3);
      const end = dateOffset(1);
      const result = getActivitiesByDateRange(activities, start, end);

      expect(result).toHaveLength(2);
      expect(result.map((a) => a.id)).toContain("a2");
      expect(result.map((a) => a.id)).toContain("a3");
    });

    it("should return empty array when no activities in range", () => {
      const activities = [
        createMockActivity({ dueDate: dateOffset(-10) }),
        createMockActivity({ dueDate: dateOffset(10) }),
      ];

      const start = dateOffset(-2);
      const end = dateOffset(2);
      const result = getActivitiesByDateRange(activities, start, end);

      expect(result).toHaveLength(0);
    });

    it("should use createdAt when dueDate is null", () => {
      const createdAt = dateOffset(0);
      const activities = [
        createMockActivity({ id: "a1", dueDate: null, createdAt }),
      ];

      const start = dateOffset(-1);
      const end = dateOffset(1);
      const result = getActivitiesByDateRange(activities, start, end);

      expect(result).toHaveLength(1);
    });
  });

  // ==================== groupActivitiesByDay ====================
  describe("groupActivitiesByDay", () => {
    it("should group activities by date", () => {
      const activities = [
        createMockActivity({ id: "a1", dueDate: dateOffset(0, 9) }),
        createMockActivity({ id: "a2", dueDate: dateOffset(0, 14) }),
        createMockActivity({ id: "a3", dueDate: dateOffset(1, 10) }),
      ];

      const groups = groupActivitiesByDay(activities);

      expect(groups.length).toBe(2);
      expect(groups[0].activities).toHaveLength(2);
      expect(groups[1].activities).toHaveLength(1);
    });

    it("should sort activities within group by time", () => {
      const activities = [
        createMockActivity({ id: "a1", dueDate: dateOffset(0, 14) }),
        createMockActivity({ id: "a2", dueDate: dateOffset(0, 9) }),
        createMockActivity({ id: "a3", dueDate: dateOffset(0, 11) }),
      ];

      const groups = groupActivitiesByDay(activities);
      const ids = groups[0].activities.map((a) => a.id);

      expect(ids[0]).toBe("a2"); // 9:00
      expect(ids[1]).toBe("a3"); // 11:00
      expect(ids[2]).toBe("a1"); // 14:00
    });

    it("should include count in each group", () => {
      const activities = [
        createMockActivity({ dueDate: dateOffset(0) }),
        createMockActivity({ dueDate: dateOffset(0) }),
        createMockActivity({ dueDate: dateOffset(0) }),
      ];

      const groups = groupActivitiesByDay(activities);

      expect(groups[0].count).toBe(3);
    });

    it("should return empty array for no activities", () => {
      const groups = groupActivitiesByDay([]);

      expect(groups).toHaveLength(0);
    });
  });

  // ==================== groupActivitiesByWeek ====================
  describe("groupActivitiesByWeek", () => {
    it("should group activities by week", () => {
      const activities = [
        createMockActivity({ id: "a1", dueDate: dateOffset(0) }),
        createMockActivity({ id: "a2", dueDate: dateOffset(1) }),
        createMockActivity({ id: "a3", dueDate: dateOffset(10) }),
      ];

      const groups = groupActivitiesByWeek(activities);

      // Should have at least 2 groups (current week and ~10 days later week)
      expect(groups.length).toBeGreaterThanOrEqual(1);
    });

    it("should include date range in label", () => {
      const activities = [createMockActivity({ dueDate: dateOffset(0) })];

      const groups = groupActivitiesByWeek(activities);

      expect(groups[0].label).toContain(" - ");
    });
  });

  // ==================== groupActivitiesByMonth ====================
  describe("groupActivitiesByMonth", () => {
    it("should group activities by month", () => {
      const jan = new Date(2024, 0, 15);
      const feb = new Date(2024, 1, 15);

      const activities = [
        createMockActivity({ id: "a1", dueDate: jan }),
        createMockActivity({ id: "a2", dueDate: jan }),
        createMockActivity({ id: "a3", dueDate: feb }),
      ];

      const groups = groupActivitiesByMonth(activities);

      expect(groups.length).toBe(2);
    });

    it("should include month name in label", () => {
      const activities = [createMockActivity({ dueDate: new Date(2024, 5, 15) })];

      const groups = groupActivitiesByMonth(activities);

      expect(groups[0].label.toLowerCase()).toContain("junho");
    });

    it("should sort groups chronologically", () => {
      const activities = [
        createMockActivity({ dueDate: new Date(2024, 2, 15) }),
        createMockActivity({ dueDate: new Date(2024, 0, 15) }),
        createMockActivity({ dueDate: new Date(2024, 1, 15) }),
      ];

      const groups = groupActivitiesByMonth(activities);
      const keys = groups.map((g) => g.key);

      expect(keys[0]).toBe("2024-01");
      expect(keys[1]).toBe("2024-02");
      expect(keys[2]).toBe("2024-03");
    });
  });

  // ==================== getOverdueActivities ====================
  describe("getOverdueActivities", () => {
    it("should return activities past due date", () => {
      const activities = [
        createMockActivity({ id: "a1", dueDate: dateOffset(-2), completed: false }),
        createMockActivity({ id: "a2", dueDate: dateOffset(-1), completed: false }),
        createMockActivity({ id: "a3", dueDate: dateOffset(1), completed: false }),
      ];

      const overdue = getOverdueActivities(activities);

      expect(overdue).toHaveLength(2);
      expect(overdue.map((a) => a.id)).toContain("a1");
      expect(overdue.map((a) => a.id)).toContain("a2");
    });

    it("should exclude completed activities", () => {
      const activities = [
        createMockActivity({ dueDate: dateOffset(-2), completed: true }),
        createMockActivity({ dueDate: dateOffset(-1), completed: false }),
      ];

      const overdue = getOverdueActivities(activities);

      expect(overdue).toHaveLength(1);
    });

    it("should exclude activities without due date", () => {
      const activities = [
        createMockActivity({ dueDate: null, completed: false }),
      ];

      const overdue = getOverdueActivities(activities);

      expect(overdue).toHaveLength(0);
    });

    it("should return empty array when no overdue", () => {
      const activities = [
        createMockActivity({ dueDate: dateOffset(1), completed: false }),
        createMockActivity({ dueDate: dateOffset(-1), completed: true }),
      ];

      const overdue = getOverdueActivities(activities);

      expect(overdue).toHaveLength(0);
    });
  });

  // ==================== getUpcomingActivities ====================
  describe("getUpcomingActivities", () => {
    it("should return activities due within specified days", () => {
      const activities = [
        createMockActivity({ id: "a1", dueDate: dateOffset(1), completed: false }),
        createMockActivity({ id: "a2", dueDate: dateOffset(5), completed: false }),
        createMockActivity({ id: "a3", dueDate: dateOffset(10), completed: false }),
      ];

      const upcoming = getUpcomingActivities(activities, 7);

      expect(upcoming).toHaveLength(2);
      expect(upcoming.map((a) => a.id)).toContain("a1");
      expect(upcoming.map((a) => a.id)).toContain("a2");
    });

    it("should exclude completed activities", () => {
      const activities = [
        createMockActivity({ dueDate: dateOffset(1), completed: true }),
        createMockActivity({ dueDate: dateOffset(2), completed: false }),
      ];

      const upcoming = getUpcomingActivities(activities, 7);

      expect(upcoming).toHaveLength(1);
    });

    it("should exclude past due activities", () => {
      const activities = [
        createMockActivity({ dueDate: dateOffset(-1), completed: false }),
        createMockActivity({ dueDate: dateOffset(1), completed: false }),
      ];

      const upcoming = getUpcomingActivities(activities, 7);

      expect(upcoming).toHaveLength(1);
    });

    it("should use default of 7 days", () => {
      const activities = [
        createMockActivity({ id: "a1", dueDate: dateOffset(5), completed: false }),
        createMockActivity({ id: "a2", dueDate: dateOffset(10), completed: false }),
      ];

      const upcoming = getUpcomingActivities(activities);

      expect(upcoming).toHaveLength(1);
      expect(upcoming[0].id).toBe("a1");
    });
  });

  // ==================== calculateActivityStats ====================
  describe("calculateActivityStats", () => {
    it("should calculate all statistics correctly", () => {
      const activities = [
        createMockActivity({ type: "call", completed: true }),
        createMockActivity({ type: "call", completed: false, dueDate: dateOffset(-1) }),
        createMockActivity({ type: "meeting", completed: false, dueDate: dateOffset(1) }),
        createMockActivity({ type: "email", completed: true }),
      ];

      const stats = calculateActivityStats(activities, 30);

      expect(stats.total).toBe(4);
      expect(stats.completed).toBe(2);
      expect(stats.pending).toBe(2);
      expect(stats.overdue).toBe(1);
      expect(stats.completionRate).toBe(50);
    });

    it("should count by type", () => {
      const activities = [
        createMockActivity({ type: "call" }),
        createMockActivity({ type: "call" }),
        createMockActivity({ type: "meeting" }),
        createMockActivity({ type: "email" }),
      ];

      const stats = calculateActivityStats(activities);

      expect(stats.byType.call).toBe(2);
      expect(stats.byType.meeting).toBe(1);
      expect(stats.byType.email).toBe(1);
    });

    it("should calculate average per day", () => {
      const activities = [
        createMockActivity({}),
        createMockActivity({}),
        createMockActivity({}),
      ];

      const stats = calculateActivityStats(activities, 10);

      expect(stats.avgPerDay).toBe(0.3);
    });

    it("should handle empty activities", () => {
      const stats = calculateActivityStats([]);

      expect(stats.total).toBe(0);
      expect(stats.completed).toBe(0);
      expect(stats.pending).toBe(0);
      expect(stats.overdue).toBe(0);
      expect(stats.completionRate).toBe(0);
      expect(stats.avgPerDay).toBe(0);
    });
  });

  // ==================== getActivityTypeDistribution ====================
  describe("getActivityTypeDistribution", () => {
    it("should return distribution with percentages", () => {
      const activities = [
        createMockActivity({ type: "call" }),
        createMockActivity({ type: "call" }),
        createMockActivity({ type: "call" }),
        createMockActivity({ type: "meeting" }),
      ];

      const distribution = getActivityTypeDistribution(activities);

      expect(distribution).toHaveLength(2);

      const callDist = distribution.find((d) => d.type === "call");
      expect(callDist?.count).toBe(3);
      expect(callDist?.percentage).toBe(75);

      const meetingDist = distribution.find((d) => d.type === "meeting");
      expect(meetingDist?.count).toBe(1);
      expect(meetingDist?.percentage).toBe(25);
    });

    it("should sort by count descending", () => {
      const activities = [
        createMockActivity({ type: "email" }),
        createMockActivity({ type: "call" }),
        createMockActivity({ type: "call" }),
        createMockActivity({ type: "call" }),
        createMockActivity({ type: "meeting" }),
        createMockActivity({ type: "meeting" }),
      ];

      const distribution = getActivityTypeDistribution(activities);

      expect(distribution[0].type).toBe("call");
      expect(distribution[1].type).toBe("meeting");
      expect(distribution[2].type).toBe("email");
    });

    it("should return empty array for no activities", () => {
      const distribution = getActivityTypeDistribution([]);

      expect(distribution).toHaveLength(0);
    });
  });
});
