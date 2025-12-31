/**
 * Tests for Deal Cascade Delete Transaction
 * Phase 9: Architecture Improvements - Transaction Wrappers
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma with transaction support
const mockTx = {
  deal: {
    findFirst: vi.fn(),
    delete: vi.fn(),
  },
  dealProduct: {
    deleteMany: vi.fn(),
  },
  dealTechStack: {
    deleteMany: vi.fn(),
  },
  dealLanguage: {
    deleteMany: vi.fn(),
  },
  dealFramework: {
    deleteMany: vi.fn(),
  },
  activity: {
    deleteMany: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn((callback) => callback(mockTx)),
  },
}));

import { deleteDealWithCascade } from "@/lib/transactions";

describe("Deal Cascade Delete Transaction", () => {
  const DEAL_ID = "deal-1";
  const OWNER_ID = "user-1";

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockTx.deal.findFirst.mockResolvedValue({
      id: DEAL_ID,
      ownerId: OWNER_ID,
      title: "Test Deal",
    });
    mockTx.deal.delete.mockResolvedValue({ id: DEAL_ID });
    mockTx.dealProduct.deleteMany.mockResolvedValue({ count: 2 });
    mockTx.dealTechStack.deleteMany.mockResolvedValue({ count: 3 });
    mockTx.dealLanguage.deleteMany.mockResolvedValue({ count: 1 });
    mockTx.dealFramework.deleteMany.mockResolvedValue({ count: 1 });
    mockTx.activity.deleteMany.mockResolvedValue({ count: 5 });
  });

  // ==================== Products Deletion ====================
  describe("Products Deletion", () => {
    it("should delete deal products", async () => {
      const result = await deleteDealWithCascade(DEAL_ID, OWNER_ID);

      expect(mockTx.dealProduct.deleteMany).toHaveBeenCalledWith({
        where: { dealId: DEAL_ID },
      });
      expect(result.deletedProductCount).toBe(2);
    });

    it("should handle deals with no products", async () => {
      mockTx.dealProduct.deleteMany.mockResolvedValue({ count: 0 });

      const result = await deleteDealWithCascade(DEAL_ID, OWNER_ID);

      expect(result.deletedProductCount).toBe(0);
      expect(result.success).toBe(true);
    });
  });

  // ==================== Tech Stack Deletion ====================
  describe("Tech Stack Deletion", () => {
    it("should delete deal tech stack categories", async () => {
      await deleteDealWithCascade(DEAL_ID, OWNER_ID);

      expect(mockTx.dealTechStack.deleteMany).toHaveBeenCalledWith({
        where: { dealId: DEAL_ID },
      });
    });

    it("should delete deal languages", async () => {
      await deleteDealWithCascade(DEAL_ID, OWNER_ID);

      expect(mockTx.dealLanguage.deleteMany).toHaveBeenCalledWith({
        where: { dealId: DEAL_ID },
      });
    });

    it("should delete deal frameworks", async () => {
      await deleteDealWithCascade(DEAL_ID, OWNER_ID);

      expect(mockTx.dealFramework.deleteMany).toHaveBeenCalledWith({
        where: { dealId: DEAL_ID },
      });
    });

    it("should return tech stack count", async () => {
      const result = await deleteDealWithCascade(DEAL_ID, OWNER_ID);

      expect(result.deletedTechStackCount).toBe(3);
    });
  });

  // ==================== Activities Deletion ====================
  describe("Activities Deletion", () => {
    it("should delete activities linked to deal", async () => {
      await deleteDealWithCascade(DEAL_ID, OWNER_ID);

      expect(mockTx.activity.deleteMany).toHaveBeenCalledWith({
        where: { dealId: DEAL_ID },
      });
    });

    it("should return activity count", async () => {
      const result = await deleteDealWithCascade(DEAL_ID, OWNER_ID);

      expect(result.deletedActivityCount).toBe(5);
    });
  });

  // ==================== Deal Deletion ====================
  describe("Deal Deletion", () => {
    it("should delete the deal after related records", async () => {
      await deleteDealWithCascade(DEAL_ID, OWNER_ID);

      expect(mockTx.deal.delete).toHaveBeenCalledWith({
        where: { id: DEAL_ID },
      });
    });

    it("should return success on completion", async () => {
      const result = await deleteDealWithCascade(DEAL_ID, OWNER_ID);

      expect(result.success).toBe(true);
    });
  });

  // ==================== Ownership Verification ====================
  describe("Ownership Verification", () => {
    it("should verify ownership before deletion", async () => {
      await deleteDealWithCascade(DEAL_ID, OWNER_ID);

      expect(mockTx.deal.findFirst).toHaveBeenCalledWith({
        where: { id: DEAL_ID, ownerId: OWNER_ID },
      });
    });

    it("should throw error for non-existent deal", async () => {
      mockTx.deal.findFirst.mockResolvedValue(null);

      await expect(
        deleteDealWithCascade(DEAL_ID, OWNER_ID)
      ).rejects.toThrow("Negócio não encontrado");
    });

    it("should throw error when deal belongs to another user", async () => {
      mockTx.deal.findFirst.mockResolvedValue(null); // ownerId filter excludes other user's deal

      await expect(
        deleteDealWithCascade(DEAL_ID, "other-user")
      ).rejects.toThrow("Negócio não encontrado");
    });
  });

  // ==================== Contact Preservation ====================
  describe("Contact Preservation", () => {
    it("should not delete contacts when deleting deal", async () => {
      // Contacts are linked to deals but should not be deleted
      // They may be linked to other deals or the organization

      await deleteDealWithCascade(DEAL_ID, OWNER_ID);

      // Verify no contact deletion is attempted
      expect(mockTx).not.toHaveProperty("contact.deleteMany");
    });
  });

  // ==================== Rollback Scenarios ====================
  describe("Rollback Scenarios", () => {
    it("should rollback on product deletion error", async () => {
      mockTx.dealProduct.deleteMany.mockRejectedValue(
        new Error("Product deletion failed")
      );

      await expect(
        deleteDealWithCascade(DEAL_ID, OWNER_ID)
      ).rejects.toThrow("Product deletion failed");

      // Deal should not be deleted
      expect(mockTx.deal.delete).not.toHaveBeenCalled();
    });

    it("should rollback on tech stack deletion error", async () => {
      mockTx.dealTechStack.deleteMany.mockRejectedValue(
        new Error("Tech stack deletion failed")
      );

      await expect(
        deleteDealWithCascade(DEAL_ID, OWNER_ID)
      ).rejects.toThrow("Tech stack deletion failed");

      expect(mockTx.deal.delete).not.toHaveBeenCalled();
    });

    it("should rollback on activity deletion error", async () => {
      mockTx.activity.deleteMany.mockRejectedValue(
        new Error("Activity deletion failed")
      );

      await expect(
        deleteDealWithCascade(DEAL_ID, OWNER_ID)
      ).rejects.toThrow("Activity deletion failed");

      expect(mockTx.deal.delete).not.toHaveBeenCalled();
    });

    it("should rollback on deal deletion error", async () => {
      mockTx.deal.delete.mockRejectedValue(
        new Error("Deal deletion failed")
      );

      await expect(
        deleteDealWithCascade(DEAL_ID, OWNER_ID)
      ).rejects.toThrow("Deal deletion failed");
    });
  });

  // ==================== Complete Transaction ====================
  describe("Complete Transaction", () => {
    it("should delete all related records in correct order", async () => {
      const callOrder: string[] = [];

      mockTx.deal.findFirst.mockImplementation(() => {
        callOrder.push("findFirst");
        return Promise.resolve({ id: DEAL_ID, ownerId: OWNER_ID });
      });
      mockTx.dealProduct.deleteMany.mockImplementation(() => {
        callOrder.push("dealProduct.deleteMany");
        return Promise.resolve({ count: 0 });
      });
      mockTx.dealTechStack.deleteMany.mockImplementation(() => {
        callOrder.push("dealTechStack.deleteMany");
        return Promise.resolve({ count: 0 });
      });
      mockTx.dealLanguage.deleteMany.mockImplementation(() => {
        callOrder.push("dealLanguage.deleteMany");
        return Promise.resolve({ count: 0 });
      });
      mockTx.dealFramework.deleteMany.mockImplementation(() => {
        callOrder.push("dealFramework.deleteMany");
        return Promise.resolve({ count: 0 });
      });
      mockTx.activity.deleteMany.mockImplementation(() => {
        callOrder.push("activity.deleteMany");
        return Promise.resolve({ count: 0 });
      });
      mockTx.deal.delete.mockImplementation(() => {
        callOrder.push("deal.delete");
        return Promise.resolve({ id: DEAL_ID });
      });

      await deleteDealWithCascade(DEAL_ID, OWNER_ID);

      // Verify ownership check happens first
      expect(callOrder[0]).toBe("findFirst");
      // Verify deal deletion happens last
      expect(callOrder[callOrder.length - 1]).toBe("deal.delete");
    });
  });
});
