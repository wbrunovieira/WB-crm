/**
 * Tests for CNAEs Actions
 * Phase 7: Auxiliary Actions - CNAEs
 *
 * Actions tested:
 * - searchCNAEs
 * - getCNAEById
 * - getCNAEByCode
 * - addSecondaryCNAEToLead / removeSecondaryCNAEFromLead
 * - getLeadSecondaryCNAEs
 * - addSecondaryCNAEToOrganization / removeSecondaryCNAEFromOrganization
 * - getOrganizationSecondaryCNAEs
 *
 * Note: CNAE search functions don't require authentication.
 * Link functions work at database level without direct auth (relies on caller)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Valid CUID format for testing
const LEAD_ID = "clxxxxxxxxxxxxxxxxxxxxxxxxxle1";
const ORG_ID = "clxxxxxxxxxxxxxxxxxxxxxxxxxor1";
const CNAE_ID_1 = "clxxxxxxxxxxxxxxxxxxxxxxxxxcn1";
const CNAE_ID_2 = "clxxxxxxxxxxxxxxxxxxxxxxxxxcn2";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    cNAE: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    leadSecondaryCNAE: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    organizationSecondaryCNAE: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  searchCNAEs,
  getCNAEById,
  getCNAEByCode,
  addSecondaryCNAEToLead,
  removeSecondaryCNAEFromLead,
  getLeadSecondaryCNAEs,
  addSecondaryCNAEToOrganization,
  removeSecondaryCNAEFromOrganization,
  getOrganizationSecondaryCNAEs,
} from "@/actions/cnaes";

describe("CNAEs Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== SEARCH CNAEs ====================
  describe("searchCNAEs", () => {
    it("should return empty array for empty query", async () => {
      const result = await searchCNAEs("");

      expect(result).toEqual([]);
      expect(prisma.cNAE.findMany).not.toHaveBeenCalled();
    });

    it("should return empty array for query with less than 2 characters", async () => {
      const result = await searchCNAEs("a");

      expect(result).toEqual([]);
      expect(prisma.cNAE.findMany).not.toHaveBeenCalled();
    });

    it("should search CNAEs by code or description", async () => {
      const mockCNAEs = [
        { id: CNAE_ID_1, code: "6201-5/00", description: "Desenvolvimento de programas de computador sob encomenda" },
        { id: CNAE_ID_2, code: "6202-3/00", description: "Desenvolvimento e licenciamento de programas de computador customizáveis" },
      ];

      vi.mocked(prisma.cNAE.findMany).mockResolvedValue(mockCNAEs as any);

      const result = await searchCNAEs("desenvolvimento");

      expect(prisma.cNAE.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { code: { contains: "desenvolvimento" } },
            { description: { contains: "desenvolvimento" } },
          ],
        },
        orderBy: [{ code: "asc" }],
        take: 20,
      });
      expect(result).toEqual(mockCNAEs);
    });

    it("should search by CNAE code", async () => {
      const mockCNAE = [
        { id: CNAE_ID_1, code: "6201-5/00", description: "Desenvolvimento de programas de computador sob encomenda" },
      ];

      vi.mocked(prisma.cNAE.findMany).mockResolvedValue(mockCNAE as any);

      const result = await searchCNAEs("6201");

      expect(prisma.cNAE.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { code: { contains: "6201" } },
              { description: { contains: "6201" } },
            ],
          },
        })
      );
      expect(result).toHaveLength(1);
    });

    it("should respect custom limit", async () => {
      vi.mocked(prisma.cNAE.findMany).mockResolvedValue([]);

      await searchCNAEs("teste", 10);

      expect(prisma.cNAE.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        })
      );
    });

    it("should use default limit of 20", async () => {
      vi.mocked(prisma.cNAE.findMany).mockResolvedValue([]);

      await searchCNAEs("teste");

      expect(prisma.cNAE.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
        })
      );
    });
  });

  // ==================== GET CNAE BY ID ====================
  describe("getCNAEById", () => {
    it("should return CNAE by ID", async () => {
      const mockCNAE = {
        id: CNAE_ID_1,
        code: "6201-5/00",
        description: "Desenvolvimento de programas de computador sob encomenda",
      };

      vi.mocked(prisma.cNAE.findUnique).mockResolvedValue(mockCNAE as any);

      const result = await getCNAEById(CNAE_ID_1);

      expect(prisma.cNAE.findUnique).toHaveBeenCalledWith({
        where: { id: CNAE_ID_1 },
      });
      expect(result).toEqual(mockCNAE);
    });

    it("should return null for non-existent ID", async () => {
      vi.mocked(prisma.cNAE.findUnique).mockResolvedValue(null);

      const result = await getCNAEById("non-existent-id");

      expect(result).toBeNull();
    });
  });

  // ==================== GET CNAE BY CODE ====================
  describe("getCNAEByCode", () => {
    it("should return CNAE by code", async () => {
      const mockCNAE = {
        id: CNAE_ID_1,
        code: "6201-5/00",
        description: "Desenvolvimento de programas de computador sob encomenda",
      };

      vi.mocked(prisma.cNAE.findUnique).mockResolvedValue(mockCNAE as any);

      const result = await getCNAEByCode("6201-5/00");

      expect(prisma.cNAE.findUnique).toHaveBeenCalledWith({
        where: { code: "6201-5/00" },
      });
      expect(result).toEqual(mockCNAE);
    });

    it("should return null for non-existent code", async () => {
      vi.mocked(prisma.cNAE.findUnique).mockResolvedValue(null);

      const result = await getCNAEByCode("0000-0/00");

      expect(result).toBeNull();
    });
  });

  // ==================== ADD SECONDARY CNAE TO LEAD ====================
  describe("addSecondaryCNAEToLead", () => {
    it("should add secondary CNAE to lead", async () => {
      vi.mocked(prisma.leadSecondaryCNAE.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.leadSecondaryCNAE.create).mockResolvedValue({
        id: "link-1",
        leadId: LEAD_ID,
        cnaeId: CNAE_ID_1,
        cnae: { id: CNAE_ID_1, code: "6201-5/00", description: "Dev software" },
      } as any);

      const result = await addSecondaryCNAEToLead(LEAD_ID, CNAE_ID_1);

      expect(prisma.leadSecondaryCNAE.findUnique).toHaveBeenCalledWith({
        where: {
          leadId_cnaeId: { leadId: LEAD_ID, cnaeId: CNAE_ID_1 },
        },
      });
      expect(prisma.leadSecondaryCNAE.create).toHaveBeenCalledWith({
        data: { leadId: LEAD_ID, cnaeId: CNAE_ID_1 },
        include: { cnae: true },
      });
      expect(result.cnae.code).toBe("6201-5/00");
    });

    it("should throw error when CNAE already linked to lead", async () => {
      vi.mocked(prisma.leadSecondaryCNAE.findUnique).mockResolvedValue({
        id: "existing",
        leadId: LEAD_ID,
        cnaeId: CNAE_ID_1,
      } as any);

      await expect(addSecondaryCNAEToLead(LEAD_ID, CNAE_ID_1)).rejects.toThrow(
        "Este CNAE já está vinculado ao lead"
      );
      expect(prisma.leadSecondaryCNAE.create).not.toHaveBeenCalled();
    });
  });

  // ==================== REMOVE SECONDARY CNAE FROM LEAD ====================
  describe("removeSecondaryCNAEFromLead", () => {
    it("should remove secondary CNAE from lead", async () => {
      vi.mocked(prisma.leadSecondaryCNAE.delete).mockResolvedValue({} as any);

      await removeSecondaryCNAEFromLead(LEAD_ID, CNAE_ID_1);

      expect(prisma.leadSecondaryCNAE.delete).toHaveBeenCalledWith({
        where: {
          leadId_cnaeId: { leadId: LEAD_ID, cnaeId: CNAE_ID_1 },
        },
      });
    });
  });

  // ==================== GET LEAD SECONDARY CNAEs ====================
  describe("getLeadSecondaryCNAEs", () => {
    it("should return secondary CNAEs for a lead", async () => {
      const mockLinks = [
        { id: "l1", leadId: LEAD_ID, cnaeId: CNAE_ID_1, cnae: { id: CNAE_ID_1, code: "6201-5/00", description: "Dev" } },
        { id: "l2", leadId: LEAD_ID, cnaeId: CNAE_ID_2, cnae: { id: CNAE_ID_2, code: "6202-3/00", description: "License" } },
      ];

      vi.mocked(prisma.leadSecondaryCNAE.findMany).mockResolvedValue(mockLinks as any);

      const result = await getLeadSecondaryCNAEs(LEAD_ID);

      expect(prisma.leadSecondaryCNAE.findMany).toHaveBeenCalledWith({
        where: { leadId: LEAD_ID },
        include: { cnae: true },
        orderBy: { cnae: { code: "asc" } },
      });
      expect(result).toHaveLength(2);
      expect(result[0].code).toBe("6201-5/00");
    });

    it("should return empty array when lead has no secondary CNAEs", async () => {
      vi.mocked(prisma.leadSecondaryCNAE.findMany).mockResolvedValue([]);

      const result = await getLeadSecondaryCNAEs(LEAD_ID);

      expect(result).toEqual([]);
    });
  });

  // ==================== ADD SECONDARY CNAE TO ORGANIZATION ====================
  describe("addSecondaryCNAEToOrganization", () => {
    it("should add secondary CNAE to organization", async () => {
      vi.mocked(prisma.organizationSecondaryCNAE.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.organizationSecondaryCNAE.create).mockResolvedValue({
        id: "link-1",
        organizationId: ORG_ID,
        cnaeId: CNAE_ID_1,
        cnae: { id: CNAE_ID_1, code: "6201-5/00", description: "Dev software" },
      } as any);

      const result = await addSecondaryCNAEToOrganization(ORG_ID, CNAE_ID_1);

      expect(prisma.organizationSecondaryCNAE.findUnique).toHaveBeenCalledWith({
        where: {
          organizationId_cnaeId: { organizationId: ORG_ID, cnaeId: CNAE_ID_1 },
        },
      });
      expect(prisma.organizationSecondaryCNAE.create).toHaveBeenCalledWith({
        data: { organizationId: ORG_ID, cnaeId: CNAE_ID_1 },
        include: { cnae: true },
      });
      expect(result.cnae.code).toBe("6201-5/00");
    });

    it("should throw error when CNAE already linked to organization", async () => {
      vi.mocked(prisma.organizationSecondaryCNAE.findUnique).mockResolvedValue({
        id: "existing",
        organizationId: ORG_ID,
        cnaeId: CNAE_ID_1,
      } as any);

      await expect(addSecondaryCNAEToOrganization(ORG_ID, CNAE_ID_1)).rejects.toThrow(
        "Este CNAE já está vinculado à organização"
      );
      expect(prisma.organizationSecondaryCNAE.create).not.toHaveBeenCalled();
    });
  });

  // ==================== REMOVE SECONDARY CNAE FROM ORGANIZATION ====================
  describe("removeSecondaryCNAEFromOrganization", () => {
    it("should remove secondary CNAE from organization", async () => {
      vi.mocked(prisma.organizationSecondaryCNAE.delete).mockResolvedValue({} as any);

      await removeSecondaryCNAEFromOrganization(ORG_ID, CNAE_ID_1);

      expect(prisma.organizationSecondaryCNAE.delete).toHaveBeenCalledWith({
        where: {
          organizationId_cnaeId: { organizationId: ORG_ID, cnaeId: CNAE_ID_1 },
        },
      });
    });
  });

  // ==================== GET ORGANIZATION SECONDARY CNAEs ====================
  describe("getOrganizationSecondaryCNAEs", () => {
    it("should return secondary CNAEs for an organization", async () => {
      const mockLinks = [
        { id: "l1", organizationId: ORG_ID, cnaeId: CNAE_ID_1, cnae: { id: CNAE_ID_1, code: "6201-5/00", description: "Dev" } },
        { id: "l2", organizationId: ORG_ID, cnaeId: CNAE_ID_2, cnae: { id: CNAE_ID_2, code: "6202-3/00", description: "License" } },
      ];

      vi.mocked(prisma.organizationSecondaryCNAE.findMany).mockResolvedValue(mockLinks as any);

      const result = await getOrganizationSecondaryCNAEs(ORG_ID);

      expect(prisma.organizationSecondaryCNAE.findMany).toHaveBeenCalledWith({
        where: { organizationId: ORG_ID },
        include: { cnae: true },
        orderBy: { cnae: { code: "asc" } },
      });
      expect(result).toHaveLength(2);
      expect(result[0].code).toBe("6201-5/00");
    });

    it("should return empty array when organization has no secondary CNAEs", async () => {
      vi.mocked(prisma.organizationSecondaryCNAE.findMany).mockResolvedValue([]);

      const result = await getOrganizationSecondaryCNAEs(ORG_ID);

      expect(result).toEqual([]);
    });
  });

  // ==================== MULTIPLE CNAEs ====================
  describe("Multiple CNAEs", () => {
    it("should allow adding multiple CNAEs to a lead", async () => {
      vi.mocked(prisma.leadSecondaryCNAE.findUnique).mockResolvedValue(null);

      vi.mocked(prisma.leadSecondaryCNAE.create)
        .mockResolvedValueOnce({
          id: "l1",
          leadId: LEAD_ID,
          cnaeId: CNAE_ID_1,
          cnae: { id: CNAE_ID_1, code: "6201-5/00", description: "Dev" },
        } as any)
        .mockResolvedValueOnce({
          id: "l2",
          leadId: LEAD_ID,
          cnaeId: CNAE_ID_2,
          cnae: { id: CNAE_ID_2, code: "6202-3/00", description: "License" },
        } as any);

      const result1 = await addSecondaryCNAEToLead(LEAD_ID, CNAE_ID_1);
      const result2 = await addSecondaryCNAEToLead(LEAD_ID, CNAE_ID_2);

      expect(result1.cnae.code).toBe("6201-5/00");
      expect(result2.cnae.code).toBe("6202-3/00");
    });

    it("should allow adding multiple CNAEs to an organization", async () => {
      vi.mocked(prisma.organizationSecondaryCNAE.findUnique).mockResolvedValue(null);

      vi.mocked(prisma.organizationSecondaryCNAE.create)
        .mockResolvedValueOnce({
          id: "l1",
          organizationId: ORG_ID,
          cnaeId: CNAE_ID_1,
          cnae: { id: CNAE_ID_1, code: "6201-5/00", description: "Dev" },
        } as any)
        .mockResolvedValueOnce({
          id: "l2",
          organizationId: ORG_ID,
          cnaeId: CNAE_ID_2,
          cnae: { id: CNAE_ID_2, code: "6202-3/00", description: "License" },
        } as any);

      const result1 = await addSecondaryCNAEToOrganization(ORG_ID, CNAE_ID_1);
      const result2 = await addSecondaryCNAEToOrganization(ORG_ID, CNAE_ID_2);

      expect(result1.cnae.code).toBe("6201-5/00");
      expect(result2.cnae.code).toBe("6202-3/00");
    });
  });
});
