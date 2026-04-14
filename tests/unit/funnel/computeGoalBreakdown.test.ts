import { describe, it, expect } from "vitest";
import { computeGoalBreakdown } from "@/lib/funnel/computeGoalBreakdown";

describe("computeGoalBreakdown", () => {
  it("returns all zeros when targetSales is 0", () => {
    const breakdown = computeGoalBreakdown(0);
    expect(breakdown.requiredCalls).toBe(0);
    expect(breakdown.requiredConnections).toBe(0);
    expect(breakdown.requiredDecisorConnections).toBe(0);
    expect(breakdown.requiredMeetingsScheduled).toBe(0);
    expect(breakdown.requiredMeetingsHeld).toBe(0);
    expect(breakdown.targetSales).toBe(0);
  });

  it("calculates backwards using default rates", () => {
    // targetSales = 6
    // reuniõesHeld = ceil(6 / 0.33) = ceil(18.18) = 19
    // reuniõesScheduled = ceil(19 / 0.82) = ceil(23.17) = 24
    // decisorConnections = ceil(24 / 0.32) = ceil(75) = 75
    // connections = ceil(75 / 0.16) = ceil(468.75) = 469
    // calls = ceil(469 / 0.59) = ceil(794.9) = 795
    const breakdown = computeGoalBreakdown(6);
    expect(breakdown.targetSales).toBe(6);
    expect(breakdown.requiredMeetingsHeld).toBe(19);
    expect(breakdown.requiredMeetingsScheduled).toBe(24);
    expect(breakdown.requiredDecisorConnections).toBe(75);
    expect(breakdown.requiredConnections).toBe(469);
    expect(breakdown.requiredCalls).toBe(795);
  });

  it("uses custom rates when provided", () => {
    // targetSales = 1, all rates = 1.0 → everything = 1
    const breakdown = computeGoalBreakdown(1, {
      salesRate: 1,
      holdRate: 1,
      meetingRate: 1,
      decisorRate: 1,
      connectionRate: 1,
    });
    expect(breakdown.requiredMeetingsHeld).toBe(1);
    expect(breakdown.requiredMeetingsScheduled).toBe(1);
    expect(breakdown.requiredDecisorConnections).toBe(1);
    expect(breakdown.requiredConnections).toBe(1);
    expect(breakdown.requiredCalls).toBe(1);
  });

  it("applies Math.ceil for conservative rounding", () => {
    // targetSales = 1, salesRate = 0.5 → ceil(2)
    const breakdown = computeGoalBreakdown(1, {
      salesRate: 0.5,
      holdRate: 1,
      meetingRate: 1,
      decisorRate: 1,
      connectionRate: 1,
    });
    expect(breakdown.requiredMeetingsHeld).toBe(2);
  });

  it("returns targetSales = 1 with default rates (validate spreadsheet-like ratios)", () => {
    const breakdown = computeGoalBreakdown(1);
    // All values must be positive integers
    expect(breakdown.requiredCalls).toBeGreaterThan(0);
    expect(breakdown.requiredConnections).toBeGreaterThan(0);
    expect(breakdown.requiredDecisorConnections).toBeGreaterThan(0);
    expect(breakdown.requiredMeetingsScheduled).toBeGreaterThan(0);
    expect(breakdown.requiredMeetingsHeld).toBeGreaterThan(0);
    // Funnel narrows from calls → sales
    expect(breakdown.requiredCalls).toBeGreaterThanOrEqual(breakdown.requiredConnections);
    expect(breakdown.requiredConnections).toBeGreaterThanOrEqual(breakdown.requiredDecisorConnections);
    expect(breakdown.requiredDecisorConnections).toBeGreaterThanOrEqual(breakdown.requiredMeetingsScheduled);
    expect(breakdown.requiredMeetingsScheduled).toBeGreaterThanOrEqual(breakdown.requiredMeetingsHeld);
  });
});
