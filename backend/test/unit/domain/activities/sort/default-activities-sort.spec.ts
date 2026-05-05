import { describe, it, expect } from "vitest";
import { sortActivitiesDefaultOrder } from "@/domain/activities/application/sort/default-activities-sort";
import type { ActivitySummary } from "@/domain/activities/enterprise/read-models/activity-read-models";

const BASE: Omit<ActivitySummary, "id" | "dueDate" | "completed" | "lead"> = {
  ownerId: "owner-1",
  type: "call",
  subject: "",
  description: null,
  completedAt: null,
  failedAt: null,
  failReason: null,
  skippedAt: null,
  skipReason: null,
  dealId: null,
  additionalDealIds: null,
  contactId: null,
  contactIds: null,
  leadContactIds: null,
  leadId: null,
  partnerId: null,
  callContactType: null,
  meetingNoShow: false,
  gotoCallId: null,
  gotoCallOutcome: null,
  gotoDuration: null,
  gotoTranscriptText: null,
  emailThreadId: null,
  emailSubject: null,
  emailFromAddress: null,
  emailFromName: null,
  emailReplied: false,
  emailOpenCount: 0,
  emailOpenedAt: null,
  emailLinkClickCount: 0,
  emailLinkClickedAt: null,
  createdAt: new Date("2026-05-05T12:00:00Z"),
  updatedAt: new Date("2026-05-05T12:00:00Z"),
  owner: null,
  deal: null,
  contact: null,
  partner: null,
  cadenceActivity: null,
};

function act(
  id: string,
  dueDate: string | null,
  completed: boolean,
  overrides: Partial<ActivitySummary> = {},
): ActivitySummary {
  return {
    ...BASE,
    id,
    dueDate: dueDate ? new Date(dueDate) : null,
    completed,
    lead: null,
    ...overrides,
  };
}

describe("sortActivitiesDefaultOrder", () => {
  it("within the same day — incomplete activities come before completed ones", () => {
    const activities = [
      act("c1", "2026-05-05T14:00:00Z", true),  // completed, but created before the pending one
      act("p1", "2026-05-05T09:00:00Z", false),
    ];

    const result = sortActivitiesDefaultOrder(activities);
    expect(result.map((a) => a.id)).toEqual(["p1", "c1"]);
  });

  it("different days — earlier day comes first regardless of completion status", () => {
    const activities = [
      act("p2", "2026-05-06T08:00:00Z", false), // tomorrow, pending
      act("c1", "2026-05-05T08:00:00Z", true),  // today, completed
      act("p1", "2026-05-05T08:00:00Z", false),  // today, pending
    ];

    const result = sortActivitiesDefaultOrder(activities);
    expect(result.map((a) => a.id)).toEqual(["p1", "c1", "p2"]);
  });

  it("multiple completed activities on the same day — all go after the pending ones", () => {
    const activities = [
      act("c2", "2026-05-05T16:00:00Z", true),
      act("p1", "2026-05-05T08:00:00Z", false),
      act("c1", "2026-05-05T10:00:00Z", true),
      act("p2", "2026-05-05T09:00:00Z", false),
    ];

    const result = sortActivitiesDefaultOrder(activities);
    const ids = result.map((a) => a.id);
    // pending group first
    expect(ids.indexOf("p1")).toBeLessThan(ids.indexOf("c1"));
    expect(ids.indexOf("p1")).toBeLessThan(ids.indexOf("c2"));
    expect(ids.indexOf("p2")).toBeLessThan(ids.indexOf("c1"));
    expect(ids.indexOf("p2")).toBeLessThan(ids.indexOf("c2"));
  });

  it("within the same day and same completion status — sorts by star rating desc then dueDate asc", () => {
    const activities = [
      act("low",  "2026-05-05T08:00:00Z", false, { lead: { id: "l1", businessName: "Low",  isArchived: false, starRating: 2 } }),
      act("high", "2026-05-05T08:00:00Z", false, { lead: { id: "l2", businessName: "High", isArchived: false, starRating: 5 } }),
      act("mid",  "2026-05-05T08:00:00Z", false, { lead: { id: "l3", businessName: "Mid",  isArchived: false, starRating: 3 } }),
    ];

    const result = sortActivitiesDefaultOrder(activities);
    expect(result.map((a) => a.id)).toEqual(["high", "mid", "low"]);
  });

  it("failed/skipped activities surface to the top before day grouping", () => {
    const activities = [
      act("pending-tomorrow", "2026-05-06T08:00:00Z", false),
      act("failed-today",     "2026-05-05T08:00:00Z", false, { failedAt: new Date("2026-05-05T10:00:00Z") }),
      act("pending-today",    "2026-05-05T08:00:00Z", false),
    ];

    const result = sortActivitiesDefaultOrder(activities);
    expect(result[0].id).toBe("failed-today");
  });

  it("activities with null dueDate are sorted to the very end", () => {
    const activities = [
      act("no-date", null, false),
      act("today",   "2026-05-05T08:00:00Z", false),
    ];

    const result = sortActivitiesDefaultOrder(activities);
    expect(result[0].id).toBe("today");
    expect(result[1].id).toBe("no-date");
  });

  it("within the completed group — most recently completed goes last (completedAt asc)", () => {
    const activities = [
      act("c-last",  "2026-05-05T08:00:00Z", true, { completedAt: new Date("2026-05-05T11:00:00Z") }), // last call made
      act("c-first", "2026-05-05T08:00:00Z", true, { completedAt: new Date("2026-05-05T09:00:00Z") }), // first call made
      act("c-mid",   "2026-05-05T08:00:00Z", true, { completedAt: new Date("2026-05-05T10:00:00Z") }), // middle call made
      act("pending", "2026-05-05T08:00:00Z", false),
    ];

    const result = sortActivitiesDefaultOrder(activities);
    const ids = result.map((a) => a.id);
    // pending first, then completed ordered by completedAt asc (oldest first, newest last)
    expect(ids).toEqual(["pending", "c-first", "c-mid", "c-last"]);
  });

  it("does not mutate the original array", () => {
    const activities = [
      act("c1", "2026-05-05T14:00:00Z", true),
      act("p1", "2026-05-05T09:00:00Z", false),
    ];
    const original = [...activities];
    sortActivitiesDefaultOrder(activities);
    expect(activities).toEqual(original);
  });

  it("real-world scenario: 3 days, mix of call types completed and pending", () => {
    const activities = [
      // Day 1
      act("d1-call-done",    "2026-05-05T10:30:00Z", true,  { type: "call" }),
      act("d1-wa-done",      "2026-05-05T14:00:00Z", true,  { type: "whatsapp" }),
      act("d1-pending",      "2026-05-05T08:00:00Z", false, { type: "call" }),
      // Day 2
      act("d2-email-done",   "2026-05-06T09:00:00Z", true,  { type: "email" }),
      act("d2-pending",      "2026-05-06T08:00:00Z", false, { type: "call" }),
      // Day 3
      act("d3-pending",      "2026-05-07T08:00:00Z", false, { type: "call" }),
    ];

    const result = sortActivitiesDefaultOrder(activities);
    const ids = result.map((a) => a.id);

    // Day 1 pending before Day 1 completed
    expect(ids.indexOf("d1-pending")).toBeLessThan(ids.indexOf("d1-call-done"));
    expect(ids.indexOf("d1-pending")).toBeLessThan(ids.indexOf("d1-wa-done"));

    // Day 2 pending before Day 2 completed
    expect(ids.indexOf("d2-pending")).toBeLessThan(ids.indexOf("d2-email-done"));

    // All Day 1 before all Day 2 before all Day 3
    expect(ids.indexOf("d1-pending")).toBeLessThan(ids.indexOf("d2-pending"));
    expect(ids.indexOf("d2-pending")).toBeLessThan(ids.indexOf("d3-pending"));
  });
});
