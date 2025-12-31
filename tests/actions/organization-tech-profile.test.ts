/**
 * Tests for Organization Tech Profile Actions
 * Phase 6: Tech Profile & Tech Stack - Organization linking functionality
 *
 * Actions tested:
 * - getOrganizationTechProfile
 * - addLanguageToOrganization / removeLanguageFromOrganization
 * - addFrameworkToOrganization / removeFrameworkFromOrganization
 * - addHostingToOrganization / removeHostingFromOrganization
 * - addDatabaseToOrganization / removeDatabaseFromOrganization
 * - addERPToOrganization / removeERPFromOrganization
 * - addCRMToOrganization / removeCRMFromOrganization
 * - addEcommerceToOrganization / removeEcommerceFromOrganization
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Valid CUID format for testing
const ORG_ID = "clxxxxxxxxxxxxxxxxxxxxxxxxxo1";
const LANGUAGE_ID = "clxxxxxxxxxxxxxxxxxxxxxxxxxln1";
const FRAMEWORK_ID = "clxxxxxxxxxxxxxxxxxxxxxxxxxfr1";
const HOSTING_ID = "clxxxxxxxxxxxxxxxxxxxxxxxxxho1";
const DATABASE_ID = "clxxxxxxxxxxxxxxxxxxxxxxxxxdb1";
const ERP_ID = "clxxxxxxxxxxxxxxxxxxxxxxxxxer1";
const CRM_ID = "clxxxxxxxxxxxxxxxxxxxxxxxxxcr1";
const ECOMMERCE_ID = "clxxxxxxxxxxxxxxxxxxxxxxxxxec1";

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
    organizationLanguage: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    organizationFramework: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    organizationHosting: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    organizationDatabase: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    organizationERP: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    organizationCRM: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    organizationEcommerce: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import {
  getOrganizationTechProfile,
  addLanguageToOrganization,
  removeLanguageFromOrganization,
  addFrameworkToOrganization,
  removeFrameworkFromOrganization,
  addHostingToOrganization,
  removeHostingFromOrganization,
  addDatabaseToOrganization,
  removeDatabaseFromOrganization,
  addERPToOrganization,
  removeERPFromOrganization,
  addCRMToOrganization,
  removeCRMFromOrganization,
  addEcommerceToOrganization,
  removeEcommerceFromOrganization,
} from "@/actions/organization-tech-profile";

describe("Organization Tech Profile Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== GET ORGANIZATION TECH PROFILE ====================
  describe("getOrganizationTechProfile", () => {
    it("should throw error when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      await expect(getOrganizationTechProfile(ORG_ID)).rejects.toThrow("Não autorizado");
    });

    it("should return all tech profile types for an organization", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      const mockLanguages = [{ id: "1", organizationId: ORG_ID, languageId: LANGUAGE_ID, language: { id: LANGUAGE_ID, name: "Java" } }];
      const mockFrameworks = [{ id: "2", organizationId: ORG_ID, frameworkId: FRAMEWORK_ID, framework: { id: FRAMEWORK_ID, name: "Spring" } }];
      const mockHosting = [{ id: "3", organizationId: ORG_ID, hostingId: HOSTING_ID, hosting: { id: HOSTING_ID, name: "Azure" } }];
      const mockDatabases = [{ id: "4", organizationId: ORG_ID, databaseId: DATABASE_ID, database: { id: DATABASE_ID, name: "MySQL" } }];
      const mockERPs = [{ id: "5", organizationId: ORG_ID, erpId: ERP_ID, erp: { id: ERP_ID, name: "Oracle ERP" } }];
      const mockCRMs = [{ id: "6", organizationId: ORG_ID, crmId: CRM_ID, crm: { id: CRM_ID, name: "HubSpot" } }];
      const mockEcommerces = [{ id: "7", organizationId: ORG_ID, ecommerceId: ECOMMERCE_ID, ecommerce: { id: ECOMMERCE_ID, name: "Magento" } }];

      vi.mocked(prisma.organizationLanguage.findMany).mockResolvedValue(mockLanguages as any);
      vi.mocked(prisma.organizationFramework.findMany).mockResolvedValue(mockFrameworks as any);
      vi.mocked(prisma.organizationHosting.findMany).mockResolvedValue(mockHosting as any);
      vi.mocked(prisma.organizationDatabase.findMany).mockResolvedValue(mockDatabases as any);
      vi.mocked(prisma.organizationERP.findMany).mockResolvedValue(mockERPs as any);
      vi.mocked(prisma.organizationCRM.findMany).mockResolvedValue(mockCRMs as any);
      vi.mocked(prisma.organizationEcommerce.findMany).mockResolvedValue(mockEcommerces as any);

      const result = await getOrganizationTechProfile(ORG_ID);

      expect(result.languages).toEqual(mockLanguages);
      expect(result.frameworks).toEqual(mockFrameworks);
      expect(result.hosting).toEqual(mockHosting);
      expect(result.databases).toEqual(mockDatabases);
      expect(result.erps).toEqual(mockERPs);
      expect(result.crms).toEqual(mockCRMs);
      expect(result.ecommerces).toEqual(mockEcommerces);
    });

    it("should return empty arrays when organization has no tech profile", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.organizationLanguage.findMany).mockResolvedValue([]);
      vi.mocked(prisma.organizationFramework.findMany).mockResolvedValue([]);
      vi.mocked(prisma.organizationHosting.findMany).mockResolvedValue([]);
      vi.mocked(prisma.organizationDatabase.findMany).mockResolvedValue([]);
      vi.mocked(prisma.organizationERP.findMany).mockResolvedValue([]);
      vi.mocked(prisma.organizationCRM.findMany).mockResolvedValue([]);
      vi.mocked(prisma.organizationEcommerce.findMany).mockResolvedValue([]);

      const result = await getOrganizationTechProfile(ORG_ID);

      expect(result.languages).toEqual([]);
      expect(result.frameworks).toEqual([]);
      expect(result.hosting).toEqual([]);
      expect(result.databases).toEqual([]);
      expect(result.erps).toEqual([]);
      expect(result.crms).toEqual([]);
      expect(result.ecommerces).toEqual([]);
    });
  });

  // ==================== LANGUAGES ====================
  describe("addLanguageToOrganization", () => {
    it("should throw error when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      await expect(addLanguageToOrganization(ORG_ID, LANGUAGE_ID)).rejects.toThrow("Não autorizado");
    });

    it("should add a language to an organization", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.organizationLanguage.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.organizationLanguage.create).mockResolvedValue({
        id: "link-1",
        organizationId: ORG_ID,
        languageId: LANGUAGE_ID,
        language: { id: LANGUAGE_ID, name: "Java" },
      } as any);

      const result = await addLanguageToOrganization(ORG_ID, LANGUAGE_ID);

      expect(prisma.organizationLanguage.findUnique).toHaveBeenCalledWith({
        where: { organizationId_languageId: { organizationId: ORG_ID, languageId: LANGUAGE_ID } },
      });
      expect(prisma.organizationLanguage.create).toHaveBeenCalledWith({
        data: { organizationId: ORG_ID, languageId: LANGUAGE_ID },
        include: { language: true },
      });
      expect(result.language.name).toBe("Java");
    });

    it("should throw error when language already linked", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.organizationLanguage.findUnique).mockResolvedValue({ id: "existing" } as any);

      await expect(addLanguageToOrganization(ORG_ID, LANGUAGE_ID)).rejects.toThrow(
        "Esta linguagem já está vinculada ao organization"
      );
    });
  });

  describe("removeLanguageFromOrganization", () => {
    it("should throw error when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      await expect(removeLanguageFromOrganization(ORG_ID, LANGUAGE_ID)).rejects.toThrow("Não autorizado");
    });

    it("should remove a language from an organization", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.organizationLanguage.delete).mockResolvedValue({} as any);

      await removeLanguageFromOrganization(ORG_ID, LANGUAGE_ID);

      expect(prisma.organizationLanguage.delete).toHaveBeenCalledWith({
        where: { organizationId_languageId: { organizationId: ORG_ID, languageId: LANGUAGE_ID } },
      });
    });
  });

  // ==================== FRAMEWORKS ====================
  describe("addFrameworkToOrganization", () => {
    it("should throw error when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      await expect(addFrameworkToOrganization(ORG_ID, FRAMEWORK_ID)).rejects.toThrow("Não autorizado");
    });

    it("should add a framework to an organization", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.organizationFramework.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.organizationFramework.create).mockResolvedValue({
        id: "link-1",
        organizationId: ORG_ID,
        frameworkId: FRAMEWORK_ID,
        framework: { id: FRAMEWORK_ID, name: "Spring" },
      } as any);

      const result = await addFrameworkToOrganization(ORG_ID, FRAMEWORK_ID);

      expect(prisma.organizationFramework.findUnique).toHaveBeenCalledWith({
        where: { organizationId_frameworkId: { organizationId: ORG_ID, frameworkId: FRAMEWORK_ID } },
      });
      expect(result.framework.name).toBe("Spring");
    });

    it("should throw error when framework already linked", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.organizationFramework.findUnique).mockResolvedValue({ id: "existing" } as any);

      await expect(addFrameworkToOrganization(ORG_ID, FRAMEWORK_ID)).rejects.toThrow(
        "Este framework já está vinculado ao organization"
      );
    });
  });

  describe("removeFrameworkFromOrganization", () => {
    it("should throw error when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      await expect(removeFrameworkFromOrganization(ORG_ID, FRAMEWORK_ID)).rejects.toThrow("Não autorizado");
    });

    it("should remove a framework from an organization", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.organizationFramework.delete).mockResolvedValue({} as any);

      await removeFrameworkFromOrganization(ORG_ID, FRAMEWORK_ID);

      expect(prisma.organizationFramework.delete).toHaveBeenCalledWith({
        where: { organizationId_frameworkId: { organizationId: ORG_ID, frameworkId: FRAMEWORK_ID } },
      });
    });
  });

  // ==================== HOSTING ====================
  describe("addHostingToOrganization", () => {
    it("should throw error when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      await expect(addHostingToOrganization(ORG_ID, HOSTING_ID)).rejects.toThrow("Não autorizado");
    });

    it("should add a hosting service to an organization", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.organizationHosting.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.organizationHosting.create).mockResolvedValue({
        id: "link-1",
        organizationId: ORG_ID,
        hostingId: HOSTING_ID,
        hosting: { id: HOSTING_ID, name: "Azure" },
      } as any);

      const result = await addHostingToOrganization(ORG_ID, HOSTING_ID);

      expect(prisma.organizationHosting.findUnique).toHaveBeenCalledWith({
        where: { organizationId_hostingId: { organizationId: ORG_ID, hostingId: HOSTING_ID } },
      });
      expect(result.hosting.name).toBe("Azure");
    });

    it("should throw error when hosting already linked", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.organizationHosting.findUnique).mockResolvedValue({ id: "existing" } as any);

      await expect(addHostingToOrganization(ORG_ID, HOSTING_ID)).rejects.toThrow(
        "Este serviço de hospedagem já está vinculado ao organization"
      );
    });
  });

  describe("removeHostingFromOrganization", () => {
    it("should throw error when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      await expect(removeHostingFromOrganization(ORG_ID, HOSTING_ID)).rejects.toThrow("Não autorizado");
    });

    it("should remove a hosting service from an organization", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.organizationHosting.delete).mockResolvedValue({} as any);

      await removeHostingFromOrganization(ORG_ID, HOSTING_ID);

      expect(prisma.organizationHosting.delete).toHaveBeenCalledWith({
        where: { organizationId_hostingId: { organizationId: ORG_ID, hostingId: HOSTING_ID } },
      });
    });
  });

  // ==================== DATABASES ====================
  describe("addDatabaseToOrganization", () => {
    it("should throw error when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      await expect(addDatabaseToOrganization(ORG_ID, DATABASE_ID)).rejects.toThrow("Não autorizado");
    });

    it("should add a database to an organization", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.organizationDatabase.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.organizationDatabase.create).mockResolvedValue({
        id: "link-1",
        organizationId: ORG_ID,
        databaseId: DATABASE_ID,
        database: { id: DATABASE_ID, name: "MySQL" },
      } as any);

      const result = await addDatabaseToOrganization(ORG_ID, DATABASE_ID);

      expect(prisma.organizationDatabase.findUnique).toHaveBeenCalledWith({
        where: { organizationId_databaseId: { organizationId: ORG_ID, databaseId: DATABASE_ID } },
      });
      expect(result.database.name).toBe("MySQL");
    });

    it("should throw error when database already linked", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.organizationDatabase.findUnique).mockResolvedValue({ id: "existing" } as any);

      await expect(addDatabaseToOrganization(ORG_ID, DATABASE_ID)).rejects.toThrow(
        "Este banco de dados já está vinculado ao organization"
      );
    });
  });

  describe("removeDatabaseFromOrganization", () => {
    it("should throw error when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      await expect(removeDatabaseFromOrganization(ORG_ID, DATABASE_ID)).rejects.toThrow("Não autorizado");
    });

    it("should remove a database from an organization", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.organizationDatabase.delete).mockResolvedValue({} as any);

      await removeDatabaseFromOrganization(ORG_ID, DATABASE_ID);

      expect(prisma.organizationDatabase.delete).toHaveBeenCalledWith({
        where: { organizationId_databaseId: { organizationId: ORG_ID, databaseId: DATABASE_ID } },
      });
    });
  });

  // ==================== ERPs ====================
  describe("addERPToOrganization", () => {
    it("should throw error when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      await expect(addERPToOrganization(ORG_ID, ERP_ID)).rejects.toThrow("Não autorizado");
    });

    it("should add an ERP to an organization", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.organizationERP.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.organizationERP.create).mockResolvedValue({
        id: "link-1",
        organizationId: ORG_ID,
        erpId: ERP_ID,
        erp: { id: ERP_ID, name: "Oracle ERP" },
      } as any);

      const result = await addERPToOrganization(ORG_ID, ERP_ID);

      expect(prisma.organizationERP.findUnique).toHaveBeenCalledWith({
        where: { organizationId_erpId: { organizationId: ORG_ID, erpId: ERP_ID } },
      });
      expect(result.erp.name).toBe("Oracle ERP");
    });

    it("should throw error when ERP already linked", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.organizationERP.findUnique).mockResolvedValue({ id: "existing" } as any);

      await expect(addERPToOrganization(ORG_ID, ERP_ID)).rejects.toThrow(
        "Este ERP já está vinculado ao organization"
      );
    });
  });

  describe("removeERPFromOrganization", () => {
    it("should throw error when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      await expect(removeERPFromOrganization(ORG_ID, ERP_ID)).rejects.toThrow("Não autorizado");
    });

    it("should remove an ERP from an organization", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.organizationERP.delete).mockResolvedValue({} as any);

      await removeERPFromOrganization(ORG_ID, ERP_ID);

      expect(prisma.organizationERP.delete).toHaveBeenCalledWith({
        where: { organizationId_erpId: { organizationId: ORG_ID, erpId: ERP_ID } },
      });
    });
  });

  // ==================== CRMs ====================
  describe("addCRMToOrganization", () => {
    it("should throw error when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      await expect(addCRMToOrganization(ORG_ID, CRM_ID)).rejects.toThrow("Não autorizado");
    });

    it("should add a CRM to an organization", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.organizationCRM.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.organizationCRM.create).mockResolvedValue({
        id: "link-1",
        organizationId: ORG_ID,
        crmId: CRM_ID,
        crm: { id: CRM_ID, name: "HubSpot" },
      } as any);

      const result = await addCRMToOrganization(ORG_ID, CRM_ID);

      expect(prisma.organizationCRM.findUnique).toHaveBeenCalledWith({
        where: { organizationId_crmId: { organizationId: ORG_ID, crmId: CRM_ID } },
      });
      expect(result.crm.name).toBe("HubSpot");
    });

    it("should throw error when CRM already linked", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.organizationCRM.findUnique).mockResolvedValue({ id: "existing" } as any);

      await expect(addCRMToOrganization(ORG_ID, CRM_ID)).rejects.toThrow(
        "Este CRM já está vinculado ao organization"
      );
    });
  });

  describe("removeCRMFromOrganization", () => {
    it("should throw error when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      await expect(removeCRMFromOrganization(ORG_ID, CRM_ID)).rejects.toThrow("Não autorizado");
    });

    it("should remove a CRM from an organization", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.organizationCRM.delete).mockResolvedValue({} as any);

      await removeCRMFromOrganization(ORG_ID, CRM_ID);

      expect(prisma.organizationCRM.delete).toHaveBeenCalledWith({
        where: { organizationId_crmId: { organizationId: ORG_ID, crmId: CRM_ID } },
      });
    });
  });

  // ==================== E-COMMERCE ====================
  describe("addEcommerceToOrganization", () => {
    it("should throw error when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      await expect(addEcommerceToOrganization(ORG_ID, ECOMMERCE_ID)).rejects.toThrow("Não autorizado");
    });

    it("should add an e-commerce platform to an organization", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.organizationEcommerce.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.organizationEcommerce.create).mockResolvedValue({
        id: "link-1",
        organizationId: ORG_ID,
        ecommerceId: ECOMMERCE_ID,
        ecommerce: { id: ECOMMERCE_ID, name: "Magento" },
      } as any);

      const result = await addEcommerceToOrganization(ORG_ID, ECOMMERCE_ID);

      expect(prisma.organizationEcommerce.findUnique).toHaveBeenCalledWith({
        where: { organizationId_ecommerceId: { organizationId: ORG_ID, ecommerceId: ECOMMERCE_ID } },
      });
      expect(result.ecommerce.name).toBe("Magento");
    });

    it("should throw error when e-commerce already linked", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.organizationEcommerce.findUnique).mockResolvedValue({ id: "existing" } as any);

      await expect(addEcommerceToOrganization(ORG_ID, ECOMMERCE_ID)).rejects.toThrow(
        "Esta plataforma de e-commerce já está vinculada ao organization"
      );
    });
  });

  describe("removeEcommerceFromOrganization", () => {
    it("should throw error when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      await expect(removeEcommerceFromOrganization(ORG_ID, ECOMMERCE_ID)).rejects.toThrow("Não autorizado");
    });

    it("should remove an e-commerce platform from an organization", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.organizationEcommerce.delete).mockResolvedValue({} as any);

      await removeEcommerceFromOrganization(ORG_ID, ECOMMERCE_ID);

      expect(prisma.organizationEcommerce.delete).toHaveBeenCalledWith({
        where: { organizationId_ecommerceId: { organizationId: ORG_ID, ecommerceId: ECOMMERCE_ID } },
      });
    });
  });
});
