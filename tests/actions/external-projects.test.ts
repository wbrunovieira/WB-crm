/**
 * Tests for External Projects Actions
 * Phase 7: Auxiliary Actions - External Projects
 *
 * Actions tested:
 * - linkProjectToOrganization
 * - unlinkProjectFromOrganization
 * - getOrganizationProjects
 *
 * Note: External projects require authentication and ownership verification
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Valid CUID format for testing
const USER_ID_A = "clxxxxxxxxxxxxxxxxxxxxxxxxxua";
const USER_ID_B = "clxxxxxxxxxxxxxxxxxxxxxxxxxub";
const ORG_ID = "clxxxxxxxxxxxxxxxxxxxxxxxxxor1";
const PROJECT_ID_1 = "proj-001";
const PROJECT_ID_2 = "proj-002";

// Mock sessions
const sessionUserA = {
  user: { id: USER_ID_A, email: "usera@test.com", name: "User A", role: "sdr" },
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
    organization: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import {
  linkProjectToOrganization,
  unlinkProjectFromOrganization,
  getOrganizationProjects,
} from "@/actions/external-projects";

describe("External Projects Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== LINK PROJECT TO ORGANIZATION ====================
  describe("linkProjectToOrganization", () => {
    it("should throw error when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      await expect(linkProjectToOrganization(ORG_ID, PROJECT_ID_1)).rejects.toThrow("Não autorizado");
    });

    it("should throw error when organization not found", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.organization.findUnique).mockResolvedValue(null);

      await expect(linkProjectToOrganization(ORG_ID, PROJECT_ID_1)).rejects.toThrow("Organização não encontrada");
    });

    it("should throw error when organization belongs to another user", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      // Organization query includes ownerId in where clause
      // So if user A tries to access user B's org, it returns null
      vi.mocked(prisma.organization.findUnique).mockResolvedValue(null);

      await expect(linkProjectToOrganization(ORG_ID, PROJECT_ID_1)).rejects.toThrow("Organização não encontrada");
    });

    it("should link project to organization with no existing projects", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: ORG_ID,
        ownerId: USER_ID_A,
        externalProjectIds: null,
      } as any);
      vi.mocked(prisma.organization.update).mockResolvedValue({} as any);

      await linkProjectToOrganization(ORG_ID, PROJECT_ID_1);

      expect(prisma.organization.findUnique).toHaveBeenCalledWith({
        where: {
          id: ORG_ID,
          ownerId: USER_ID_A,
        },
      });
      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: ORG_ID },
        data: {
          externalProjectIds: JSON.stringify([PROJECT_ID_1]),
        },
      });
    });

    it("should link project to organization with existing projects", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: ORG_ID,
        ownerId: USER_ID_A,
        externalProjectIds: JSON.stringify([PROJECT_ID_1]),
      } as any);
      vi.mocked(prisma.organization.update).mockResolvedValue({} as any);

      await linkProjectToOrganization(ORG_ID, PROJECT_ID_2);

      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: ORG_ID },
        data: {
          externalProjectIds: JSON.stringify([PROJECT_ID_1, PROJECT_ID_2]),
        },
      });
    });

    it("should not duplicate project if already linked", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: ORG_ID,
        ownerId: USER_ID_A,
        externalProjectIds: JSON.stringify([PROJECT_ID_1]),
      } as any);
      vi.mocked(prisma.organization.update).mockResolvedValue({} as any);

      await linkProjectToOrganization(ORG_ID, PROJECT_ID_1);

      // Should still have only one project
      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: ORG_ID },
        data: {
          externalProjectIds: JSON.stringify([PROJECT_ID_1]),
        },
      });
    });
  });

  // ==================== UNLINK PROJECT FROM ORGANIZATION ====================
  describe("unlinkProjectFromOrganization", () => {
    it("should throw error when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      await expect(unlinkProjectFromOrganization(ORG_ID, PROJECT_ID_1)).rejects.toThrow("Não autorizado");
    });

    it("should throw error when organization not found", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.organization.findUnique).mockResolvedValue(null);

      await expect(unlinkProjectFromOrganization(ORG_ID, PROJECT_ID_1)).rejects.toThrow("Organização não encontrada");
    });

    it("should unlink project from organization", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: ORG_ID,
        ownerId: USER_ID_A,
        externalProjectIds: JSON.stringify([PROJECT_ID_1, PROJECT_ID_2]),
      } as any);
      vi.mocked(prisma.organization.update).mockResolvedValue({} as any);

      await unlinkProjectFromOrganization(ORG_ID, PROJECT_ID_1);

      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: ORG_ID },
        data: {
          externalProjectIds: JSON.stringify([PROJECT_ID_2]),
        },
      });
    });

    it("should handle unlinking last project", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: ORG_ID,
        ownerId: USER_ID_A,
        externalProjectIds: JSON.stringify([PROJECT_ID_1]),
      } as any);
      vi.mocked(prisma.organization.update).mockResolvedValue({} as any);

      await unlinkProjectFromOrganization(ORG_ID, PROJECT_ID_1);

      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: ORG_ID },
        data: {
          externalProjectIds: JSON.stringify([]),
        },
      });
    });

    it("should handle unlinking non-existent project gracefully", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: ORG_ID,
        ownerId: USER_ID_A,
        externalProjectIds: JSON.stringify([PROJECT_ID_1]),
      } as any);
      vi.mocked(prisma.organization.update).mockResolvedValue({} as any);

      await unlinkProjectFromOrganization(ORG_ID, "non-existent");

      // Should not change the array
      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: ORG_ID },
        data: {
          externalProjectIds: JSON.stringify([PROJECT_ID_1]),
        },
      });
    });

    it("should handle organization with null externalProjectIds", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: ORG_ID,
        ownerId: USER_ID_A,
        externalProjectIds: null,
      } as any);
      vi.mocked(prisma.organization.update).mockResolvedValue({} as any);

      await unlinkProjectFromOrganization(ORG_ID, PROJECT_ID_1);

      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: ORG_ID },
        data: {
          externalProjectIds: JSON.stringify([]),
        },
      });
    });
  });

  // ==================== GET ORGANIZATION PROJECTS ====================
  describe("getOrganizationProjects", () => {
    it("should throw error when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      await expect(getOrganizationProjects(ORG_ID)).rejects.toThrow("Não autorizado");
    });

    it("should throw error when organization not found", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.organization.findUnique).mockResolvedValue(null);

      await expect(getOrganizationProjects(ORG_ID)).rejects.toThrow("Organização não encontrada");
    });

    it("should return project IDs for organization", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        externalProjectIds: JSON.stringify([PROJECT_ID_1, PROJECT_ID_2]),
      } as any);

      const result = await getOrganizationProjects(ORG_ID);

      expect(prisma.organization.findUnique).toHaveBeenCalledWith({
        where: {
          id: ORG_ID,
          ownerId: USER_ID_A,
        },
        select: {
          externalProjectIds: true,
        },
      });
      expect(result).toEqual([PROJECT_ID_1, PROJECT_ID_2]);
    });

    it("should return empty array when organization has no projects", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        externalProjectIds: null,
      } as any);

      const result = await getOrganizationProjects(ORG_ID);

      expect(result).toEqual([]);
    });

    it("should return empty array for empty JSON array", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        externalProjectIds: JSON.stringify([]),
      } as any);

      const result = await getOrganizationProjects(ORG_ID);

      expect(result).toEqual([]);
    });
  });

  // ==================== DATA ISOLATION ====================
  describe("Data Isolation", () => {
    it("should not allow linking projects to organization of another user", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      // When user A tries to access org owned by user B
      // The findUnique with ownerId filter returns null
      vi.mocked(prisma.organization.findUnique).mockResolvedValue(null);

      await expect(linkProjectToOrganization(ORG_ID, PROJECT_ID_1)).rejects.toThrow("Organização não encontrada");
    });

    it("should not allow unlinking projects from organization of another user", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.organization.findUnique).mockResolvedValue(null);

      await expect(unlinkProjectFromOrganization(ORG_ID, PROJECT_ID_1)).rejects.toThrow("Organização não encontrada");
    });

    it("should not allow viewing projects of organization of another user", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.organization.findUnique).mockResolvedValue(null);

      await expect(getOrganizationProjects(ORG_ID)).rejects.toThrow("Organização não encontrada");
    });

    it("should verify ownerId is included in findUnique where clause", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: ORG_ID,
        ownerId: USER_ID_A,
        externalProjectIds: null,
      } as any);
      vi.mocked(prisma.organization.update).mockResolvedValue({} as any);

      await linkProjectToOrganization(ORG_ID, PROJECT_ID_1);

      expect(prisma.organization.findUnique).toHaveBeenCalledWith({
        where: expect.objectContaining({
          ownerId: USER_ID_A,
        }),
      });
    });
  });
});
