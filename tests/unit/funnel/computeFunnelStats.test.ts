import { describe, it, expect } from "vitest";
import { computeFunnelStats, type FunnelActivity, type FunnelDeal } from "@/lib/funnel/computeFunnelStats";

const WEEK_START = new Date("2026-04-14T00:00:00.000Z"); // Monday
const WEEK_END   = new Date("2026-04-21T00:00:00.000Z"); // next Monday

function call(overrides: Partial<FunnelActivity> = {}): FunnelActivity {
  return {
    type: "call",
    gotoDuration: null,
    callContactType: null,
    completed: true,
    meetingNoShow: false,
    dueDate: new Date("2026-04-14T10:00:00.000Z"),
    leadId: null,
    contactId: null,
    ...overrides,
  };
}

function meeting(overrides: Partial<FunnelActivity> = {}): FunnelActivity {
  return {
    type: "meeting",
    gotoDuration: null,
    callContactType: null,
    completed: true,
    meetingNoShow: false,
    dueDate: new Date("2026-04-15T10:00:00.000Z"),
    leadId: null,
    contactId: null,
    ...overrides,
  };
}

function wonDeal(closedAt: Date): FunnelDeal {
  return { status: "won", closedAt };
}

describe("computeFunnelStats", () => {
  it("returns all zeros for empty arrays", () => {
    const stats = computeFunnelStats([], [], WEEK_START, WEEK_END);
    expect(stats).toEqual({
      calls: 0,
      connections: 0,
      decisorConnections: 0,
      meetingsScheduled: 0,
      meetingsHeld: 0,
      sales: 0,
    });
  });

  it("counts calls in week range", () => {
    const activities: FunnelActivity[] = [
      call({ dueDate: new Date("2026-04-14T00:00:00.000Z") }), // first moment of week — included
      call({ dueDate: new Date("2026-04-20T23:59:59.000Z") }), // last moment of week — included
      call({ dueDate: new Date("2026-04-21T00:00:00.000Z") }), // weekEnd — excluded
      call({ dueDate: new Date("2026-04-13T23:59:59.000Z") }), // before week — excluded
    ];
    const stats = computeFunnelStats(activities, [], WEEK_START, WEEK_END);
    expect(stats.calls).toBe(2);
  });

  it("does not count non-call activities as calls", () => {
    const activities: FunnelActivity[] = [
      meeting(),
      { type: "email", gotoDuration: null, callContactType: null, completed: true, meetingNoShow: false, dueDate: new Date("2026-04-14T10:00:00.000Z"), leadId: null, contactId: null },
    ];
    const stats = computeFunnelStats(activities, [], WEEK_START, WEEK_END);
    expect(stats.calls).toBe(0);
  });

  it("counts connection only when gotoDuration > 60", () => {
    const activities: FunnelActivity[] = [
      call({ gotoDuration: null }),   // no duration — not a connection
      call({ gotoDuration: 60 }),     // exactly 60 — NOT a connection
      call({ gotoDuration: 61 }),     // 61s — IS a connection
      call({ gotoDuration: 300 }),    // 5 min — IS a connection
    ];
    const stats = computeFunnelStats(activities, [], WEEK_START, WEEK_END);
    expect(stats.calls).toBe(4);
    expect(stats.connections).toBe(2);
  });

  it("counts decisorConnections only for calls with callContactType=decisor", () => {
    const activities: FunnelActivity[] = [
      call({ gotoDuration: 120, callContactType: "decisor" }),
      call({ gotoDuration: 120, callContactType: "gatekeeper" }),
      call({ gotoDuration: 120, callContactType: null }),
    ];
    const stats = computeFunnelStats(activities, [], WEEK_START, WEEK_END);
    expect(stats.decisorConnections).toBe(1);
  });

  it("counts meetingsScheduled by type=meeting in week range", () => {
    const activities: FunnelActivity[] = [
      meeting(),
      meeting({ dueDate: new Date("2026-04-21T00:00:00.000Z") }), // out of range
      call(),
    ];
    const stats = computeFunnelStats(activities, [], WEEK_START, WEEK_END);
    expect(stats.meetingsScheduled).toBe(1);
  });

  it("meetingsHeld = completed meetings that are not no-show", () => {
    const activities: FunnelActivity[] = [
      meeting({ completed: true,  meetingNoShow: false }),  // held
      meeting({ completed: true,  meetingNoShow: true }),   // no-show — not held
      meeting({ completed: false, meetingNoShow: false }),  // not completed — not held
    ];
    const stats = computeFunnelStats(activities, [], WEEK_START, WEEK_END);
    expect(stats.meetingsScheduled).toBe(3);
    expect(stats.meetingsHeld).toBe(1);
  });

  it("counts sales from won deals with closedAt in week range", () => {
    const deals: FunnelDeal[] = [
      wonDeal(new Date("2026-04-14T00:00:00.000Z")),  // in range
      wonDeal(new Date("2026-04-20T23:59:59.000Z")),  // in range
      wonDeal(new Date("2026-04-21T00:00:00.000Z")),  // out of range (weekEnd)
      wonDeal(new Date("2026-04-13T23:59:59.000Z")),  // before week
      { status: "lost", closedAt: new Date("2026-04-15T10:00:00.000Z") },  // lost — not counted
      { status: "open", closedAt: null },
    ];
    const stats = computeFunnelStats([], deals, WEEK_START, WEEK_END);
    expect(stats.sales).toBe(2);
  });

  it("handles real-world scenario similar to spreadsheet", () => {
    const activities: FunnelActivity[] = [
      // 4 calls: 2 connections, 1 decisor
      call({ gotoDuration: 30 }),
      call({ gotoDuration: 120, callContactType: "gatekeeper" }),
      call({ gotoDuration: 200, callContactType: "decisor" }),
      call({ gotoDuration: null }),
      // 2 meetings: 1 held, 1 no-show
      meeting({ completed: true,  meetingNoShow: false }),
      meeting({ completed: true,  meetingNoShow: true }),
    ];
    const deals: FunnelDeal[] = [
      wonDeal(new Date("2026-04-15T10:00:00.000Z")),
    ];
    const stats = computeFunnelStats(activities, deals, WEEK_START, WEEK_END);
    expect(stats.calls).toBe(4);
    expect(stats.connections).toBe(2);
    expect(stats.decisorConnections).toBe(1);
    expect(stats.meetingsScheduled).toBe(2);
    expect(stats.meetingsHeld).toBe(1);
    expect(stats.sales).toBe(1);
  });
});
