/**
 * Tests for Manager Validation Functions
 */

import { describe, it, expect } from "vitest";
import {
  dateRangeSchema,
  getDateRangeFromPeriod,
  getPreviousPeriodRange,
} from "@/lib/validations/manager";

describe("Manager Validations", () => {
  describe("dateRangeSchema", () => {
    it("should accept valid period options", () => {
      expect(dateRangeSchema.parse({ period: "today" })).toMatchObject({
        period: "today",
      });
      expect(dateRangeSchema.parse({ period: "week" })).toMatchObject({
        period: "week",
      });
      expect(dateRangeSchema.parse({ period: "month" })).toMatchObject({
        period: "month",
      });
    });

    it("should default to month when no period provided", () => {
      const result = dateRangeSchema.parse({});
      expect(result.period).toBe("month");
    });

    it("should require dates for custom period", () => {
      expect(() =>
        dateRangeSchema.parse({ period: "custom" })
      ).toThrow();

      expect(() =>
        dateRangeSchema.parse({
          period: "custom",
          startDate: new Date(),
        })
      ).toThrow();
    });

    it("should accept custom period with valid dates", () => {
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-01-31");

      const result = dateRangeSchema.parse({
        period: "custom",
        startDate,
        endDate,
      });

      expect(result.period).toBe("custom");
      expect(result.startDate).toEqual(startDate);
      expect(result.endDate).toEqual(endDate);
    });

    it("should reject end date before start date", () => {
      expect(() =>
        dateRangeSchema.parse({
          period: "custom",
          startDate: new Date("2024-01-31"),
          endDate: new Date("2024-01-01"),
        })
      ).toThrow();
    });

    it("should coerce string dates to Date objects", () => {
      const result = dateRangeSchema.parse({
        period: "custom",
        startDate: "2024-01-01",
        endDate: "2024-01-31",
      });

      expect(result.startDate).toBeInstanceOf(Date);
      expect(result.endDate).toBeInstanceOf(Date);
    });
  });

  describe("getDateRangeFromPeriod", () => {
    it("should return today's range for 'today'", () => {
      const { startDate, endDate } = getDateRangeFromPeriod("today");
      const now = new Date();

      expect(startDate.getFullYear()).toBe(now.getFullYear());
      expect(startDate.getMonth()).toBe(now.getMonth());
      expect(startDate.getDate()).toBe(now.getDate());
      expect(startDate.getHours()).toBe(0);
      expect(startDate.getMinutes()).toBe(0);

      expect(endDate.getFullYear()).toBe(now.getFullYear());
      expect(endDate.getMonth()).toBe(now.getMonth());
      expect(endDate.getDate()).toBe(now.getDate());
      expect(endDate.getHours()).toBe(23);
      expect(endDate.getMinutes()).toBe(59);
    });

    it("should return 7 days range for 'week'", () => {
      const { startDate, endDate } = getDateRangeFromPeriod("week");
      const now = new Date();

      // Start date should be 7 days ago
      const expectedStart = new Date(now);
      expectedStart.setDate(now.getDate() - 7);

      expect(startDate.getDate()).toBe(expectedStart.getDate());
      expect(endDate.getDate()).toBe(now.getDate());
    });

    it("should return 1 month range for 'month'", () => {
      const { startDate, endDate } = getDateRangeFromPeriod("month");
      const now = new Date();

      // Start date should be 1 month ago
      const expectedStart = new Date(now);
      expectedStart.setMonth(now.getMonth() - 1);

      expect(startDate.getMonth()).toBe(expectedStart.getMonth());
      expect(endDate.getMonth()).toBe(now.getMonth());
    });

    it("should return default 1 month range for 'custom'", () => {
      const { startDate, endDate } = getDateRangeFromPeriod("custom");
      const now = new Date();

      const expectedStart = new Date(now);
      expectedStart.setMonth(now.getMonth() - 1);

      expect(startDate.getMonth()).toBe(expectedStart.getMonth());
    });
  });

  describe("getPreviousPeriodRange", () => {
    it("should return previous period of same length", () => {
      const startDate = new Date("2024-01-15");
      const endDate = new Date("2024-01-31");

      const { startDate: prevStart, endDate: prevEnd } =
        getPreviousPeriodRange(startDate, endDate);

      // Period length is 16 days (Jan 15-31)
      // Previous period should be Dec 30 - Jan 14
      expect(prevEnd.getTime()).toBeLessThan(startDate.getTime());

      // Previous period should have same length
      const currentLength = endDate.getTime() - startDate.getTime();
      const previousLength = prevEnd.getTime() - prevStart.getTime() + 1; // +1 because prevEnd is day before

      // Allow for 1 day difference due to time calculations
      expect(Math.abs(previousLength - currentLength)).toBeLessThanOrEqual(
        86400000
      ); // 1 day in ms
    });

    it("should handle month boundaries correctly", () => {
      const startDate = new Date("2024-02-01");
      const endDate = new Date("2024-02-29"); // Leap year

      const { startDate: prevStart, endDate: prevEnd } =
        getPreviousPeriodRange(startDate, endDate);

      expect(prevEnd.getTime()).toBeLessThan(startDate.getTime());
      expect(prevStart.getTime()).toBeLessThan(prevEnd.getTime());
    });

    it("should work for single day period", () => {
      const startDate = new Date("2024-01-15T00:00:00");
      const endDate = new Date("2024-01-15T23:59:59");

      const { startDate: prevStart, endDate: prevEnd } =
        getPreviousPeriodRange(startDate, endDate);

      // Previous period should be approximately the same day before
      expect(prevEnd.getTime()).toBeLessThan(startDate.getTime());
    });
  });
});
