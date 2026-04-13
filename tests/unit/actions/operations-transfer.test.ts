/**
 * Operations Transfer Action Tests
 *
 * Tests for src/actions/operations-transfer.ts
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    lead: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    organization: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import {
  searchEntitiesForTransfer,
  transferToOperations,
  revertFromOperations,
} from "@/actions/operations-transfer";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const mockGetServerSession = vi.mocked(getServerSession);
const mockLeadFindMany = vi.mocked(prisma.lead.findMany);
const mockOrgFindMany = vi.mocked(prisma.organization.findMany);
const mockLeadFindUnique = vi.mocked(prisma.lead.findUnique);
const mockOrgFindUnique = vi.mocked(prisma.organization.findUnique);
const mockLeadUpdate = vi.mocked(prisma.lead.update);
const mockOrgUpdate = vi.mocked(prisma.organization.update);
const mockRevalidatePath = vi.mocked(revalidatePath);

const ADMIN_SESSION = {
  user: { id: "admin-1", role: "admin", email: "admin@test.com", name: "Admin" },
};
const SDR_SESSION = {
  user: { id: "sdr-1", role: "sdr", email: "sdr@test.com", name: "SDR" },
};

const LEAD_ACTIVE = {
  id: "lead-1",
  businessName: "Lead Company",
  inOperationsAt: null,
};
const LEAD_IN_OPS = {
  id: "lead-2",
  businessName: "Lead Ops Co",
  inOperationsAt: new Date("2026-04-01"),
};
const ORG_ACTIVE = {
  id: "org-1",
  name: "Org Company",
  inOperationsAt: null,
};
const ORG_IN_OPS = {
  id: "org-2",
  name: "Org Ops Co",
  inOperationsAt: new Date("2026-04-01"),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue(ADMIN_SESSION as never);
  mockLeadFindMany.mockResolvedValue([]);
  mockOrgFindMany.mockResolvedValue([]);
  mockLeadFindUnique.mockResolvedValue(null);
  mockOrgFindUnique.mockResolvedValue(null);
  mockLeadUpdate.mockResolvedValue(LEAD_ACTIVE as never);
  mockOrgUpdate.mockResolvedValue(ORG_ACTIVE as never);
});

// ---------------------------------------------------------------------------
describe("searchEntitiesForTransfer", () => {
  it("returns leads and organizations matching the query", async () => {
    mockLeadFindMany.mockResolvedValue([LEAD_ACTIVE] as never);
    mockOrgFindMany.mockResolvedValue([ORG_ACTIVE] as never);

    const result = await searchEntitiesForTransfer("company");

    expect(result).toHaveLength(2);
    expect(result.some((r) => r.type === "lead" && r.id === "lead-1")).toBe(true);
    expect(result.some((r) => r.type === "organization" && r.id === "org-1")).toBe(true);
  });

  it("includes inOperationsAt status in results", async () => {
    mockLeadFindMany.mockResolvedValue([LEAD_IN_OPS] as never);
    mockOrgFindMany.mockResolvedValue([ORG_IN_OPS] as never);

    const result = await searchEntitiesForTransfer("ops");

    const lead = result.find((r) => r.type === "lead");
    const org = result.find((r) => r.type === "organization");
    expect(lead?.inOperationsAt).toEqual(LEAD_IN_OPS.inOperationsAt);
    expect(org?.inOperationsAt).toEqual(ORG_IN_OPS.inOperationsAt);
  });

  it("returns empty array when no matches", async () => {
    mockLeadFindMany.mockResolvedValue([]);
    mockOrgFindMany.mockResolvedValue([]);

    const result = await searchEntitiesForTransfer("nonexistent");

    expect(result).toEqual([]);
  });

  it("throws Unauthorized if not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    await expect(searchEntitiesForTransfer("query")).rejects.toThrow();
  });

  it("throws Forbidden if not admin", async () => {
    mockGetServerSession.mockResolvedValue(SDR_SESSION as never);

    await expect(searchEntitiesForTransfer("query")).rejects.toThrow();
  });

  it("searches by name (lead uses businessName)", async () => {
    await searchEntitiesForTransfer("acme");

    expect(mockLeadFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          businessName: expect.objectContaining({ contains: "acme" }),
        }),
      })
    );
  });

  it("searches organizations by name", async () => {
    await searchEntitiesForTransfer("acme");

    expect(mockOrgFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          name: expect.objectContaining({ contains: "acme" }),
        }),
      })
    );
  });
});

// ---------------------------------------------------------------------------
describe("transferToOperations", () => {
  it("sets inOperationsAt to current date on organization", async () => {
    mockOrgFindUnique.mockResolvedValue(ORG_ACTIVE as never);

    await transferToOperations("organization", "org-1");

    expect(mockOrgUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "org-1" },
        data: expect.objectContaining({ inOperationsAt: expect.any(Date) }),
      })
    );
  });

  it("sets inOperationsAt to current date on lead", async () => {
    mockLeadFindUnique.mockResolvedValue(LEAD_ACTIVE as never);

    await transferToOperations("lead", "lead-1");

    expect(mockLeadUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "lead-1" },
        data: expect.objectContaining({ inOperationsAt: expect.any(Date) }),
      })
    );
  });

  it("throws Unauthorized if not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    await expect(transferToOperations("lead", "lead-1")).rejects.toThrow();
  });

  it("throws Forbidden if not admin", async () => {
    mockGetServerSession.mockResolvedValue(SDR_SESSION as never);

    await expect(transferToOperations("lead", "lead-1")).rejects.toThrow();
  });

  it("throws NotFound if organization does not exist", async () => {
    mockOrgFindUnique.mockResolvedValue(null);

    await expect(transferToOperations("organization", "ghost-id")).rejects.toThrow();
  });

  it("throws NotFound if lead does not exist", async () => {
    mockLeadFindUnique.mockResolvedValue(null);

    await expect(transferToOperations("lead", "ghost-id")).rejects.toThrow();
  });

  it("revalidates /admin/operations after transfer", async () => {
    mockOrgFindUnique.mockResolvedValue(ORG_ACTIVE as never);

    await transferToOperations("organization", "org-1");

    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/operations");
  });

  it("revalidates entity page after transfer", async () => {
    mockOrgFindUnique.mockResolvedValue(ORG_ACTIVE as never);

    await transferToOperations("organization", "org-1");

    expect(mockRevalidatePath).toHaveBeenCalledWith("/organizations/org-1");
  });

  it("revalidates lead page after lead transfer", async () => {
    mockLeadFindUnique.mockResolvedValue(LEAD_ACTIVE as never);

    await transferToOperations("lead", "lead-1");

    expect(mockRevalidatePath).toHaveBeenCalledWith("/leads/lead-1");
  });
});

// ---------------------------------------------------------------------------
describe("revertFromOperations", () => {
  it("sets inOperationsAt to null on organization", async () => {
    mockOrgFindUnique.mockResolvedValue(ORG_IN_OPS as never);

    await revertFromOperations("organization", "org-2");

    expect(mockOrgUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "org-2" },
        data: expect.objectContaining({ inOperationsAt: null }),
      })
    );
  });

  it("sets inOperationsAt to null on lead", async () => {
    mockLeadFindUnique.mockResolvedValue(LEAD_IN_OPS as never);

    await revertFromOperations("lead", "lead-2");

    expect(mockLeadUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "lead-2" },
        data: expect.objectContaining({ inOperationsAt: null }),
      })
    );
  });

  it("throws Unauthorized if not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    await expect(revertFromOperations("lead", "lead-1")).rejects.toThrow();
  });

  it("throws Forbidden if not admin", async () => {
    mockGetServerSession.mockResolvedValue(SDR_SESSION as never);

    await expect(revertFromOperations("lead", "lead-1")).rejects.toThrow();
  });

  it("throws NotFound if organization does not exist", async () => {
    mockOrgFindUnique.mockResolvedValue(null);

    await expect(revertFromOperations("organization", "ghost-id")).rejects.toThrow();
  });

  it("throws NotFound if lead does not exist", async () => {
    mockLeadFindUnique.mockResolvedValue(null);

    await expect(revertFromOperations("lead", "ghost-id")).rejects.toThrow();
  });

  it("revalidates /admin/operations after revert", async () => {
    mockOrgFindUnique.mockResolvedValue(ORG_IN_OPS as never);

    await revertFromOperations("organization", "org-2");

    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/operations");
  });

  it("revalidates entity page after revert", async () => {
    mockOrgFindUnique.mockResolvedValue(ORG_IN_OPS as never);

    await revertFromOperations("organization", "org-2");

    expect(mockRevalidatePath).toHaveBeenCalledWith("/organizations/org-2");
  });

  it("revalidates lead page after lead revert", async () => {
    mockLeadFindUnique.mockResolvedValue(LEAD_IN_OPS as never);

    await revertFromOperations("lead", "lead-2");

    expect(mockRevalidatePath).toHaveBeenCalledWith("/leads/lead-2");
  });
});
