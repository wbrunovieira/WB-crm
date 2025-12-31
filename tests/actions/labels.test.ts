/**
 * Tests for Labels Actions
 * Phase 7: Auxiliary Actions - Labels
 *
 * Actions tested:
 * - getLabels
 * - createLabel
 * - updateLabel
 * - deleteLabel
 *
 * Note: Labels ARE user-scoped with unique constraint [name, ownerId]
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Valid CUID format for testing
const USER_ID_A = "clxxxxxxxxxxxxxxxxxxxxxxxxxua";
const USER_ID_B = "clxxxxxxxxxxxxxxxxxxxxxxxxxub";
const LABEL_ID_1 = "clxxxxxxxxxxxxxxxxxxxxxxxxxl1";
const LABEL_ID_2 = "clxxxxxxxxxxxxxxxxxxxxxxxxxl2";

// Mock sessions
const sessionUserA = {
  user: { id: USER_ID_A, email: "usera@test.com", name: "User A", role: "sdr" },
};
const sessionUserB = {
  user: { id: USER_ID_B, email: "userb@test.com", name: "User B", role: "sdr" },
};

// Mock next-auth
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

// Mock auth options
vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

// Mock revalidatePath
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    label: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import {
  getLabels,
  createLabel,
  updateLabel,
  deleteLabel,
} from "@/actions/labels";

describe("Labels Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== GET LABELS ====================
  describe("getLabels", () => {
    it("should throw error when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      await expect(getLabels()).rejects.toThrow("Não autorizado");
    });

    it("should return only labels for the authenticated user", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      const mockLabels = [
        { id: LABEL_ID_1, name: "Hot Lead", color: "#ff0000", ownerId: USER_ID_A },
        { id: LABEL_ID_2, name: "Cold Lead", color: "#0000ff", ownerId: USER_ID_A },
      ];

      vi.mocked(prisma.label.findMany).mockResolvedValue(mockLabels as any);

      const result = await getLabels();

      expect(prisma.label.findMany).toHaveBeenCalledWith({
        where: { ownerId: USER_ID_A },
        orderBy: { name: "asc" },
      });
      expect(result).toEqual(mockLabels);
      expect(result).toHaveLength(2);
    });

    it("should return empty array when user has no labels", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      vi.mocked(prisma.label.findMany).mockResolvedValue([]);

      const result = await getLabels();

      expect(result).toEqual([]);
    });

    it("should filter labels by ownerId (data isolation)", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserB as any);

      const userBLabels = [
        { id: "lb-1", name: "Priority", color: "#00ff00", ownerId: USER_ID_B },
      ];

      vi.mocked(prisma.label.findMany).mockResolvedValue(userBLabels as any);

      const result = await getLabels();

      expect(prisma.label.findMany).toHaveBeenCalledWith({
        where: { ownerId: USER_ID_B },
        orderBy: { name: "asc" },
      });
      expect(result).toHaveLength(1);
      expect(result[0].ownerId).toBe(USER_ID_B);
    });
  });

  // ==================== CREATE LABEL ====================
  describe("createLabel", () => {
    it("should throw error when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      await expect(createLabel("Test", "#ff0000")).rejects.toThrow("Não autorizado");
    });

    it("should create a new label for the authenticated user", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      vi.mocked(prisma.label.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.label.create).mockResolvedValue({
        id: LABEL_ID_1,
        name: "New Label",
        color: "#ff0000",
        ownerId: USER_ID_A,
      } as any);

      const result = await createLabel("New Label", "#ff0000");

      expect(prisma.label.findUnique).toHaveBeenCalledWith({
        where: {
          name_ownerId: {
            name: "New Label",
            ownerId: USER_ID_A,
          },
        },
      });
      expect(prisma.label.create).toHaveBeenCalledWith({
        data: {
          name: "New Label",
          color: "#ff0000",
          ownerId: USER_ID_A,
        },
      });
      expect(result.name).toBe("New Label");
      expect(result.ownerId).toBe(USER_ID_A);
    });

    it("should return existing label if name already exists for user", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      const existingLabel = {
        id: LABEL_ID_1,
        name: "Existing Label",
        color: "#0000ff",
        ownerId: USER_ID_A,
      };

      vi.mocked(prisma.label.findUnique).mockResolvedValue(existingLabel as any);

      const result = await createLabel("Existing Label", "#ff0000");

      expect(prisma.label.create).not.toHaveBeenCalled();
      expect(result).toEqual(existingLabel);
    });

    it("should allow same label name for different users", async () => {
      // User A creates label
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.label.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.label.create).mockResolvedValue({
        id: LABEL_ID_1,
        name: "Hot Lead",
        color: "#ff0000",
        ownerId: USER_ID_A,
      } as any);

      await createLabel("Hot Lead", "#ff0000");

      // User B can create same label name
      vi.mocked(getServerSession).mockResolvedValue(sessionUserB as any);
      vi.mocked(prisma.label.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.label.create).mockResolvedValue({
        id: LABEL_ID_2,
        name: "Hot Lead",
        color: "#00ff00",
        ownerId: USER_ID_B,
      } as any);

      const result = await createLabel("Hot Lead", "#00ff00");

      expect(result.ownerId).toBe(USER_ID_B);
      expect(result.name).toBe("Hot Lead");
    });
  });

  // ==================== UPDATE LABEL ====================
  describe("updateLabel", () => {
    it("should throw error when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      await expect(updateLabel(LABEL_ID_1, "Updated", "#00ff00")).rejects.toThrow("Não autorizado");
    });

    it("should update label owned by user", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      vi.mocked(prisma.label.update).mockResolvedValue({
        id: LABEL_ID_1,
        name: "Updated Label",
        color: "#00ff00",
        ownerId: USER_ID_A,
      } as any);

      const result = await updateLabel(LABEL_ID_1, "Updated Label", "#00ff00");

      expect(prisma.label.update).toHaveBeenCalledWith({
        where: {
          id: LABEL_ID_1,
          ownerId: USER_ID_A,
        },
        data: {
          name: "Updated Label",
          color: "#00ff00",
        },
      });
      expect(result.name).toBe("Updated Label");
    });

    it("should include ownerId in where clause for security", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      vi.mocked(prisma.label.update).mockResolvedValue({
        id: LABEL_ID_1,
        name: "Updated",
        color: "#ffffff",
        ownerId: USER_ID_A,
      } as any);

      await updateLabel(LABEL_ID_1, "Updated", "#ffffff");

      // Verify ownerId is in the where clause
      expect(prisma.label.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: USER_ID_A,
          }),
        })
      );
    });
  });

  // ==================== DELETE LABEL ====================
  describe("deleteLabel", () => {
    it("should throw error when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      await expect(deleteLabel(LABEL_ID_1)).rejects.toThrow("Não autorizado");
    });

    it("should delete label owned by user", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      vi.mocked(prisma.label.delete).mockResolvedValue({} as any);

      await deleteLabel(LABEL_ID_1);

      expect(prisma.label.delete).toHaveBeenCalledWith({
        where: {
          id: LABEL_ID_1,
          ownerId: USER_ID_A,
        },
      });
    });

    it("should include ownerId in where clause for security", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      vi.mocked(prisma.label.delete).mockResolvedValue({} as any);

      await deleteLabel(LABEL_ID_1);

      // Verify ownerId is in the where clause
      expect(prisma.label.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: USER_ID_A,
          }),
        })
      );
    });
  });

  // ==================== DATA ISOLATION ====================
  describe("Data Isolation", () => {
    it("should only show labels owned by the authenticated user", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      // Mock returns only User A's labels (Prisma filtered by ownerId)
      const userALabels = [
        { id: LABEL_ID_1, name: "Label A1", color: "#ff0000", ownerId: USER_ID_A },
      ];

      vi.mocked(prisma.label.findMany).mockResolvedValue(userALabels as any);

      const result = await getLabels();

      // Verify filter was applied
      expect(prisma.label.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { ownerId: USER_ID_A },
        })
      );
      expect(result.every(label => label.ownerId === USER_ID_A)).toBe(true);
    });

    it("should not allow updating labels owned by another user", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      // Prisma will throw error because where clause includes ownerId
      vi.mocked(prisma.label.update).mockRejectedValue(new Error("Record not found"));

      // Trying to update label with USER_ID_B ownership won't work
      // because the where clause includes USER_ID_A (current user)
      await expect(updateLabel(LABEL_ID_2, "Hacked", "#000000")).rejects.toThrow();
    });

    it("should not allow deleting labels owned by another user", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      // Prisma will throw error because where clause includes ownerId
      vi.mocked(prisma.label.delete).mockRejectedValue(new Error("Record not found"));

      await expect(deleteLabel(LABEL_ID_2)).rejects.toThrow();
    });
  });
});
