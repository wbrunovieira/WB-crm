import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../../setup";
import { getServerSession } from "next-auth";

const mockedGetServerSession = vi.mocked(getServerSession);

const mockSession = {
  user: { id: "user-test-123", email: "test@test.com", name: "Test", role: "sdr" },
  expires: "2099-01-01",
};

describe("Lead Activity Order", () => {
  beforeEach(() => {
    mockedGetServerSession.mockResolvedValue(mockSession);
    prismaMock.sharedEntity.findMany.mockResolvedValue([]);
    prismaMock.sharedEntity.findFirst.mockResolvedValue(null);
  });

  describe("updateLeadActivityOrder", () => {
    it("should save custom activity order for a lead", async () => {
      const { updateLeadActivityOrder } = await import("@/actions/leads");

      const leadId = "lead-test-1";
      const activityIds = ["act-3", "act-1", "act-2"];

      prismaMock.lead.findFirst.mockResolvedValue({
        id: leadId,
        ownerId: "user-test-123",
      } as never);

      prismaMock.lead.update.mockResolvedValue({
        id: leadId,
        activityOrder: JSON.stringify(activityIds),
      } as never);

      const result = await updateLeadActivityOrder(leadId, activityIds);

      expect(prismaMock.lead.update).toHaveBeenCalledWith({
        where: { id: leadId },
        data: { activityOrder: JSON.stringify(activityIds) },
      });
      expect(result.activityOrder).toBe(JSON.stringify(activityIds));
    });

    it("should reject empty activity IDs array", async () => {
      const { updateLeadActivityOrder } = await import("@/actions/leads");

      await expect(
        updateLeadActivityOrder("lead-test-1", [])
      ).rejects.toThrow("Lista de atividades não pode ser vazia");
    });

    it("should reject when lead not found or not owned", async () => {
      const { updateLeadActivityOrder } = await import("@/actions/leads");

      prismaMock.lead.findFirst.mockResolvedValue(null);

      await expect(
        updateLeadActivityOrder("lead-nonexistent", ["act-1"])
      ).rejects.toThrow("Lead não encontrado");
    });

    it("should require authentication", async () => {
      const { updateLeadActivityOrder } = await import("@/actions/leads");

      mockedGetServerSession.mockResolvedValue(null);

      await expect(
        updateLeadActivityOrder("lead-test-1", ["act-1"])
      ).rejects.toThrow("Não autorizado");
    });
  });

  describe("resetLeadActivityOrder", () => {
    it("should reset activity order to null (back to date sorting)", async () => {
      const { resetLeadActivityOrder } = await import("@/actions/leads");

      const leadId = "lead-test-1";

      prismaMock.lead.findFirst.mockResolvedValue({
        id: leadId,
        ownerId: "user-test-123",
        activityOrder: JSON.stringify(["act-3", "act-1", "act-2"]),
      } as never);

      prismaMock.lead.update.mockResolvedValue({
        id: leadId,
        activityOrder: null,
      } as never);

      const result = await resetLeadActivityOrder(leadId);

      expect(prismaMock.lead.update).toHaveBeenCalledWith({
        where: { id: leadId },
        data: { activityOrder: null },
      });
      expect(result.activityOrder).toBeNull();
    });

    it("should reject when lead not found", async () => {
      const { resetLeadActivityOrder } = await import("@/actions/leads");

      prismaMock.lead.findFirst.mockResolvedValue(null);

      await expect(
        resetLeadActivityOrder("lead-nonexistent")
      ).rejects.toThrow("Lead não encontrado");
    });

    it("should require authentication", async () => {
      const { resetLeadActivityOrder } = await import("@/actions/leads");

      mockedGetServerSession.mockResolvedValue(null);

      await expect(
        resetLeadActivityOrder("lead-test-1")
      ).rejects.toThrow("Não autorizado");
    });
  });
});
