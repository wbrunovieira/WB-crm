import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../../setup";
import { getServerSession } from "next-auth";

const mockedGetServerSession = vi.mocked(getServerSession);

const mockAdminSession = {
  user: { id: "admin-1", email: "admin@test.com", name: "Admin", role: "admin" },
  expires: "2099-01-01",
};

describe("getActivityCalendarData", () => {
  beforeEach(() => {
    mockedGetServerSession.mockResolvedValue(mockAdminSession);
    prismaMock.sharedEntity.findMany.mockResolvedValue([]);
    prismaMock.sharedEntity.findFirst.mockResolvedValue(null);
  });

  it("should count completed activities on the date they were completed, not dueDate", async () => {
    const { getActivityCalendarData } = await import("@/actions/admin-manager");

    // Activity with dueDate on March 10 but completed on March 23
    prismaMock.activity.findMany.mockResolvedValue([
      {
        id: "act-1",
        type: "email",
        completed: true,
        completedAt: new Date("2026-03-23T14:00:00Z"),
        failedAt: null,
        skippedAt: null,
        dueDate: new Date("2026-03-10T00:00:00Z"),
        createdAt: new Date("2026-03-05T00:00:00Z"),
      },
    ] as never);

    const result = await getActivityCalendarData(2026, 3);

    // Should appear on March 23 (completedAt), not March 10 (dueDate)
    const march23 = result.find((d) => d.date === "2026-03-23");
    const march10 = result.find((d) => d.date === "2026-03-10");

    expect(march23).toBeDefined();
    expect(march23!.completed).toBe(1);
    expect(march23!.total).toBe(1);
    expect(march10).toBeUndefined();
  });

  it("should count failed activities on the date they failed", async () => {
    const { getActivityCalendarData } = await import("@/actions/admin-manager");

    prismaMock.activity.findMany.mockResolvedValue([
      {
        id: "act-2",
        type: "call",
        completed: false,
        completedAt: null,
        failedAt: new Date("2026-03-15T10:00:00Z"),
        skippedAt: null,
        dueDate: new Date("2026-03-12T00:00:00Z"),
        createdAt: new Date("2026-03-01T00:00:00Z"),
      },
    ] as never);

    const result = await getActivityCalendarData(2026, 3);

    const march15 = result.find((d) => d.date === "2026-03-15");
    expect(march15).toBeDefined();
    expect(march15!.failed).toBe(1);
    expect(march15!.total).toBe(1);
  });

  it("should count skipped activities on the date they were skipped", async () => {
    const { getActivityCalendarData } = await import("@/actions/admin-manager");

    prismaMock.activity.findMany.mockResolvedValue([
      {
        id: "act-3",
        type: "whatsapp",
        completed: false,
        completedAt: null,
        failedAt: null,
        skippedAt: new Date("2026-03-20T16:00:00Z"),
        dueDate: new Date("2026-03-18T00:00:00Z"),
        createdAt: new Date("2026-03-10T00:00:00Z"),
      },
    ] as never);

    const result = await getActivityCalendarData(2026, 3);

    const march20 = result.find((d) => d.date === "2026-03-20");
    expect(march20).toBeDefined();
    expect(march20!.skipped).toBe(1);
  });

  it("should count pending activities on their dueDate (or createdAt if no dueDate)", async () => {
    const { getActivityCalendarData } = await import("@/actions/admin-manager");

    prismaMock.activity.findMany.mockResolvedValue([
      {
        id: "act-4",
        type: "meeting",
        completed: false,
        completedAt: null,
        failedAt: null,
        skippedAt: null,
        dueDate: new Date("2026-03-25T00:00:00Z"),
        createdAt: new Date("2026-03-01T00:00:00Z"),
      },
      {
        id: "act-5",
        type: "task",
        completed: false,
        completedAt: null,
        failedAt: null,
        skippedAt: null,
        dueDate: null,
        createdAt: new Date("2026-03-22T00:00:00Z"),
      },
    ] as never);

    const result = await getActivityCalendarData(2026, 3);

    const march25 = result.find((d) => d.date === "2026-03-25");
    expect(march25).toBeDefined();
    expect(march25!.pending).toBe(1);

    const march22 = result.find((d) => d.date === "2026-03-22");
    expect(march22).toBeDefined();
    expect(march22!.pending).toBe(1);
  });

  it("should aggregate multiple activities on the same day correctly", async () => {
    const { getActivityCalendarData } = await import("@/actions/admin-manager");

    prismaMock.activity.findMany.mockResolvedValue([
      {
        id: "act-a",
        type: "email",
        completed: true,
        completedAt: new Date("2026-03-23T09:00:00Z"),
        failedAt: null,
        skippedAt: null,
        dueDate: new Date("2026-03-20T00:00:00Z"),
        createdAt: new Date("2026-03-18T00:00:00Z"),
      },
      {
        id: "act-b",
        type: "call",
        completed: true,
        completedAt: new Date("2026-03-23T11:00:00Z"),
        failedAt: null,
        skippedAt: null,
        dueDate: new Date("2026-03-23T00:00:00Z"),
        createdAt: new Date("2026-03-20T00:00:00Z"),
      },
      {
        id: "act-c",
        type: "whatsapp",
        completed: false,
        completedAt: null,
        failedAt: new Date("2026-03-23T14:00:00Z"),
        skippedAt: null,
        dueDate: new Date("2026-03-21T00:00:00Z"),
        createdAt: new Date("2026-03-19T00:00:00Z"),
      },
      {
        id: "act-d",
        type: "task",
        completed: false,
        completedAt: null,
        failedAt: null,
        skippedAt: null,
        dueDate: new Date("2026-03-23T00:00:00Z"),
        createdAt: new Date("2026-03-20T00:00:00Z"),
      },
    ] as never);

    const result = await getActivityCalendarData(2026, 3);

    const march23 = result.find((d) => d.date === "2026-03-23");
    expect(march23).toBeDefined();
    expect(march23!.total).toBe(4);
    expect(march23!.completed).toBe(2);
    expect(march23!.failed).toBe(1);
    expect(march23!.pending).toBe(1);
    expect(march23!.byType).toEqual({
      email: 1,
      call: 1,
      whatsapp: 1,
      task: 1,
    });
    expect(march23!.completedByType).toEqual({
      email: 1,
      call: 1,
    });
    expect(march23!.pendingByType).toEqual({
      task: 1,
    });
    expect(march23!.failedByType).toEqual({
      whatsapp: 1,
    });
    expect(march23!.skippedByType).toEqual({});
  });

  it("should query activities that were completed/failed/skipped within the month", async () => {
    const { getActivityCalendarData } = await import("@/actions/admin-manager");

    prismaMock.activity.findMany.mockResolvedValue([]);

    await getActivityCalendarData(2026, 3);

    const call = prismaMock.activity.findMany.mock.calls[0][0];
    const where = call?.where;

    // Should include completedAt, failedAt, skippedAt in the query
    expect(where?.OR).toBeDefined();
    const orConditions = where?.OR as Record<string, unknown>[];

    // Should have conditions for outcome dates (completedAt, failedAt, skippedAt)
    const hasCompletedAt = orConditions.some((c) => "completedAt" in c);
    const hasFailedAt = orConditions.some((c) => "failedAt" in c);
    const hasSkippedAt = orConditions.some((c) => "skippedAt" in c);

    expect(hasCompletedAt).toBe(true);
    expect(hasFailedAt).toBe(true);
    expect(hasSkippedAt).toBe(true);
  });

  it("should handle completed activities without completedAt (legacy data) using dueDate", async () => {
    const { getActivityCalendarData } = await import("@/actions/admin-manager");

    // Legacy: completed=true but completedAt=null
    prismaMock.activity.findMany.mockResolvedValue([
      {
        id: "act-legacy",
        type: "email",
        completed: true,
        completedAt: null,
        failedAt: null,
        skippedAt: null,
        dueDate: new Date("2026-03-10T00:00:00Z"),
        createdAt: new Date("2026-03-05T00:00:00Z"),
      },
    ] as never);

    const result = await getActivityCalendarData(2026, 3);

    // Falls back to dueDate since completedAt is null
    const march10 = result.find((d) => d.date === "2026-03-10");
    expect(march10).toBeDefined();
    expect(march10!.completed).toBe(1);
  });

  it("should reject non-admin users", async () => {
    const { getActivityCalendarData } = await import("@/actions/admin-manager");

    mockedGetServerSession.mockResolvedValue({
      user: { id: "sdr-1", email: "sdr@test.com", name: "SDR", role: "sdr" },
      expires: "2099-01-01",
    });

    await expect(getActivityCalendarData(2026, 3)).rejects.toThrow(
      "Acesso restrito a administradores"
    );
  });
});
