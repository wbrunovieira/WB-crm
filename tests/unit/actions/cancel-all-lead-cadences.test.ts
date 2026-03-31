import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../../setup";
import { getServerSession } from "next-auth";

const mockedGetServerSession = vi.mocked(getServerSession);

const mockAdminSession = {
  user: { id: "admin-1", email: "admin@test.com", name: "Admin", role: "admin" },
  expires: "2099-01-01",
};

describe("cancelAllActiveCadences", () => {
  beforeEach(() => {
    mockedGetServerSession.mockResolvedValue(mockAdminSession);
    prismaMock.sharedEntity.findMany.mockResolvedValue([]);
    prismaMock.sharedEntity.findFirst.mockResolvedValue(null);
  });

  it("should cancel all active/paused lead cadences for a cadence", async () => {
    const { cancelAllActiveCadences } = await import("@/actions/lead-cadences");

    // Cadence exists and is owned by admin
    prismaMock.cadence.findFirst.mockResolvedValue({
      id: "cad-1",
      name: "Test Cadence",
      ownerId: "admin-1",
    } as never);

    // Two active lead cadences
    prismaMock.leadCadence.findMany.mockResolvedValue([
      { id: "lc-1", leadId: "lead-1", status: "active" },
      { id: "lc-2", leadId: "lead-2", status: "paused" },
    ] as never);

    // Mock transaction
    prismaMock.$transaction.mockImplementation(async (fn) => {
      const tx = prismaMock;
      return fn(tx as never);
    });

    // Each lead cadence has activities
    prismaMock.leadCadenceActivity.findMany
      .mockResolvedValueOnce([
        { activity: { id: "act-1", completed: true, failedAt: null, skippedAt: null } },
        { activity: { id: "act-2", completed: false, failedAt: null, skippedAt: null } },
        { activity: { id: "act-3", completed: false, failedAt: null, skippedAt: null } },
      ] as never)
      .mockResolvedValueOnce([
        { activity: { id: "act-4", completed: false, failedAt: null, skippedAt: null } },
        { activity: { id: "act-5", completed: false, failedAt: new Date(), skippedAt: null } },
      ] as never);

    prismaMock.leadCadence.update.mockResolvedValue({} as never);
    prismaMock.activity.update.mockResolvedValue({} as never);

    const result = await cancelAllActiveCadences("cad-1");

    expect(result.cancelledCount).toBe(2);
    expect(result.skippedActivitiesCount).toBe(3); // act-2, act-3, act-4 (not act-1 completed, not act-5 failed)
  });

  it("should not touch completed or failed or already skipped activities", async () => {
    const { cancelAllActiveCadences } = await import("@/actions/lead-cadences");

    prismaMock.cadence.findFirst.mockResolvedValue({
      id: "cad-1",
      ownerId: "admin-1",
    } as never);

    prismaMock.leadCadence.findMany.mockResolvedValue([
      { id: "lc-1", leadId: "lead-1", status: "active" },
    ] as never);

    prismaMock.$transaction.mockImplementation(async (fn) => fn(prismaMock as never));

    prismaMock.leadCadenceActivity.findMany.mockResolvedValueOnce([
      { activity: { id: "act-1", completed: true, failedAt: null, skippedAt: null } },
      { activity: { id: "act-2", completed: false, failedAt: new Date(), skippedAt: null } },
      { activity: { id: "act-3", completed: false, failedAt: null, skippedAt: new Date() } },
    ] as never);

    prismaMock.leadCadence.update.mockResolvedValue({} as never);

    const result = await cancelAllActiveCadences("cad-1");

    // No pending activities to skip
    expect(result.skippedActivitiesCount).toBe(0);
    expect(result.cancelledCount).toBe(1);
    // activity.update should NOT have been called
    expect(prismaMock.activity.update).not.toHaveBeenCalled();
  });

  it("should throw if cadence not found", async () => {
    const { cancelAllActiveCadences } = await import("@/actions/lead-cadences");

    prismaMock.cadence.findFirst.mockResolvedValue(null);

    await expect(cancelAllActiveCadences("nonexistent")).rejects.toThrow(
      "Cadência não encontrada"
    );
  });

  it("should throw if no active lead cadences", async () => {
    const { cancelAllActiveCadences } = await import("@/actions/lead-cadences");

    prismaMock.cadence.findFirst.mockResolvedValue({
      id: "cad-1",
      ownerId: "admin-1",
    } as never);

    prismaMock.leadCadence.findMany.mockResolvedValue([]);

    await expect(cancelAllActiveCadences("cad-1")).rejects.toThrow(
      "Nenhuma cadência ativa para cancelar"
    );
  });

  it("should reject non-authenticated users", async () => {
    const { cancelAllActiveCadences } = await import("@/actions/lead-cadences");

    mockedGetServerSession.mockResolvedValue(null);

    await expect(cancelAllActiveCadences("cad-1")).rejects.toThrow("Não autorizado");
  });
});
