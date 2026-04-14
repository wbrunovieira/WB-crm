/**
 * Activity Additional Deals Tests
 *
 * Tests for the additionalDealIds feature in src/actions/activities.ts:
 * - linkActivityToDeal: adds dealId to additionalDealIds JSON array
 * - unlinkActivityFromDeal: removes dealId from additionalDealIds
 * - getActivities: includes activities matched by additionalDealIds when filtering by dealId
 *
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { prismaMock } from "../../setup";
import { getServerSession } from "next-auth";
import { vi } from "vitest";
import { mockSession } from "../../fixtures/users";

const mockGetSession = vi.mocked(getServerSession);

import { linkActivityToDeal, unlinkActivityFromDeal, getActivities } from "@/actions/activities";

const OWNER_ID = "user-test-123";

const baseActivity = {
  id: "activity-1",
  type: "call",
  subject: "Ligação",
  description: null,
  dueDate: null,
  completed: false,
  completedAt: null,
  failedAt: null,
  failReason: null,
  skippedAt: null,
  skipReason: null,
  dealId: "deal-primary",
  additionalDealIds: null,
  contactId: null,
  contactIds: null,
  leadContactIds: null,
  leadId: null,
  partnerId: null,
  gotoCallId: null,
  gotoRecordingId: null,
  gotoRecordingDriveId: null,
  gotoRecordingUrl: null,
  gotoRecordingUrl2: null,
  gotoTranscriptionJobId: null,
  gotoTranscriptionJobId2: null,
  gotoTranscriptText: null,
  gotoCallOutcome: null,
  gotoDuration: null,
  callContactType: null,
  meetingNoShow: false,
  emailMessageId: null,
  emailSubject: null,
  emailThreadId: null,
  emailFromAddress: null,
  emailFromName: null,
  emailReplied: false,
  ownerId: OWNER_ID,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue(mockSession as never);
  prismaMock.activity.findUnique.mockResolvedValue(null);
  prismaMock.activity.update.mockResolvedValue(baseActivity as never);
});

// ---------------------------------------------------------------------------
describe("linkActivityToDeal", () => {
  it("adds dealId to additionalDealIds when array is empty", async () => {
    prismaMock.activity.findUnique.mockResolvedValue(baseActivity as never);

    await linkActivityToDeal("activity-1", "deal-secondary");

    expect(prismaMock.activity.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "activity-1" },
        data: expect.objectContaining({
          additionalDealIds: JSON.stringify(["deal-secondary"]),
        }),
      })
    );
  });

  it("appends dealId to existing additionalDealIds", async () => {
    prismaMock.activity.findUnique.mockResolvedValue({
      ...baseActivity,
      additionalDealIds: JSON.stringify(["deal-existing"]),
    } as never);

    await linkActivityToDeal("activity-1", "deal-new");

    expect(prismaMock.activity.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          additionalDealIds: JSON.stringify(["deal-existing", "deal-new"]),
        }),
      })
    );
  });

  it("prevents duplicate dealIds", async () => {
    prismaMock.activity.findUnique.mockResolvedValue({
      ...baseActivity,
      additionalDealIds: JSON.stringify(["deal-existing"]),
    } as never);

    await linkActivityToDeal("activity-1", "deal-existing");

    // Should NOT call update (already linked)
    expect(prismaMock.activity.update).not.toHaveBeenCalled();
  });

  it("prevents linking to the primary dealId", async () => {
    prismaMock.activity.findUnique.mockResolvedValue(baseActivity as never);

    await linkActivityToDeal("activity-1", "deal-primary");

    expect(prismaMock.activity.update).not.toHaveBeenCalled();
  });

  it("throws if activity does not belong to current user", async () => {
    prismaMock.activity.findUnique.mockResolvedValue({
      ...baseActivity,
      ownerId: "other-user",
    } as never);

    await expect(linkActivityToDeal("activity-1", "deal-secondary")).rejects.toThrow();
  });

  it("throws if activity not found", async () => {
    prismaMock.activity.findUnique.mockResolvedValue(null);

    await expect(linkActivityToDeal("ghost-id", "deal-secondary")).rejects.toThrow();
  });

  it("revalidates the deal path after linking", async () => {
    prismaMock.activity.findUnique.mockResolvedValue(baseActivity as never);
    const { revalidatePath } = await import("next/cache");

    await linkActivityToDeal("activity-1", "deal-secondary");

    expect(revalidatePath).toHaveBeenCalledWith("/deals/deal-secondary");
  });
});

// ---------------------------------------------------------------------------
describe("unlinkActivityFromDeal", () => {
  it("removes dealId from additionalDealIds", async () => {
    prismaMock.activity.findUnique.mockResolvedValue({
      ...baseActivity,
      additionalDealIds: JSON.stringify(["deal-a", "deal-b"]),
    } as never);

    await unlinkActivityFromDeal("activity-1", "deal-a");

    expect(prismaMock.activity.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          additionalDealIds: JSON.stringify(["deal-b"]),
        }),
      })
    );
  });

  it("sets additionalDealIds to null when removing last entry", async () => {
    prismaMock.activity.findUnique.mockResolvedValue({
      ...baseActivity,
      additionalDealIds: JSON.stringify(["deal-only"]),
    } as never);

    await unlinkActivityFromDeal("activity-1", "deal-only");

    expect(prismaMock.activity.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ additionalDealIds: null }),
      })
    );
  });

  it("throws if activity does not belong to current user", async () => {
    prismaMock.activity.findUnique.mockResolvedValue({
      ...baseActivity,
      ownerId: "other-user",
    } as never);

    await expect(unlinkActivityFromDeal("activity-1", "deal-a")).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
describe("getActivities — dealId filter includes additionalDealIds", () => {
  it("queries with OR clause including additionalDealIds when filtering by dealId", async () => {
    mockGetSession.mockResolvedValue({ user: { id: OWNER_ID, role: "sdr" } } as never);
    prismaMock.activity.findMany.mockResolvedValue([]);

    await getActivities({ dealId: "deal-1" });

    const call = prismaMock.activity.findMany.mock.calls[0][0];
    const where = call?.where as Record<string, unknown>;

    // Should use OR to include both primary dealId and additionalDealIds
    expect(where).toHaveProperty("OR");
    const orClauses = where.OR as Array<Record<string, unknown>>;
    expect(orClauses.some((c) => c.dealId === "deal-1")).toBe(true);
    expect(
      orClauses.some(
        (c) =>
          (c.additionalDealIds as Record<string, unknown>)?.contains !== undefined
      )
    ).toBe(true);
  });
});
