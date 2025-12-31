/**
 * TDD Tests for Entity Transfer and Sharing
 *
 * These tests are written FIRST and should FAIL until implementation is complete.
 *
 * Features:
 * 1. Transfer - Change ownership of an entity to another user (admin only)
 * 2. Share - Share an entity with another user without transferring ownership (admin only)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    lead: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    contact: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    organization: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    partner: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    deal: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    sharedEntity: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
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

// Mock revalidatePath
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import {
  transferEntity,
  shareEntity,
  unshareEntity,
  getSharedUsers,
  getAvailableUsersForSharing,
  type EntityType,
} from "@/actions/entity-management";

describe("Entity Management - Transfer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("transferEntity", () => {
    it("should throw error if not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      await expect(
        transferEntity("lead", "lead-1", "user-2")
      ).rejects.toThrow("Não autorizado");
    });

    it("should throw error if user is not admin", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "user-1", role: "sdr" },
      } as any);

      await expect(
        transferEntity("lead", "lead-1", "user-2")
      ).rejects.toThrow("Apenas administradores podem transferir entidades");
    });

    it("should throw error if entity not found", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "admin-1", role: "admin" },
      } as any);

      vi.mocked(prisma.lead.findUnique).mockResolvedValueOnce(null);

      await expect(
        transferEntity("lead", "lead-1", "user-2")
      ).rejects.toThrow("Entidade não encontrada");
    });

    it("should throw error if target user not found", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "admin-1", role: "admin" },
      } as any);

      vi.mocked(prisma.lead.findUnique).mockResolvedValueOnce({
        id: "lead-1",
        ownerId: "user-1",
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

      await expect(
        transferEntity("lead", "lead-1", "user-2")
      ).rejects.toThrow("Usuário de destino não encontrado");
    });

    it("should successfully transfer a lead to another user", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "admin-1", role: "admin" },
      } as any);

      vi.mocked(prisma.lead.findUnique).mockResolvedValueOnce({
        id: "lead-1",
        ownerId: "user-1",
        businessName: "Test Lead",
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: "user-2",
        name: "New Owner",
      } as any);

      vi.mocked(prisma.lead.update).mockResolvedValueOnce({
        id: "lead-1",
        ownerId: "user-2",
        businessName: "Test Lead",
      } as any);

      const result = await transferEntity("lead", "lead-1", "user-2");

      expect(result.success).toBe(true);
      expect(prisma.lead.update).toHaveBeenCalledWith({
        where: { id: "lead-1" },
        data: { ownerId: "user-2" },
      });
    });

    it("should successfully transfer a contact", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "admin-1", role: "admin" },
      } as any);

      vi.mocked(prisma.contact.findUnique).mockResolvedValueOnce({
        id: "contact-1",
        ownerId: "user-1",
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: "user-2",
        name: "New Owner",
      } as any);

      vi.mocked(prisma.contact.update).mockResolvedValueOnce({
        id: "contact-1",
        ownerId: "user-2",
      } as any);

      const result = await transferEntity("contact", "contact-1", "user-2");

      expect(result.success).toBe(true);
      expect(prisma.contact.update).toHaveBeenCalledWith({
        where: { id: "contact-1" },
        data: { ownerId: "user-2" },
      });
    });

    it("should successfully transfer an organization", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "admin-1", role: "admin" },
      } as any);

      vi.mocked(prisma.organization.findUnique).mockResolvedValueOnce({
        id: "org-1",
        ownerId: "user-1",
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: "user-2",
      } as any);

      vi.mocked(prisma.organization.update).mockResolvedValueOnce({
        id: "org-1",
        ownerId: "user-2",
      } as any);

      const result = await transferEntity("organization", "org-1", "user-2");

      expect(result.success).toBe(true);
    });

    it("should successfully transfer a partner", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "admin-1", role: "admin" },
      } as any);

      vi.mocked(prisma.partner.findUnique).mockResolvedValueOnce({
        id: "partner-1",
        ownerId: "user-1",
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: "user-2",
      } as any);

      vi.mocked(prisma.partner.update).mockResolvedValueOnce({
        id: "partner-1",
        ownerId: "user-2",
      } as any);

      const result = await transferEntity("partner", "partner-1", "user-2");

      expect(result.success).toBe(true);
    });

    it("should successfully transfer a deal", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "admin-1", role: "admin" },
      } as any);

      vi.mocked(prisma.deal.findUnique).mockResolvedValueOnce({
        id: "deal-1",
        ownerId: "user-1",
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: "user-2",
      } as any);

      vi.mocked(prisma.deal.update).mockResolvedValueOnce({
        id: "deal-1",
        ownerId: "user-2",
      } as any);

      const result = await transferEntity("deal", "deal-1", "user-2");

      expect(result.success).toBe(true);
    });

    it("should remove all shares when transferring", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "admin-1", role: "admin" },
      } as any);

      vi.mocked(prisma.lead.findUnique).mockResolvedValueOnce({
        id: "lead-1",
        ownerId: "user-1",
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: "user-2",
      } as any);

      vi.mocked(prisma.lead.update).mockResolvedValueOnce({
        id: "lead-1",
        ownerId: "user-2",
      } as any);

      vi.mocked(prisma.sharedEntity.deleteMany).mockResolvedValueOnce({
        count: 2,
      });

      await transferEntity("lead", "lead-1", "user-2");

      expect(prisma.sharedEntity.deleteMany).toHaveBeenCalledWith({
        where: {
          entityType: "lead",
          entityId: "lead-1",
        },
      });
    });
  });
});

describe("Entity Management - Sharing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("shareEntity", () => {
    it("should throw error if not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      await expect(
        shareEntity("lead", "lead-1", "user-2")
      ).rejects.toThrow("Não autorizado");
    });

    it("should throw error if user is not admin", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "user-1", role: "closer" },
      } as any);

      await expect(
        shareEntity("lead", "lead-1", "user-2")
      ).rejects.toThrow("Apenas administradores podem compartilhar entidades");
    });

    it("should throw error if entity not found", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "admin-1", role: "admin" },
      } as any);

      vi.mocked(prisma.lead.findUnique).mockResolvedValueOnce(null);

      await expect(
        shareEntity("lead", "lead-1", "user-2")
      ).rejects.toThrow("Entidade não encontrada");
    });

    it("should throw error if target user not found", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "admin-1", role: "admin" },
      } as any);

      vi.mocked(prisma.lead.findUnique).mockResolvedValueOnce({
        id: "lead-1",
        ownerId: "user-1",
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

      await expect(
        shareEntity("lead", "lead-1", "user-2")
      ).rejects.toThrow("Usuário não encontrado");
    });

    it("should throw error if sharing with the owner", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "admin-1", role: "admin" },
      } as any);

      vi.mocked(prisma.lead.findUnique).mockResolvedValueOnce({
        id: "lead-1",
        ownerId: "user-1",
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: "user-1",
      } as any);

      await expect(
        shareEntity("lead", "lead-1", "user-1")
      ).rejects.toThrow("Não é possível compartilhar com o próprio dono");
    });

    it("should throw error if already shared with user", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "admin-1", role: "admin" },
      } as any);

      vi.mocked(prisma.lead.findUnique).mockResolvedValueOnce({
        id: "lead-1",
        ownerId: "user-1",
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: "user-2",
      } as any);

      vi.mocked(prisma.sharedEntity.findFirst).mockResolvedValueOnce({
        id: "share-1",
        entityType: "lead",
        entityId: "lead-1",
        sharedWithUserId: "user-2",
      } as any);

      await expect(
        shareEntity("lead", "lead-1", "user-2")
      ).rejects.toThrow("Entidade já compartilhada com este usuário");
    });

    it("should successfully share a lead", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "admin-1", role: "admin" },
      } as any);

      vi.mocked(prisma.lead.findUnique).mockResolvedValueOnce({
        id: "lead-1",
        ownerId: "user-1",
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: "user-2",
        name: "Shared User",
      } as any);

      vi.mocked(prisma.sharedEntity.findFirst).mockResolvedValueOnce(null);

      vi.mocked(prisma.sharedEntity.create).mockResolvedValueOnce({
        id: "share-1",
        entityType: "lead",
        entityId: "lead-1",
        sharedWithUserId: "user-2",
        sharedByUserId: "admin-1",
        createdAt: new Date(),
      } as any);

      const result = await shareEntity("lead", "lead-1", "user-2");

      expect(result.success).toBe(true);
      expect(prisma.sharedEntity.create).toHaveBeenCalledWith({
        data: {
          entityType: "lead",
          entityId: "lead-1",
          sharedWithUserId: "user-2",
          sharedByUserId: "admin-1",
        },
      });
    });

    it("should successfully share a deal", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "admin-1", role: "admin" },
      } as any);

      vi.mocked(prisma.deal.findUnique).mockResolvedValueOnce({
        id: "deal-1",
        ownerId: "user-1",
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: "user-2",
      } as any);

      vi.mocked(prisma.sharedEntity.findFirst).mockResolvedValueOnce(null);

      vi.mocked(prisma.sharedEntity.create).mockResolvedValueOnce({
        id: "share-1",
        entityType: "deal",
        entityId: "deal-1",
        sharedWithUserId: "user-2",
        sharedByUserId: "admin-1",
        createdAt: new Date(),
      } as any);

      const result = await shareEntity("deal", "deal-1", "user-2");

      expect(result.success).toBe(true);
    });
  });

  describe("unshareEntity", () => {
    it("should throw error if not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      await expect(
        unshareEntity("lead", "lead-1", "user-2")
      ).rejects.toThrow("Não autorizado");
    });

    it("should throw error if user is not admin", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "user-1", role: "sdr" },
      } as any);

      await expect(
        unshareEntity("lead", "lead-1", "user-2")
      ).rejects.toThrow("Apenas administradores podem remover compartilhamentos");
    });

    it("should throw error if share not found", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "admin-1", role: "admin" },
      } as any);

      vi.mocked(prisma.sharedEntity.findFirst).mockResolvedValueOnce(null);

      await expect(
        unshareEntity("lead", "lead-1", "user-2")
      ).rejects.toThrow("Compartilhamento não encontrado");
    });

    it("should successfully remove a share", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "admin-1", role: "admin" },
      } as any);

      vi.mocked(prisma.sharedEntity.findFirst).mockResolvedValueOnce({
        id: "share-1",
        entityType: "lead",
        entityId: "lead-1",
        sharedWithUserId: "user-2",
      } as any);

      vi.mocked(prisma.sharedEntity.delete).mockResolvedValueOnce({
        id: "share-1",
      } as any);

      const result = await unshareEntity("lead", "lead-1", "user-2");

      expect(result.success).toBe(true);
      expect(prisma.sharedEntity.delete).toHaveBeenCalledWith({
        where: { id: "share-1" },
      });
    });
  });

  describe("getSharedUsers", () => {
    it("should return list of users with whom entity is shared", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "admin-1", role: "admin" },
      } as any);

      vi.mocked(prisma.sharedEntity.findMany).mockResolvedValueOnce([
        {
          id: "share-1",
          entityType: "lead",
          entityId: "lead-1",
          sharedWithUserId: "user-2",
          sharedWithUser: { id: "user-2", name: "User 2", email: "user2@test.com" },
          sharedByUser: { id: "admin-1", name: "Admin" },
          createdAt: new Date(),
        },
        {
          id: "share-2",
          entityType: "lead",
          entityId: "lead-1",
          sharedWithUserId: "user-3",
          sharedWithUser: { id: "user-3", name: "User 3", email: "user3@test.com" },
          sharedByUser: { id: "admin-1", name: "Admin" },
          createdAt: new Date(),
        },
      ] as any);

      const result = await getSharedUsers("lead", "lead-1");

      expect(result).toHaveLength(2);
      expect(result[0].sharedWithUser.name).toBe("User 2");
      expect(result[1].sharedWithUser.name).toBe("User 3");
    });
  });

  describe("getAvailableUsersForSharing", () => {
    it("should return users excluding owner and already shared", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "admin-1", role: "admin" },
      } as any);

      vi.mocked(prisma.lead.findUnique).mockResolvedValueOnce({
        id: "lead-1",
        ownerId: "user-1",
      } as any);

      vi.mocked(prisma.sharedEntity.findMany).mockResolvedValueOnce([
        { sharedWithUserId: "user-2" },
      ] as any);

      vi.mocked(prisma.user.findMany).mockResolvedValueOnce([
        { id: "user-3", name: "User 3", email: "user3@test.com" },
        { id: "user-4", name: "User 4", email: "user4@test.com" },
      ] as any);

      const result = await getAvailableUsersForSharing("lead", "lead-1");

      expect(result).toHaveLength(2);
      // Should not include user-1 (owner) or user-2 (already shared)
    });
  });
});

// ============================================================
// SHARED ENTITY VISIBILITY TESTS
// These tests verify that shared entities are visible to users
// ============================================================

import {
  getOwnerOrSharedFilter,
  getSharedEntityIds,
  canAccessEntity,
} from "@/lib/permissions";

describe("Shared Entity Visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getSharedEntityIds", () => {
    it("should return IDs of entities shared with the user", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "user-fabiola", role: "sdr" },
      } as any);

      vi.mocked(prisma.sharedEntity.findMany).mockResolvedValueOnce([
        { entityId: "lead-1" },
        { entityId: "lead-3" },
      ] as any);

      const result = await getSharedEntityIds("lead");

      expect(result).toEqual(["lead-1", "lead-3"]);
      expect(prisma.sharedEntity.findMany).toHaveBeenCalledWith({
        where: {
          entityType: "lead",
          sharedWithUserId: "user-fabiola",
        },
        select: {
          entityId: true,
        },
      });
    });

    it("should return empty array if no entities shared", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "user-fabiola", role: "sdr" },
      } as any);

      vi.mocked(prisma.sharedEntity.findMany).mockResolvedValueOnce([]);

      const result = await getSharedEntityIds("lead");

      expect(result).toEqual([]);
    });
  });

  describe("getOwnerOrSharedFilter", () => {
    it("should return filter including owned AND shared entities for non-admin", async () => {
      // Mock twice: once for getOwnerOrSharedFilter, once for getSharedEntityIds
      vi.mocked(getServerSession)
        .mockResolvedValueOnce({ user: { id: "user-fabiola", role: "sdr" } } as any)
        .mockResolvedValueOnce({ user: { id: "user-fabiola", role: "sdr" } } as any);

      // Fabiola has lead-1 and lead-3 shared with her
      vi.mocked(prisma.sharedEntity.findMany).mockResolvedValueOnce([
        { entityId: "lead-1" },
        { entityId: "lead-3" },
      ] as any);

      const filter = await getOwnerOrSharedFilter("lead");

      // Should return OR filter for owned entities AND shared entities
      expect(filter).toEqual({
        OR: [
          { ownerId: "user-fabiola" },
          { id: { in: ["lead-1", "lead-3"] } },
        ],
      });
    });

    it("should return only owner filter if no shared entities", async () => {
      // Mock twice: once for getOwnerOrSharedFilter, once for getSharedEntityIds
      vi.mocked(getServerSession)
        .mockResolvedValueOnce({ user: { id: "user-fabiola", role: "sdr" } } as any)
        .mockResolvedValueOnce({ user: { id: "user-fabiola", role: "sdr" } } as any);

      vi.mocked(prisma.sharedEntity.findMany).mockResolvedValueOnce([]);

      const filter = await getOwnerOrSharedFilter("lead");

      // Should return simple owner filter
      expect(filter).toEqual({ ownerId: "user-fabiola" });
    });

    it("should return empty filter for admin with no filter", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "admin-1", role: "admin" },
      } as any);

      const filter = await getOwnerOrSharedFilter("lead");

      expect(filter).toEqual({});
    });

    it("should return owner filter for admin with 'mine' filter", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "admin-1", role: "admin" },
      } as any);

      const filter = await getOwnerOrSharedFilter("lead", "mine");

      expect(filter).toEqual({ ownerId: "admin-1" });
    });
  });

  describe("canAccessEntity", () => {
    it("should return true for entity owner", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "user-bruno", role: "sdr" },
      } as any);

      const result = await canAccessEntity("lead", "lead-1", "user-bruno");

      expect(result).toBe(true);
      // Should not even check sharedEntity since user is owner
    });

    it("should return true for admin regardless of ownership", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "admin-1", role: "admin" },
      } as any);

      const result = await canAccessEntity("lead", "lead-1", "user-bruno");

      expect(result).toBe(true);
    });

    it("should return true if entity is shared with user", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "user-fabiola", role: "sdr" },
      } as any);

      // Entity is owned by bruno but shared with fabiola
      vi.mocked(prisma.sharedEntity.findFirst).mockResolvedValueOnce({
        id: "share-1",
        entityType: "lead",
        entityId: "lead-1",
        sharedWithUserId: "user-fabiola",
      } as any);

      const result = await canAccessEntity("lead", "lead-1", "user-bruno");

      expect(result).toBe(true);
      expect(prisma.sharedEntity.findFirst).toHaveBeenCalledWith({
        where: {
          entityType: "lead",
          entityId: "lead-1",
          sharedWithUserId: "user-fabiola",
        },
      });
    });

    it("should return false if entity is NOT shared with user", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { id: "user-fabiola", role: "sdr" },
      } as any);

      // Entity is owned by bruno and NOT shared with fabiola
      vi.mocked(prisma.sharedEntity.findFirst).mockResolvedValueOnce(null);

      const result = await canAccessEntity("lead", "lead-1", "user-bruno");

      expect(result).toBe(false);
    });
  });
});

// ============================================================
// INTEGRATION: Shared entities should appear in list queries
// These tests verify the complete flow
// ============================================================

describe("Shared Entity Integration - List Queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("user should see shared leads in getLeads query", async () => {
    // This test verifies the expected behavior:
    // 1. Bruno creates a lead
    // 2. Admin shares the lead with Fabiola
    // 3. Fabiola should see the lead in her leads list

    // Setup: Fabiola is logged in as SDR
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-fabiola", role: "sdr" },
    } as any);

    // Fabiola has lead-bruno shared with her
    vi.mocked(prisma.sharedEntity.findMany).mockResolvedValue([
      { entityId: "lead-bruno" },
    ] as any);

    // When getOwnerOrSharedFilter is called, it should return a filter
    // that includes both owned leads AND shared leads
    const filter = await getOwnerOrSharedFilter("lead");

    // Verify the filter includes shared entities
    expect(filter).toHaveProperty("OR");
    const orFilter = filter as { OR: Array<{ ownerId?: string; id?: { in: string[] } }> };
    expect(orFilter.OR).toContainEqual({ ownerId: "user-fabiola" });
    expect(orFilter.OR).toContainEqual({ id: { in: ["lead-bruno"] } });
  });

  it("user should be able to access shared lead by ID", async () => {
    // Setup: Fabiola is logged in as SDR
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-fabiola", role: "sdr" },
    } as any);

    // The lead is owned by Bruno
    // Check if Fabiola can access it
    vi.mocked(prisma.sharedEntity.findFirst).mockResolvedValue({
      id: "share-1",
      entityType: "lead",
      entityId: "lead-bruno",
      sharedWithUserId: "user-fabiola",
    } as any);

    const canAccess = await canAccessEntity("lead", "lead-bruno", "user-bruno");

    expect(canAccess).toBe(true);
  });

  it("user should NOT see leads that are not shared with them", async () => {
    // Setup: Fabiola is logged in as SDR
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-fabiola", role: "sdr" },
    } as any);

    // No leads shared with Fabiola
    vi.mocked(prisma.sharedEntity.findMany).mockResolvedValue([]);

    const filter = await getOwnerOrSharedFilter("lead");

    // Should only filter by owner, no shared entities
    expect(filter).toEqual({ ownerId: "user-fabiola" });
  });
});
