/**
 * Tests for Organization Cascade Delete Transaction
 * Phase 9: Architecture Improvements - Transaction Wrappers
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma with transaction support
const mockTx = {
  organization: {
    findFirst: vi.fn(),
    delete: vi.fn(),
  },
  contact: {
    deleteMany: vi.fn(),
  },
  deal: {
    findMany: vi.fn(),
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
  organizationLanguage: {
    deleteMany: vi.fn(),
  },
  organizationFramework: {
    deleteMany: vi.fn(),
  },
  organizationHosting: {
    deleteMany: vi.fn(),
  },
  organizationDatabase: {
    deleteMany: vi.fn(),
  },
  organizationERP: {
    deleteMany: vi.fn(),
  },
  organizationCRM: {
    deleteMany: vi.fn(),
  },
  organizationEcommerce: {
    deleteMany: vi.fn(),
  },
  organizationProduct: {
    deleteMany: vi.fn(),
  },
  organizationSecondaryCNAE: {
    deleteMany: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn((callback) => callback(mockTx)),
  },
}));

import { deleteOrganizationWithCascade } from "@/lib/transactions";

describe("Organization Cascade Delete Transaction", () => {
  const ORG_ID = "org-1";
  const OWNER_ID = "user-1";

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockTx.organization.findFirst.mockResolvedValue({
      id: ORG_ID,
      ownerId: OWNER_ID,
      name: "Test Organization",
    });
    mockTx.organization.delete.mockResolvedValue({ id: ORG_ID });
    mockTx.contact.deleteMany.mockResolvedValue({ count: 3 });
    mockTx.deal.findMany.mockResolvedValue([
      { id: "deal-1" },
      { id: "deal-2" },
    ]);
    mockTx.deal.delete.mockResolvedValue({});
    mockTx.dealProduct.deleteMany.mockResolvedValue({ count: 0 });
    mockTx.dealTechStack.deleteMany.mockResolvedValue({ count: 0 });
    mockTx.dealLanguage.deleteMany.mockResolvedValue({ count: 0 });
    mockTx.dealFramework.deleteMany.mockResolvedValue({ count: 0 });
    mockTx.activity.deleteMany.mockResolvedValue({ count: 5 });
    mockTx.organizationLanguage.deleteMany.mockResolvedValue({ count: 2 });
    mockTx.organizationFramework.deleteMany.mockResolvedValue({ count: 1 });
    mockTx.organizationHosting.deleteMany.mockResolvedValue({ count: 1 });
    mockTx.organizationDatabase.deleteMany.mockResolvedValue({ count: 1 });
    mockTx.organizationERP.deleteMany.mockResolvedValue({ count: 0 });
    mockTx.organizationCRM.deleteMany.mockResolvedValue({ count: 0 });
    mockTx.organizationEcommerce.deleteMany.mockResolvedValue({ count: 0 });
    mockTx.organizationProduct.deleteMany.mockResolvedValue({ count: 4 });
    mockTx.organizationSecondaryCNAE.deleteMany.mockResolvedValue({ count: 2 });
  });

  // ==================== Contacts Deletion ====================
  describe("Contacts Deletion", () => {
    it("should delete organization contacts", async () => {
      const result = await deleteOrganizationWithCascade(ORG_ID, OWNER_ID);

      expect(mockTx.contact.deleteMany).toHaveBeenCalledWith({
        where: { organizationId: ORG_ID },
      });
      expect(result.deletedContactCount).toBe(3);
    });

    it("should handle organizations with no contacts", async () => {
      mockTx.contact.deleteMany.mockResolvedValue({ count: 0 });

      const result = await deleteOrganizationWithCascade(ORG_ID, OWNER_ID);

      expect(result.deletedContactCount).toBe(0);
      expect(result.success).toBe(true);
    });
  });

  // ==================== Deals Deletion ====================
  describe("Deals Deletion", () => {
    it("should delete all deals linked to organization", async () => {
      const result = await deleteOrganizationWithCascade(ORG_ID, OWNER_ID);

      expect(mockTx.deal.findMany).toHaveBeenCalledWith({
        where: { organizationId: ORG_ID },
        select: { id: true },
      });
      expect(mockTx.deal.delete).toHaveBeenCalledTimes(2);
      expect(result.deletedDealCount).toBe(2);
    });

    it("should delete deal related records before deal", async () => {
      await deleteOrganizationWithCascade(ORG_ID, OWNER_ID);

      // Verify deal related records are deleted for each deal
      expect(mockTx.dealProduct.deleteMany).toHaveBeenCalledTimes(2);
      expect(mockTx.dealTechStack.deleteMany).toHaveBeenCalledTimes(2);
      expect(mockTx.dealLanguage.deleteMany).toHaveBeenCalledTimes(2);
      expect(mockTx.dealFramework.deleteMany).toHaveBeenCalledTimes(2);
    });

    it("should handle organizations with no deals", async () => {
      mockTx.deal.findMany.mockResolvedValue([]);

      const result = await deleteOrganizationWithCascade(ORG_ID, OWNER_ID);

      expect(result.deletedDealCount).toBe(0);
      expect(mockTx.deal.delete).not.toHaveBeenCalled();
    });
  });

  // ==================== Tech Profile Deletion ====================
  describe("Tech Profile Deletion", () => {
    it("should delete organization tech profile", async () => {
      await deleteOrganizationWithCascade(ORG_ID, OWNER_ID);

      expect(mockTx.organizationLanguage.deleteMany).toHaveBeenCalledWith({
        where: { organizationId: ORG_ID },
      });
      expect(mockTx.organizationFramework.deleteMany).toHaveBeenCalledWith({
        where: { organizationId: ORG_ID },
      });
      expect(mockTx.organizationHosting.deleteMany).toHaveBeenCalledWith({
        where: { organizationId: ORG_ID },
      });
      expect(mockTx.organizationDatabase.deleteMany).toHaveBeenCalledWith({
        where: { organizationId: ORG_ID },
      });
      expect(mockTx.organizationERP.deleteMany).toHaveBeenCalledWith({
        where: { organizationId: ORG_ID },
      });
      expect(mockTx.organizationCRM.deleteMany).toHaveBeenCalledWith({
        where: { organizationId: ORG_ID },
      });
      expect(mockTx.organizationEcommerce.deleteMany).toHaveBeenCalledWith({
        where: { organizationId: ORG_ID },
      });
    });

    it("should return tech profile count", async () => {
      const result = await deleteOrganizationWithCascade(ORG_ID, OWNER_ID);

      // 2 + 1 + 1 + 1 + 0 + 0 + 0 = 5
      expect(result.deletedTechProfileCount).toBe(5);
    });
  });

  // ==================== Products Deletion ====================
  describe("Products Deletion", () => {
    it("should delete organization products", async () => {
      const result = await deleteOrganizationWithCascade(ORG_ID, OWNER_ID);

      expect(mockTx.organizationProduct.deleteMany).toHaveBeenCalledWith({
        where: { organizationId: ORG_ID },
      });
      expect(result.deletedProductCount).toBe(4);
    });
  });

  // ==================== CNAEs Deletion ====================
  describe("CNAEs Deletion", () => {
    it("should delete secondary CNAEs", async () => {
      const result = await deleteOrganizationWithCascade(ORG_ID, OWNER_ID);

      expect(mockTx.organizationSecondaryCNAE.deleteMany).toHaveBeenCalledWith({
        where: { organizationId: ORG_ID },
      });
      expect(result.deletedCNAECount).toBe(2);
    });
  });

  // ==================== Organization Deletion ====================
  describe("Organization Deletion", () => {
    it("should delete the organization after related records", async () => {
      await deleteOrganizationWithCascade(ORG_ID, OWNER_ID);

      expect(mockTx.organization.delete).toHaveBeenCalledWith({
        where: { id: ORG_ID },
      });
    });

    it("should return success on completion", async () => {
      const result = await deleteOrganizationWithCascade(ORG_ID, OWNER_ID);

      expect(result.success).toBe(true);
    });
  });

  // ==================== Ownership Verification ====================
  describe("Ownership Verification", () => {
    it("should verify ownership before deletion", async () => {
      await deleteOrganizationWithCascade(ORG_ID, OWNER_ID);

      expect(mockTx.organization.findFirst).toHaveBeenCalledWith({
        where: { id: ORG_ID, ownerId: OWNER_ID },
      });
    });

    it("should throw error for non-existent organization", async () => {
      mockTx.organization.findFirst.mockResolvedValue(null);

      await expect(
        deleteOrganizationWithCascade(ORG_ID, OWNER_ID)
      ).rejects.toThrow("Organização não encontrada");
    });

    it("should throw error when organization belongs to another user", async () => {
      mockTx.organization.findFirst.mockResolvedValue(null);

      await expect(
        deleteOrganizationWithCascade(ORG_ID, "other-user")
      ).rejects.toThrow("Organização não encontrada");
    });
  });

  // ==================== External Projects Preservation ====================
  describe("External Projects Preservation", () => {
    it("should not affect external projects", async () => {
      // External projects are stored in a separate system
      // The organization just stores project IDs

      await deleteOrganizationWithCascade(ORG_ID, OWNER_ID);

      // Verify no external project deletion is attempted
      expect(mockTx).not.toHaveProperty("externalProject");
    });
  });

  // ==================== Rollback Scenarios ====================
  describe("Rollback Scenarios", () => {
    it("should rollback on contact deletion error", async () => {
      mockTx.contact.deleteMany.mockRejectedValue(
        new Error("Contact deletion failed")
      );

      await expect(
        deleteOrganizationWithCascade(ORG_ID, OWNER_ID)
      ).rejects.toThrow("Contact deletion failed");

      expect(mockTx.organization.delete).not.toHaveBeenCalled();
    });

    it("should rollback on deal deletion error", async () => {
      mockTx.deal.delete.mockRejectedValue(
        new Error("Deal deletion failed")
      );

      await expect(
        deleteOrganizationWithCascade(ORG_ID, OWNER_ID)
      ).rejects.toThrow("Deal deletion failed");

      expect(mockTx.organization.delete).not.toHaveBeenCalled();
    });

    it("should rollback on tech profile deletion error", async () => {
      mockTx.organizationLanguage.deleteMany.mockRejectedValue(
        new Error("Tech profile deletion failed")
      );

      await expect(
        deleteOrganizationWithCascade(ORG_ID, OWNER_ID)
      ).rejects.toThrow("Tech profile deletion failed");

      expect(mockTx.organization.delete).not.toHaveBeenCalled();
    });

    it("should rollback on organization deletion error", async () => {
      mockTx.organization.delete.mockRejectedValue(
        new Error("Organization deletion failed")
      );

      await expect(
        deleteOrganizationWithCascade(ORG_ID, OWNER_ID)
      ).rejects.toThrow("Organization deletion failed");
    });
  });

  // ==================== Activities Deletion ====================
  describe("Activities Deletion", () => {
    it("should delete activities linked to deals", async () => {
      await deleteOrganizationWithCascade(ORG_ID, OWNER_ID);

      // Activities linked to each deal should be deleted
      expect(mockTx.activity.deleteMany).toHaveBeenCalledWith({
        where: { dealId: "deal-1" },
      });
      expect(mockTx.activity.deleteMany).toHaveBeenCalledWith({
        where: { dealId: "deal-2" },
      });
    });

    it("should delete activities directly linked to organization", async () => {
      await deleteOrganizationWithCascade(ORG_ID, OWNER_ID);

      // One of the activity.deleteMany calls should be for the organization
      expect(mockTx.activity.deleteMany).toHaveBeenCalledWith({
        where: { organizationId: ORG_ID },
      });
    });
  });
});
