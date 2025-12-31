/**
 * Tests for Lead Tech Profile Actions
 * Phase 6: Tech Profile & Tech Stack - Lead linking functionality
 *
 * Actions tested:
 * - getLeadTechProfile
 * - addLanguageToLead / removeLanguageFromLead
 * - addFrameworkToLead / removeFrameworkFromLead
 * - addHostingToLead / removeHostingFromLead
 * - addDatabaseToLead / removeDatabaseFromLead
 * - addERPToLead / removeERPFromLead
 * - addCRMToLead / removeCRMFromLead
 * - addEcommerceToLead / removeEcommerceFromLead
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Valid CUID format for testing
const LEAD_ID = "clxxxxxxxxxxxxxxxxxxxxxxxxxl1";
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
    leadLanguage: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    leadFramework: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    leadHosting: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    leadDatabase: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    leadERP: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    leadCRM: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    leadEcommerce: {
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
  getLeadTechProfile,
  addLanguageToLead,
  removeLanguageFromLead,
  addFrameworkToLead,
  removeFrameworkFromLead,
  addHostingToLead,
  removeHostingFromLead,
  addDatabaseToLead,
  removeDatabaseFromLead,
  addERPToLead,
  removeERPFromLead,
  addCRMToLead,
  removeCRMFromLead,
  addEcommerceToLead,
  removeEcommerceFromLead,
} from "@/actions/lead-tech-profile";

describe("Lead Tech Profile Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== GET LEAD TECH PROFILE ====================
  describe("getLeadTechProfile", () => {
    it("should throw error when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      await expect(getLeadTechProfile(LEAD_ID)).rejects.toThrow("Não autorizado");
    });

    it("should return all tech profile types for a lead", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      const mockLanguages = [{ id: "1", leadId: LEAD_ID, languageId: LANGUAGE_ID, language: { id: LANGUAGE_ID, name: "Python" } }];
      const mockFrameworks = [{ id: "2", leadId: LEAD_ID, frameworkId: FRAMEWORK_ID, framework: { id: FRAMEWORK_ID, name: "Django" } }];
      const mockHosting = [{ id: "3", leadId: LEAD_ID, hostingId: HOSTING_ID, hosting: { id: HOSTING_ID, name: "AWS" } }];
      const mockDatabases = [{ id: "4", leadId: LEAD_ID, databaseId: DATABASE_ID, database: { id: DATABASE_ID, name: "PostgreSQL" } }];
      const mockERPs = [{ id: "5", leadId: LEAD_ID, erpId: ERP_ID, erp: { id: ERP_ID, name: "SAP" } }];
      const mockCRMs = [{ id: "6", leadId: LEAD_ID, crmId: CRM_ID, crm: { id: CRM_ID, name: "Salesforce" } }];
      const mockEcommerces = [{ id: "7", leadId: LEAD_ID, ecommerceId: ECOMMERCE_ID, ecommerce: { id: ECOMMERCE_ID, name: "Shopify" } }];

      vi.mocked(prisma.leadLanguage.findMany).mockResolvedValue(mockLanguages as any);
      vi.mocked(prisma.leadFramework.findMany).mockResolvedValue(mockFrameworks as any);
      vi.mocked(prisma.leadHosting.findMany).mockResolvedValue(mockHosting as any);
      vi.mocked(prisma.leadDatabase.findMany).mockResolvedValue(mockDatabases as any);
      vi.mocked(prisma.leadERP.findMany).mockResolvedValue(mockERPs as any);
      vi.mocked(prisma.leadCRM.findMany).mockResolvedValue(mockCRMs as any);
      vi.mocked(prisma.leadEcommerce.findMany).mockResolvedValue(mockEcommerces as any);

      const result = await getLeadTechProfile(LEAD_ID);

      expect(result.languages).toEqual(mockLanguages);
      expect(result.frameworks).toEqual(mockFrameworks);
      expect(result.hosting).toEqual(mockHosting);
      expect(result.databases).toEqual(mockDatabases);
      expect(result.erps).toEqual(mockERPs);
      expect(result.crms).toEqual(mockCRMs);
      expect(result.ecommerces).toEqual(mockEcommerces);
    });

    it("should return empty arrays when lead has no tech profile", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.leadLanguage.findMany).mockResolvedValue([]);
      vi.mocked(prisma.leadFramework.findMany).mockResolvedValue([]);
      vi.mocked(prisma.leadHosting.findMany).mockResolvedValue([]);
      vi.mocked(prisma.leadDatabase.findMany).mockResolvedValue([]);
      vi.mocked(prisma.leadERP.findMany).mockResolvedValue([]);
      vi.mocked(prisma.leadCRM.findMany).mockResolvedValue([]);
      vi.mocked(prisma.leadEcommerce.findMany).mockResolvedValue([]);

      const result = await getLeadTechProfile(LEAD_ID);

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
  describe("addLanguageToLead", () => {
    it("should throw error when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      await expect(addLanguageToLead(LEAD_ID, LANGUAGE_ID)).rejects.toThrow("Não autorizado");
    });

    it("should add a language to a lead", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.leadLanguage.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.leadLanguage.create).mockResolvedValue({
        id: "link-1",
        leadId: LEAD_ID,
        languageId: LANGUAGE_ID,
        language: { id: LANGUAGE_ID, name: "Python" },
      } as any);

      const result = await addLanguageToLead(LEAD_ID, LANGUAGE_ID);

      expect(prisma.leadLanguage.findUnique).toHaveBeenCalledWith({
        where: { leadId_languageId: { leadId: LEAD_ID, languageId: LANGUAGE_ID } },
      });
      expect(prisma.leadLanguage.create).toHaveBeenCalledWith({
        data: { leadId: LEAD_ID, languageId: LANGUAGE_ID },
        include: { language: true },
      });
      expect(result.language.name).toBe("Python");
    });

    it("should throw error when language already linked", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.leadLanguage.findUnique).mockResolvedValue({ id: "existing" } as any);

      await expect(addLanguageToLead(LEAD_ID, LANGUAGE_ID)).rejects.toThrow(
        "Esta linguagem já está vinculada ao lead"
      );
    });
  });

  describe("removeLanguageFromLead", () => {
    it("should throw error when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      await expect(removeLanguageFromLead(LEAD_ID, LANGUAGE_ID)).rejects.toThrow("Não autorizado");
    });

    it("should remove a language from a lead", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.leadLanguage.delete).mockResolvedValue({} as any);

      await removeLanguageFromLead(LEAD_ID, LANGUAGE_ID);

      expect(prisma.leadLanguage.delete).toHaveBeenCalledWith({
        where: { leadId_languageId: { leadId: LEAD_ID, languageId: LANGUAGE_ID } },
      });
    });
  });

  // ==================== FRAMEWORKS ====================
  describe("addFrameworkToLead", () => {
    it("should throw error when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      await expect(addFrameworkToLead(LEAD_ID, FRAMEWORK_ID)).rejects.toThrow("Não autorizado");
    });

    it("should add a framework to a lead", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.leadFramework.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.leadFramework.create).mockResolvedValue({
        id: "link-1",
        leadId: LEAD_ID,
        frameworkId: FRAMEWORK_ID,
        framework: { id: FRAMEWORK_ID, name: "Django" },
      } as any);

      const result = await addFrameworkToLead(LEAD_ID, FRAMEWORK_ID);

      expect(prisma.leadFramework.findUnique).toHaveBeenCalledWith({
        where: { leadId_frameworkId: { leadId: LEAD_ID, frameworkId: FRAMEWORK_ID } },
      });
      expect(result.framework.name).toBe("Django");
    });

    it("should throw error when framework already linked", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.leadFramework.findUnique).mockResolvedValue({ id: "existing" } as any);

      await expect(addFrameworkToLead(LEAD_ID, FRAMEWORK_ID)).rejects.toThrow(
        "Este framework já está vinculado ao lead"
      );
    });
  });

  describe("removeFrameworkFromLead", () => {
    it("should throw error when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      await expect(removeFrameworkFromLead(LEAD_ID, FRAMEWORK_ID)).rejects.toThrow("Não autorizado");
    });

    it("should remove a framework from a lead", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.leadFramework.delete).mockResolvedValue({} as any);

      await removeFrameworkFromLead(LEAD_ID, FRAMEWORK_ID);

      expect(prisma.leadFramework.delete).toHaveBeenCalledWith({
        where: { leadId_frameworkId: { leadId: LEAD_ID, frameworkId: FRAMEWORK_ID } },
      });
    });
  });

  // ==================== HOSTING ====================
  describe("addHostingToLead", () => {
    it("should throw error when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      await expect(addHostingToLead(LEAD_ID, HOSTING_ID)).rejects.toThrow("Não autorizado");
    });

    it("should add a hosting service to a lead", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.leadHosting.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.leadHosting.create).mockResolvedValue({
        id: "link-1",
        leadId: LEAD_ID,
        hostingId: HOSTING_ID,
        hosting: { id: HOSTING_ID, name: "AWS" },
      } as any);

      const result = await addHostingToLead(LEAD_ID, HOSTING_ID);

      expect(prisma.leadHosting.findUnique).toHaveBeenCalledWith({
        where: { leadId_hostingId: { leadId: LEAD_ID, hostingId: HOSTING_ID } },
      });
      expect(result.hosting.name).toBe("AWS");
    });

    it("should throw error when hosting already linked", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.leadHosting.findUnique).mockResolvedValue({ id: "existing" } as any);

      await expect(addHostingToLead(LEAD_ID, HOSTING_ID)).rejects.toThrow(
        "Este serviço de hospedagem já está vinculado ao lead"
      );
    });
  });

  describe("removeHostingFromLead", () => {
    it("should throw error when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      await expect(removeHostingFromLead(LEAD_ID, HOSTING_ID)).rejects.toThrow("Não autorizado");
    });

    it("should remove a hosting service from a lead", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.leadHosting.delete).mockResolvedValue({} as any);

      await removeHostingFromLead(LEAD_ID, HOSTING_ID);

      expect(prisma.leadHosting.delete).toHaveBeenCalledWith({
        where: { leadId_hostingId: { leadId: LEAD_ID, hostingId: HOSTING_ID } },
      });
    });
  });

  // ==================== DATABASES ====================
  describe("addDatabaseToLead", () => {
    it("should throw error when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      await expect(addDatabaseToLead(LEAD_ID, DATABASE_ID)).rejects.toThrow("Não autorizado");
    });

    it("should add a database to a lead", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.leadDatabase.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.leadDatabase.create).mockResolvedValue({
        id: "link-1",
        leadId: LEAD_ID,
        databaseId: DATABASE_ID,
        database: { id: DATABASE_ID, name: "PostgreSQL" },
      } as any);

      const result = await addDatabaseToLead(LEAD_ID, DATABASE_ID);

      expect(prisma.leadDatabase.findUnique).toHaveBeenCalledWith({
        where: { leadId_databaseId: { leadId: LEAD_ID, databaseId: DATABASE_ID } },
      });
      expect(result.database.name).toBe("PostgreSQL");
    });

    it("should throw error when database already linked", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.leadDatabase.findUnique).mockResolvedValue({ id: "existing" } as any);

      await expect(addDatabaseToLead(LEAD_ID, DATABASE_ID)).rejects.toThrow(
        "Este banco de dados já está vinculado ao lead"
      );
    });
  });

  describe("removeDatabaseFromLead", () => {
    it("should throw error when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      await expect(removeDatabaseFromLead(LEAD_ID, DATABASE_ID)).rejects.toThrow("Não autorizado");
    });

    it("should remove a database from a lead", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.leadDatabase.delete).mockResolvedValue({} as any);

      await removeDatabaseFromLead(LEAD_ID, DATABASE_ID);

      expect(prisma.leadDatabase.delete).toHaveBeenCalledWith({
        where: { leadId_databaseId: { leadId: LEAD_ID, databaseId: DATABASE_ID } },
      });
    });
  });

  // ==================== ERPs ====================
  describe("addERPToLead", () => {
    it("should throw error when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      await expect(addERPToLead(LEAD_ID, ERP_ID)).rejects.toThrow("Não autorizado");
    });

    it("should add an ERP to a lead", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.leadERP.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.leadERP.create).mockResolvedValue({
        id: "link-1",
        leadId: LEAD_ID,
        erpId: ERP_ID,
        erp: { id: ERP_ID, name: "SAP" },
      } as any);

      const result = await addERPToLead(LEAD_ID, ERP_ID);

      expect(prisma.leadERP.findUnique).toHaveBeenCalledWith({
        where: { leadId_erpId: { leadId: LEAD_ID, erpId: ERP_ID } },
      });
      expect(result.erp.name).toBe("SAP");
    });

    it("should throw error when ERP already linked", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.leadERP.findUnique).mockResolvedValue({ id: "existing" } as any);

      await expect(addERPToLead(LEAD_ID, ERP_ID)).rejects.toThrow(
        "Este ERP já está vinculado ao lead"
      );
    });
  });

  describe("removeERPFromLead", () => {
    it("should throw error when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      await expect(removeERPFromLead(LEAD_ID, ERP_ID)).rejects.toThrow("Não autorizado");
    });

    it("should remove an ERP from a lead", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.leadERP.delete).mockResolvedValue({} as any);

      await removeERPFromLead(LEAD_ID, ERP_ID);

      expect(prisma.leadERP.delete).toHaveBeenCalledWith({
        where: { leadId_erpId: { leadId: LEAD_ID, erpId: ERP_ID } },
      });
    });
  });

  // ==================== CRMs ====================
  describe("addCRMToLead", () => {
    it("should throw error when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      await expect(addCRMToLead(LEAD_ID, CRM_ID)).rejects.toThrow("Não autorizado");
    });

    it("should add a CRM to a lead", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.leadCRM.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.leadCRM.create).mockResolvedValue({
        id: "link-1",
        leadId: LEAD_ID,
        crmId: CRM_ID,
        crm: { id: CRM_ID, name: "Salesforce" },
      } as any);

      const result = await addCRMToLead(LEAD_ID, CRM_ID);

      expect(prisma.leadCRM.findUnique).toHaveBeenCalledWith({
        where: { leadId_crmId: { leadId: LEAD_ID, crmId: CRM_ID } },
      });
      expect(result.crm.name).toBe("Salesforce");
    });

    it("should throw error when CRM already linked", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.leadCRM.findUnique).mockResolvedValue({ id: "existing" } as any);

      await expect(addCRMToLead(LEAD_ID, CRM_ID)).rejects.toThrow(
        "Este CRM já está vinculado ao lead"
      );
    });
  });

  describe("removeCRMFromLead", () => {
    it("should throw error when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      await expect(removeCRMFromLead(LEAD_ID, CRM_ID)).rejects.toThrow("Não autorizado");
    });

    it("should remove a CRM from a lead", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.leadCRM.delete).mockResolvedValue({} as any);

      await removeCRMFromLead(LEAD_ID, CRM_ID);

      expect(prisma.leadCRM.delete).toHaveBeenCalledWith({
        where: { leadId_crmId: { leadId: LEAD_ID, crmId: CRM_ID } },
      });
    });
  });

  // ==================== E-COMMERCE ====================
  describe("addEcommerceToLead", () => {
    it("should throw error when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      await expect(addEcommerceToLead(LEAD_ID, ECOMMERCE_ID)).rejects.toThrow("Não autorizado");
    });

    it("should add an e-commerce platform to a lead", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.leadEcommerce.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.leadEcommerce.create).mockResolvedValue({
        id: "link-1",
        leadId: LEAD_ID,
        ecommerceId: ECOMMERCE_ID,
        ecommerce: { id: ECOMMERCE_ID, name: "Shopify" },
      } as any);

      const result = await addEcommerceToLead(LEAD_ID, ECOMMERCE_ID);

      expect(prisma.leadEcommerce.findUnique).toHaveBeenCalledWith({
        where: { leadId_ecommerceId: { leadId: LEAD_ID, ecommerceId: ECOMMERCE_ID } },
      });
      expect(result.ecommerce.name).toBe("Shopify");
    });

    it("should throw error when e-commerce already linked", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.leadEcommerce.findUnique).mockResolvedValue({ id: "existing" } as any);

      await expect(addEcommerceToLead(LEAD_ID, ECOMMERCE_ID)).rejects.toThrow(
        "Esta plataforma de e-commerce já está vinculada ao lead"
      );
    });
  });

  describe("removeEcommerceFromLead", () => {
    it("should throw error when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      await expect(removeEcommerceFromLead(LEAD_ID, ECOMMERCE_ID)).rejects.toThrow("Não autorizado");
    });

    it("should remove an e-commerce platform from a lead", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", email: "test@test.com" },
      } as any);

      vi.mocked(prisma.leadEcommerce.delete).mockResolvedValue({} as any);

      await removeEcommerceFromLead(LEAD_ID, ECOMMERCE_ID);

      expect(prisma.leadEcommerce.delete).toHaveBeenCalledWith({
        where: { leadId_ecommerceId: { leadId: LEAD_ID, ecommerceId: ECOMMERCE_ID } },
      });
    });
  });
});
