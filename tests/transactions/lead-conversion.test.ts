/**
 * Tests for Lead Conversion Transaction
 * Phase 9: Architecture Improvements - Transaction Wrappers
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma with transaction support
const mockTx = {
  organization: {
    create: vi.fn(),
  },
  contact: {
    create: vi.fn(),
  },
  leadContact: {
    update: vi.fn(),
  },
  organizationSecondaryCNAE: {
    createMany: vi.fn(),
  },
  organizationLanguage: {
    createMany: vi.fn(),
  },
  organizationFramework: {
    createMany: vi.fn(),
  },
  organizationHosting: {
    createMany: vi.fn(),
  },
  organizationDatabase: {
    createMany: vi.fn(),
  },
  organizationERP: {
    createMany: vi.fn(),
  },
  organizationCRM: {
    createMany: vi.fn(),
  },
  organizationEcommerce: {
    createMany: vi.fn(),
  },
  organizationProduct: {
    createMany: vi.fn(),
  },
  lead: {
    update: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn((callback) => callback(mockTx)),
  },
}));

import {
  convertLeadToOrganizationTransaction,
  type LeadConversionInput,
} from "@/lib/transactions";

describe("Lead Conversion Transaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockTx.organization.create.mockResolvedValue({ id: "org-1" });
    mockTx.contact.create.mockResolvedValue({ id: "contact-1" });
    mockTx.leadContact.update.mockResolvedValue({});
    mockTx.organizationSecondaryCNAE.createMany.mockResolvedValue({ count: 0 });
    mockTx.organizationLanguage.createMany.mockResolvedValue({ count: 0 });
    mockTx.organizationFramework.createMany.mockResolvedValue({ count: 0 });
    mockTx.organizationHosting.createMany.mockResolvedValue({ count: 0 });
    mockTx.organizationDatabase.createMany.mockResolvedValue({ count: 0 });
    mockTx.organizationERP.createMany.mockResolvedValue({ count: 0 });
    mockTx.organizationCRM.createMany.mockResolvedValue({ count: 0 });
    mockTx.organizationEcommerce.createMany.mockResolvedValue({ count: 0 });
    mockTx.organizationProduct.createMany.mockResolvedValue({ count: 0 });
    mockTx.lead.update.mockResolvedValue({});
  });

  const basicInput: LeadConversionInput = {
    leadId: "lead-1",
    ownerId: "user-1",
    organizationData: {
      name: "Test Organization",
    },
    contactsData: [],
  };

  // ==================== Organization Creation ====================
  describe("Organization Creation", () => {
    it("should create organization in transaction", async () => {
      const input: LeadConversionInput = {
        ...basicInput,
        organizationData: {
          name: "New Organization",
          legalName: "New Org LTDA",
          website: "https://neworg.com",
        },
      };

      const result = await convertLeadToOrganizationTransaction(input);

      expect(mockTx.organization.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "New Organization",
          legalName: "New Org LTDA",
          website: "https://neworg.com",
          ownerId: "user-1",
          sourceLeadId: "lead-1",
        }),
      });
      expect(result.organizationId).toBe("org-1");
      expect(result.success).toBe(true);
    });
  });

  // ==================== Contacts Creation ====================
  describe("Contacts Creation", () => {
    it("should create contacts in transaction", async () => {
      mockTx.contact.create
        .mockResolvedValueOnce({ id: "contact-1" })
        .mockResolvedValueOnce({ id: "contact-2" });

      const input: LeadConversionInput = {
        ...basicInput,
        contactsData: [
          {
            leadContactId: "lc-1",
            name: "John Doe",
            email: "john@example.com",
            isPrimary: true,
          },
          {
            leadContactId: "lc-2",
            name: "Jane Smith",
            email: "jane@example.com",
            isPrimary: false,
          },
        ],
      };

      const result = await convertLeadToOrganizationTransaction(input);

      expect(mockTx.contact.create).toHaveBeenCalledTimes(2);
      expect(result.contactIds).toEqual(["contact-1", "contact-2"]);
    });

    it("should update lead contacts with converted reference", async () => {
      const input: LeadConversionInput = {
        ...basicInput,
        contactsData: [
          {
            leadContactId: "lc-1",
            name: "John Doe",
            isPrimary: true,
          },
        ],
      };

      await convertLeadToOrganizationTransaction(input);

      expect(mockTx.leadContact.update).toHaveBeenCalledWith({
        where: { id: "lc-1" },
        data: { convertedToContactId: "contact-1" },
      });
    });
  });

  // ==================== Tech Profile Transfer ====================
  describe("Tech Profile Transfer", () => {
    it("should transfer tech profile languages", async () => {
      const input: LeadConversionInput = {
        ...basicInput,
        techProfile: {
          languageIds: ["lang-1", "lang-2"],
        },
      };

      await convertLeadToOrganizationTransaction(input);

      expect(mockTx.organizationLanguage.createMany).toHaveBeenCalledWith({
        data: [
          { organizationId: "org-1", languageId: "lang-1" },
          { organizationId: "org-1", languageId: "lang-2" },
        ],
      });
    });

    it("should transfer tech profile frameworks", async () => {
      const input: LeadConversionInput = {
        ...basicInput,
        techProfile: {
          frameworkIds: ["fw-1", "fw-2"],
        },
      };

      await convertLeadToOrganizationTransaction(input);

      expect(mockTx.organizationFramework.createMany).toHaveBeenCalledWith({
        data: [
          { organizationId: "org-1", frameworkId: "fw-1" },
          { organizationId: "org-1", frameworkId: "fw-2" },
        ],
      });
    });

    it("should transfer all tech profile types", async () => {
      const input: LeadConversionInput = {
        ...basicInput,
        techProfile: {
          languageIds: ["lang-1"],
          frameworkIds: ["fw-1"],
          hostingIds: ["host-1"],
          databaseIds: ["db-1"],
          erpIds: ["erp-1"],
          crmIds: ["crm-1"],
          ecommerceIds: ["ecom-1"],
        },
      };

      await convertLeadToOrganizationTransaction(input);

      expect(mockTx.organizationLanguage.createMany).toHaveBeenCalled();
      expect(mockTx.organizationFramework.createMany).toHaveBeenCalled();
      expect(mockTx.organizationHosting.createMany).toHaveBeenCalled();
      expect(mockTx.organizationDatabase.createMany).toHaveBeenCalled();
      expect(mockTx.organizationERP.createMany).toHaveBeenCalled();
      expect(mockTx.organizationCRM.createMany).toHaveBeenCalled();
      expect(mockTx.organizationEcommerce.createMany).toHaveBeenCalled();
    });
  });

  // ==================== CNAE Transfer ====================
  describe("CNAE Transfer", () => {
    it("should transfer secondary CNAEs", async () => {
      const input: LeadConversionInput = {
        ...basicInput,
        secondaryCNAEIds: ["cnae-1", "cnae-2", "cnae-3"],
      };

      await convertLeadToOrganizationTransaction(input);

      expect(mockTx.organizationSecondaryCNAE.createMany).toHaveBeenCalledWith({
        data: [
          { organizationId: "org-1", cnaeId: "cnae-1" },
          { organizationId: "org-1", cnaeId: "cnae-2" },
          { organizationId: "org-1", cnaeId: "cnae-3" },
        ],
      });
    });

    it("should not call createMany when no secondary CNAEs", async () => {
      await convertLeadToOrganizationTransaction(basicInput);

      expect(mockTx.organizationSecondaryCNAE.createMany).not.toHaveBeenCalled();
    });
  });

  // ==================== Products Transfer ====================
  describe("Products Transfer", () => {
    it("should transfer products of interest", async () => {
      const input: LeadConversionInput = {
        ...basicInput,
        productIds: ["prod-1", "prod-2"],
      };

      await convertLeadToOrganizationTransaction(input);

      expect(mockTx.organizationProduct.createMany).toHaveBeenCalledWith({
        data: [
          { organizationId: "org-1", productId: "prod-1" },
          { organizationId: "org-1", productId: "prod-2" },
        ],
      });
    });
  });

  // ==================== Lead Status Update ====================
  describe("Lead Status Update", () => {
    it("should update lead status to converted", async () => {
      await convertLeadToOrganizationTransaction(basicInput);

      expect(mockTx.lead.update).toHaveBeenCalledWith({
        where: { id: "lead-1" },
        data: {
          status: "converted",
          convertedToOrganizationId: "org-1",
        },
      });
    });
  });

  // ==================== Rollback Scenarios ====================
  describe("Rollback Scenarios", () => {
    it("should rollback on organization creation error", async () => {
      mockTx.organization.create.mockRejectedValue(
        new Error("Database error")
      );

      await expect(
        convertLeadToOrganizationTransaction(basicInput)
      ).rejects.toThrow("Database error");

      // Since it's a transaction, contacts should not be created
      expect(mockTx.contact.create).not.toHaveBeenCalled();
    });

    it("should rollback on contact creation error", async () => {
      mockTx.contact.create.mockRejectedValue(
        new Error("Contact creation failed")
      );

      const input: LeadConversionInput = {
        ...basicInput,
        contactsData: [
          { leadContactId: "lc-1", name: "John", isPrimary: true },
        ],
      };

      await expect(
        convertLeadToOrganizationTransaction(input)
      ).rejects.toThrow("Contact creation failed");

      // Lead status should not be updated (rolled back)
      expect(mockTx.lead.update).not.toHaveBeenCalled();
    });

    it("should rollback on tech profile error", async () => {
      mockTx.organizationLanguage.createMany.mockRejectedValue(
        new Error("Tech profile error")
      );

      const input: LeadConversionInput = {
        ...basicInput,
        techProfile: {
          languageIds: ["lang-1"],
        },
      };

      await expect(
        convertLeadToOrganizationTransaction(input)
      ).rejects.toThrow("Tech profile error");
    });
  });

  // ==================== Partial Contact Conversion ====================
  describe("Partial Contact Conversion", () => {
    it("should convert only specified contacts", async () => {
      mockTx.contact.create.mockResolvedValue({ id: "contact-1" });

      const input: LeadConversionInput = {
        ...basicInput,
        contactsData: [
          // Only one contact specified for conversion
          { leadContactId: "lc-1", name: "Primary Contact", isPrimary: true },
        ],
      };

      const result = await convertLeadToOrganizationTransaction(input);

      expect(mockTx.contact.create).toHaveBeenCalledTimes(1);
      expect(result.contactIds).toHaveLength(1);
    });
  });
});
