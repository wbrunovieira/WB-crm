/**
 * Tests for Admin Manager Server Actions
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
    },
    lead: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    organization: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    deal: {
      findMany: vi.fn(),
      aggregate: vi.fn(),
    },
    contact: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    partner: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    activity: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    dealStageHistory: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    stage: {
      findMany: vi.fn(),
    },
  },
}));

// Mock NextAuth
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import {
  getManagerStats,
  recordDealStageChange,
  getTimelineData,
} from "@/actions/admin-manager";

describe("Admin Manager Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getManagerStats", () => {
    it("should throw error if not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      await expect(getManagerStats({ period: "month" })).rejects.toThrow(
        "Não autorizado"
      );
    });

    it("should throw error if user is not admin", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "user-1", role: "sdr" },
      } as any);

      await expect(getManagerStats({ period: "month" })).rejects.toThrow(
        "Acesso restrito a administradores"
      );
    });

    it("should return stats for admin user", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "admin-1", role: "admin" },
      } as any);

      // Mock all database queries
      vi.mocked(prisma.user.findMany).mockResolvedValueOnce([
        { id: "user-1", name: "Bruno", email: "bruno@test.com" },
        { id: "user-2", name: "Fabiola", email: "fabiola@test.com" },
      ] as any);

      vi.mocked(prisma.lead.findMany).mockResolvedValueOnce([
        { id: "lead-1", ownerId: "user-1", status: "new", convertedAt: null },
        { id: "lead-2", ownerId: "user-1", status: "converted", convertedAt: new Date() },
        { id: "lead-3", ownerId: "user-2", status: "new", convertedAt: null },
      ] as any);

      vi.mocked(prisma.organization.findMany).mockResolvedValueOnce([
        { id: "org-1", ownerId: "user-1" },
      ] as any);

      vi.mocked(prisma.deal.findMany).mockResolvedValueOnce([
        { id: "deal-1", ownerId: "user-1", status: "won", value: 10000, stageId: "stage-1", stage: { id: "stage-1", name: "Won" } },
        { id: "deal-2", ownerId: "user-2", status: "open", value: 5000, stageId: "stage-2", stage: { id: "stage-2", name: "Prospect" } },
      ] as any);

      vi.mocked(prisma.contact.findMany).mockResolvedValueOnce([
        { id: "contact-1", ownerId: "user-1" },
        { id: "contact-2", ownerId: "user-2" },
      ] as any);

      vi.mocked(prisma.partner.findMany).mockResolvedValueOnce([
        { id: "partner-1", ownerId: "user-1", partnerType: "consultoria" },
      ] as any);

      vi.mocked(prisma.activity.findMany).mockResolvedValueOnce([
        { id: "act-1", ownerId: "user-1", type: "call", completed: true, dueDate: null },
        { id: "act-2", ownerId: "user-1", type: "meeting", completed: false, dueDate: new Date(Date.now() - 86400000) },
        { id: "act-3", ownerId: "user-2", type: "call", completed: false, dueDate: null },
      ] as any);

      vi.mocked(prisma.dealStageHistory.findMany).mockResolvedValueOnce([
        { id: "dsh-1", changedById: "user-1", fromStage: null, toStage: { name: "Prospect" } },
        { id: "dsh-2", changedById: "user-1", fromStage: { name: "Prospect" }, toStage: { name: "Won" } },
      ] as any);

      vi.mocked(prisma.stage.findMany).mockResolvedValueOnce([
        { id: "stage-1", name: "Won" },
        { id: "stage-2", name: "Prospect" },
      ] as any);

      // Mock previous period queries for comparison
      vi.mocked(prisma.lead.count).mockResolvedValueOnce(2);
      vi.mocked(prisma.organization.count).mockResolvedValueOnce(0);
      vi.mocked(prisma.deal.aggregate).mockResolvedValueOnce({
        _count: 1,
        _sum: { value: 5000 },
      } as any);
      vi.mocked(prisma.contact.count).mockResolvedValueOnce(1);
      vi.mocked(prisma.partner.count).mockResolvedValueOnce(0);
      vi.mocked(prisma.activity.count).mockResolvedValueOnce(2);

      const result = await getManagerStats({ period: "month" });

      expect(result).toBeDefined();
      expect(result.totals.leads.total).toBe(3);
      expect(result.totals.leads.converted).toBe(1);
      expect(result.totals.deals.total).toBe(2);
      expect(result.totals.deals.totalValue).toBe(15000);
      expect(result.totals.activities.total).toBe(3);
      expect(result.totals.activities.overdue).toBe(1);
      expect(result.totals.stageChanges.total).toBe(2);

      // Check user metrics
      expect(result.byUser.length).toBeGreaterThan(0);
      const user1Metrics = result.byUser.find((u) => u.userId === "user-1");
      expect(user1Metrics?.leads.created).toBe(2);
      expect(user1Metrics?.leads.converted).toBe(1);
      expect(user1Metrics?.deals.totalValue).toBe(10000);
      expect(user1Metrics?.stageChanges).toBe(2);

      // Check comparison
      expect(result.comparison).toBeDefined();
      expect(result.comparison?.leads).toBe(50); // 3 vs 2 = 50% increase
    });

    it("should handle custom date range", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "admin-1", role: "admin" },
      } as any);

      // Mock empty responses
      vi.mocked(prisma.user.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.lead.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.organization.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.deal.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.contact.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.partner.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.activity.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.dealStageHistory.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.stage.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.lead.count).mockResolvedValueOnce(0);
      vi.mocked(prisma.organization.count).mockResolvedValueOnce(0);
      vi.mocked(prisma.deal.aggregate).mockResolvedValueOnce({ _count: 0, _sum: { value: null } } as any);
      vi.mocked(prisma.contact.count).mockResolvedValueOnce(0);
      vi.mocked(prisma.partner.count).mockResolvedValueOnce(0);
      vi.mocked(prisma.activity.count).mockResolvedValueOnce(0);

      const result = await getManagerStats({
        period: "custom",
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-01-31"),
      });

      expect(result.totals.leads.total).toBe(0);
      expect(result.byUser).toHaveLength(0);
    });
  });

  describe("recordDealStageChange", () => {
    it("should throw error if not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      await expect(
        recordDealStageChange("deal-1", null, "stage-1")
      ).rejects.toThrow("Não autorizado");
    });

    it("should create stage history record", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "user-1" },
      } as any);

      vi.mocked(prisma.dealStageHistory.create).mockResolvedValueOnce({
        id: "dsh-1",
        dealId: "deal-1",
        fromStageId: "stage-1",
        toStageId: "stage-2",
        changedById: "user-1",
        changedAt: new Date(),
      } as any);

      await recordDealStageChange("deal-1", "stage-1", "stage-2");

      expect(prisma.dealStageHistory.create).toHaveBeenCalledWith({
        data: {
          dealId: "deal-1",
          fromStageId: "stage-1",
          toStageId: "stage-2",
          changedById: "user-1",
        },
      });
    });

    it("should handle null fromStageId for new deals", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "user-1" },
      } as any);

      vi.mocked(prisma.dealStageHistory.create).mockResolvedValueOnce({
        id: "dsh-1",
        dealId: "deal-1",
        fromStageId: null,
        toStageId: "stage-1",
        changedById: "user-1",
        changedAt: new Date(),
      } as any);

      await recordDealStageChange("deal-1", null, "stage-1");

      expect(prisma.dealStageHistory.create).toHaveBeenCalledWith({
        data: {
          dealId: "deal-1",
          fromStageId: null,
          toStageId: "stage-1",
          changedById: "user-1",
        },
      });
    });
  });

  describe("getTimelineData", () => {
    it("should throw error if not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      await expect(getTimelineData({ period: "month" })).rejects.toThrow(
        "Não autorizado"
      );
    });

    it("should throw error if not admin", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "user-1", role: "closer" },
      } as any);

      await expect(getTimelineData({ period: "month" })).rejects.toThrow(
        "Acesso restrito a administradores"
      );
    });

    it("should return timeline data grouped by day", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "admin-1", role: "admin" },
      } as any);

      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      vi.mocked(prisma.lead.findMany).mockResolvedValueOnce([
        { createdAt: today, convertedAt: null },
        { createdAt: today, convertedAt: today },
        { createdAt: yesterday, convertedAt: null },
      ] as any);

      vi.mocked(prisma.deal.findMany).mockResolvedValueOnce([
        { createdAt: today, status: "open", value: 5000 },
        { createdAt: yesterday, status: "won", value: 10000 },
      ] as any);

      const result = await getTimelineData({ period: "week" });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      // Check that data is grouped by date
      const todayData = result.find(
        (d) => d.date === today.toISOString().split("T")[0]
      );
      expect(todayData).toBeDefined();
      expect(todayData?.leads).toBe(2);
      expect(todayData?.converted).toBe(1);
      expect(todayData?.deals).toBe(1);
    });
  });
});
