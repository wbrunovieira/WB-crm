import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma - must be defined before vi.mock
vi.mock("@/lib/prisma", () => ({
  prisma: {
    organization: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    label: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

// Import after mocking
import {
  addLabelToOrganization,
  removeLabelFromOrganization,
  getOrganizationLabels,
  setOrganizationLabels,
} from "@/actions/organization-labels";
import { prisma } from "@/lib/prisma";

// Get typed mock references
const mockPrisma = prisma as unknown as {
  organization: {
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  label: {
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
};

// Mock NextAuth
const mockSession = {
  user: { id: "user-1", email: "test@example.com", name: "Test User" },
};

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(() => Promise.resolve(mockSession)),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

// Mock revalidatePath
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Organization Labels Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============ addLabelToOrganization ============

  describe("addLabelToOrganization", () => {
    it("should add a label to an organization", async () => {
      const mockOrganization = {
        id: "org-1",
        name: "Test Org",
        ownerId: "user-1",
        labels: [],
      };
      const mockLabel = { id: "label-1", name: "Saúde", color: "#ff0000", ownerId: "user-1" };
      const updatedOrganization = { ...mockOrganization, labels: [mockLabel] };

      mockPrisma.organization.findFirst.mockResolvedValue(mockOrganization);
      mockPrisma.label.findFirst.mockResolvedValue(mockLabel);
      mockPrisma.organization.update.mockResolvedValue(updatedOrganization);

      const result = await addLabelToOrganization("org-1", "label-1");

      expect(result.labels).toHaveLength(1);
      expect(result.labels[0].id).toBe("label-1");
      expect(mockPrisma.organization.update).toHaveBeenCalledWith({
        where: { id: "org-1" },
        data: {
          labels: {
            connect: { id: "label-1" },
          },
        },
        include: { labels: true },
      });
    });

    it("should throw error if organization not found", async () => {
      mockPrisma.organization.findFirst.mockResolvedValue(null);

      await expect(addLabelToOrganization("org-1", "label-1")).rejects.toThrow(
        "Organização não encontrada"
      );
    });

    it("should throw error if label not found", async () => {
      const mockOrganization = { id: "org-1", ownerId: "user-1", labels: [] };
      mockPrisma.organization.findFirst.mockResolvedValue(mockOrganization);
      mockPrisma.label.findFirst.mockResolvedValue(null);

      await expect(addLabelToOrganization("org-1", "label-1")).rejects.toThrow(
        "Label não encontrada"
      );
    });

    it("should not allow adding label from another user", async () => {
      const mockOrganization = { id: "org-1", ownerId: "user-1", labels: [] };
      mockPrisma.organization.findFirst.mockResolvedValue(mockOrganization);
      // Label belongs to different user - findFirst returns null due to ownerId filter
      mockPrisma.label.findFirst.mockResolvedValue(null);

      await expect(addLabelToOrganization("org-1", "label-other")).rejects.toThrow(
        "Label não encontrada"
      );
    });
  });

  // ============ removeLabelFromOrganization ============

  describe("removeLabelFromOrganization", () => {
    it("should remove a label from an organization", async () => {
      const mockLabel = { id: "label-1", name: "Saúde", color: "#ff0000" };
      const mockOrganization = {
        id: "org-1",
        ownerId: "user-1",
        labels: [mockLabel],
      };
      const updatedOrganization = { ...mockOrganization, labels: [] };

      mockPrisma.organization.findFirst.mockResolvedValue(mockOrganization);
      mockPrisma.organization.update.mockResolvedValue(updatedOrganization);

      const result = await removeLabelFromOrganization("org-1", "label-1");

      expect(result.labels).toHaveLength(0);
      expect(mockPrisma.organization.update).toHaveBeenCalledWith({
        where: { id: "org-1" },
        data: {
          labels: {
            disconnect: { id: "label-1" },
          },
        },
        include: { labels: true },
      });
    });

    it("should throw error if organization not found", async () => {
      mockPrisma.organization.findFirst.mockResolvedValue(null);

      await expect(removeLabelFromOrganization("org-1", "label-1")).rejects.toThrow(
        "Organização não encontrada"
      );
    });
  });

  // ============ getOrganizationLabels ============

  describe("getOrganizationLabels", () => {
    it("should return all labels for an organization", async () => {
      const mockLabels = [
        { id: "label-1", name: "Saúde", color: "#ff0000" },
        { id: "label-2", name: "Educação", color: "#00ff00" },
      ];
      const mockOrganization = {
        id: "org-1",
        ownerId: "user-1",
        labels: mockLabels,
      };

      mockPrisma.organization.findFirst.mockResolvedValue(mockOrganization);

      const result = await getOrganizationLabels("org-1");

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Saúde");
      expect(result[1].name).toBe("Educação");
    });

    it("should return empty array if organization has no labels", async () => {
      const mockOrganization = {
        id: "org-1",
        ownerId: "user-1",
        labels: [],
      };

      mockPrisma.organization.findFirst.mockResolvedValue(mockOrganization);

      const result = await getOrganizationLabels("org-1");

      expect(result).toHaveLength(0);
    });

    it("should throw error if organization not found", async () => {
      mockPrisma.organization.findFirst.mockResolvedValue(null);

      await expect(getOrganizationLabels("org-1")).rejects.toThrow(
        "Organização não encontrada"
      );
    });
  });

  // ============ setOrganizationLabels ============

  describe("setOrganizationLabels", () => {
    it("should set multiple labels for an organization", async () => {
      const mockOrganization = { id: "org-1", ownerId: "user-1" };
      const mockLabels = [
        { id: "label-1", name: "Saúde", color: "#ff0000", ownerId: "user-1" },
        { id: "label-2", name: "Educação", color: "#00ff00", ownerId: "user-1" },
      ];
      const updatedOrganization = { ...mockOrganization, labels: mockLabels };

      mockPrisma.organization.findFirst.mockResolvedValue(mockOrganization);
      mockPrisma.label.findMany.mockResolvedValue(mockLabels);
      mockPrisma.organization.update.mockResolvedValue(updatedOrganization);

      const result = await setOrganizationLabels("org-1", ["label-1", "label-2"]);

      expect(result.labels).toHaveLength(2);
      expect(mockPrisma.organization.update).toHaveBeenCalledWith({
        where: { id: "org-1" },
        data: {
          labels: {
            set: [{ id: "label-1" }, { id: "label-2" }],
          },
        },
        include: { labels: true },
      });
    });

    it("should clear all labels when empty array is passed", async () => {
      const mockOrganization = { id: "org-1", ownerId: "user-1" };
      const updatedOrganization = { ...mockOrganization, labels: [] };

      mockPrisma.organization.findFirst.mockResolvedValue(mockOrganization);
      mockPrisma.label.findMany.mockResolvedValue([]);
      mockPrisma.organization.update.mockResolvedValue(updatedOrganization);

      const result = await setOrganizationLabels("org-1", []);

      expect(result.labels).toHaveLength(0);
      expect(mockPrisma.organization.update).toHaveBeenCalledWith({
        where: { id: "org-1" },
        data: {
          labels: {
            set: [],
          },
        },
        include: { labels: true },
      });
    });

    it("should only set labels owned by the user", async () => {
      const mockOrganization = { id: "org-1", ownerId: "user-1" };
      // Only label-1 is owned by user-1
      const mockLabels = [
        { id: "label-1", name: "Saúde", color: "#ff0000", ownerId: "user-1" },
      ];
      const updatedOrganization = { ...mockOrganization, labels: mockLabels };

      mockPrisma.organization.findFirst.mockResolvedValue(mockOrganization);
      mockPrisma.label.findMany.mockResolvedValue(mockLabels);
      mockPrisma.organization.update.mockResolvedValue(updatedOrganization);

      // Try to set label-1 (owned) and label-other (not owned)
      const result = await setOrganizationLabels("org-1", ["label-1", "label-other"]);

      // Should only set label-1
      expect(result.labels).toHaveLength(1);
      expect(mockPrisma.organization.update).toHaveBeenCalledWith({
        where: { id: "org-1" },
        data: {
          labels: {
            set: [{ id: "label-1" }],
          },
        },
        include: { labels: true },
      });
    });

    it("should throw error if organization not found", async () => {
      mockPrisma.organization.findFirst.mockResolvedValue(null);

      await expect(setOrganizationLabels("org-1", ["label-1"])).rejects.toThrow(
        "Organização não encontrada"
      );
    });

    it("should replace existing labels with new ones", async () => {
      const mockOrganization = { id: "org-1", ownerId: "user-1" };
      const newLabels = [
        { id: "label-3", name: "Tech", color: "#0000ff", ownerId: "user-1" },
      ];
      const updatedOrganization = { ...mockOrganization, labels: newLabels };

      mockPrisma.organization.findFirst.mockResolvedValue(mockOrganization);
      mockPrisma.label.findMany.mockResolvedValue(newLabels);
      mockPrisma.organization.update.mockResolvedValue(updatedOrganization);

      const result = await setOrganizationLabels("org-1", ["label-3"]);

      expect(result.labels).toHaveLength(1);
      expect(result.labels[0].name).toBe("Tech");
    });
  });

  // ============ Authentication Tests ============

  describe("Authentication", () => {
    it("should throw error when not authenticated - addLabelToOrganization", async () => {
      const { getServerSession } = await import("next-auth");
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      await expect(addLabelToOrganization("org-1", "label-1")).rejects.toThrow(
        "Não autorizado"
      );
    });

    it("should throw error when not authenticated - removeLabelFromOrganization", async () => {
      const { getServerSession } = await import("next-auth");
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      await expect(removeLabelFromOrganization("org-1", "label-1")).rejects.toThrow(
        "Não autorizado"
      );
    });

    it("should throw error when not authenticated - getOrganizationLabels", async () => {
      const { getServerSession } = await import("next-auth");
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      await expect(getOrganizationLabels("org-1")).rejects.toThrow(
        "Não autorizado"
      );
    });

    it("should throw error when not authenticated - setOrganizationLabels", async () => {
      const { getServerSession } = await import("next-auth");
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      await expect(setOrganizationLabels("org-1", ["label-1"])).rejects.toThrow(
        "Não autorizado"
      );
    });
  });

  // ============ Data Isolation Tests ============

  describe("Data Isolation", () => {
    it("should not access organization from another user", async () => {
      // findFirst returns null because ownerId filter doesn't match
      mockPrisma.organization.findFirst.mockResolvedValue(null);

      await expect(addLabelToOrganization("org-other-user", "label-1")).rejects.toThrow(
        "Organização não encontrada"
      );
    });
  });
});
