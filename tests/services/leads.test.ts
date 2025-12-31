/**
 * Tests for Leads Service
 * Phase 9: Architecture Improvements - Service Layer
 */

import { describe, it, expect } from "vitest";
import {
  validateLeadForConversion,
  prepareLeadForConversion,
  mapLeadToOrganization,
  mapLeadContactToContact,
  mapCNAEsForTransfer,
  mapTechProfileForTransfer,
  calculateLeadScore,
  getLeadQuality,
  type LeadWithRelations,
} from "@/services/leads.service";
import type { LeadContact } from "@prisma/client";

// Helper to create mock lead
function createMockLead(overrides: Partial<LeadWithRelations> = {}): LeadWithRelations {
  return {
    id: "lead-1",
    businessName: "Test Company",
    legalName: null,
    website: null,
    phone: null,
    country: "BR",
    state: "SP",
    city: "São Paulo",
    address: null,
    postalCode: null,
    industry: null,
    employeeCount: null,
    annualRevenue: null,
    cnpj: null,
    primaryCNAEId: null,
    internationalActivity: null,
    techDetails: null,
    status: "new",
    source: null,
    notes: null,
    ownerId: "user-1",
    convertedToOrganizationId: null,
    referredByPartnerId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    contacts: [],
    primaryCNAE: null,
    secondaryCNAEs: [],
    languages: [],
    frameworks: [],
    hosting: [],
    databases: [],
    erps: [],
    crms: [],
    ecommerces: [],
    products: [],
    ...overrides,
  } as LeadWithRelations;
}

// Helper to create mock lead contact
function createMockLeadContact(overrides: Partial<LeadContact> = {}): LeadContact {
  return {
    id: "lc-1",
    name: "John Doe",
    email: "john@example.com",
    phone: "+55 11 99999-9999",
    position: "CEO",
    isPrimary: true,
    leadId: "lead-1",
    convertedToContactId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as LeadContact;
}

describe("Leads Service", () => {
  // ==================== validateLeadForConversion ====================
  describe("validateLeadForConversion", () => {
    it("should return valid for complete lead", () => {
      const lead = createMockLead({
        businessName: "Complete Company",
        contacts: [createMockLeadContact({ isPrimary: true })],
      });

      const result = validateLeadForConversion(lead);

      expect(result.valid).toBe(true);
      expect(result.missingFields).toHaveLength(0);
    });

    it("should require businessName", () => {
      const lead = createMockLead({ businessName: null });

      const result = validateLeadForConversion(lead);

      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain("businessName");
    });

    it("should warn when no contacts", () => {
      const lead = createMockLead({ contacts: [] });

      const result = validateLeadForConversion(lead);

      expect(result.warnings).toContain("Lead não possui contatos cadastrados");
    });

    it("should warn when no primary contact", () => {
      const lead = createMockLead({
        contacts: [createMockLeadContact({ isPrimary: false })],
      });

      const result = validateLeadForConversion(lead);

      expect(result.warnings).toContain("Nenhum contato marcado como principal");
    });

    it("should fail if already converted", () => {
      const lead = createMockLead({ status: "converted" });

      const result = validateLeadForConversion(lead);

      expect(result.valid).toBe(false);
      expect(result.missingFields.some((f) => f.includes("convertido"))).toBe(true);
    });

    it("should warn if disqualified", () => {
      const lead = createMockLead({ status: "disqualified" });

      const result = validateLeadForConversion(lead);

      expect(result.warnings).toContain("Lead está desqualificado");
    });

    it("should warn about missing CNAE for Brazilian companies", () => {
      const lead = createMockLead({
        country: "BR",
        primaryCNAEId: null,
      });

      const result = validateLeadForConversion(lead);

      expect(result.warnings.some((w) => w.includes("CNAE"))).toBe(true);
    });

    it("should not warn about CNAE for non-Brazilian companies", () => {
      const lead = createMockLead({
        country: "US",
        primaryCNAEId: null,
      });

      const result = validateLeadForConversion(lead);

      expect(result.warnings.some((w) => w.includes("CNAE"))).toBe(false);
    });
  });

  // ==================== prepareLeadForConversion ====================
  describe("prepareLeadForConversion", () => {
    it("should return isReady true for valid lead", () => {
      const lead = createMockLead({
        businessName: "Ready Company",
        contacts: [createMockLeadContact()],
      });

      const result = prepareLeadForConversion(lead);

      expect(result.isReady).toBe(true);
      expect(result.organizationData).not.toBeNull();
      expect(result.contactsData).toHaveLength(1);
    });

    it("should return isReady false for invalid lead", () => {
      const lead = createMockLead({ businessName: null });

      const result = prepareLeadForConversion(lead);

      expect(result.isReady).toBe(false);
      expect(result.organizationData).toBeNull();
      expect(result.issues).toContain("businessName");
    });

    it("should include warnings as issues", () => {
      const lead = createMockLead({
        businessName: "Company",
        contacts: [],
      });

      const result = prepareLeadForConversion(lead);

      expect(result.issues.some((i) => i.includes("contatos"))).toBe(true);
    });
  });

  // ==================== mapLeadToOrganization ====================
  describe("mapLeadToOrganization", () => {
    it("should map all fields correctly", () => {
      // Use correct Lead field names (which map to Organization fields)
      const lead = createMockLead({
        businessName: "Test Corp",
        registeredName: "Test Corporation LTDA", // maps to legalName
        website: "https://test.com",
        phone: "+55 11 1234-5678",
        country: "BR",
        state: "SP",
        city: "São Paulo",
        address: "Av. Paulista, 1000",
        zipCode: "01310-100", // maps to postalCode
        employeesCount: 75, // maps to employeeCount
        revenue: 1000000, // maps to annualRevenue
        companyRegistrationID: "12.345.678/0001-99", // maps to cnpj
        primaryCNAEId: "cnae-1",
        internationalActivity: null,
        ownerId: "user-123",
      });

      const result = mapLeadToOrganization(lead);

      expect(result.name).toBe("Test Corp");
      expect(result.legalName).toBe("Test Corporation LTDA");
      expect(result.website).toBe("https://test.com");
      expect(result.phone).toBe("+55 11 1234-5678");
      expect(result.country).toBe("BR");
      expect(result.state).toBe("SP");
      expect(result.city).toBe("São Paulo");
      expect(result.postalCode).toBe("01310-100");
      expect(result.employeeCount).toBe(75);
      expect(result.annualRevenue).toBe(1000000);
      expect(result.cnpj).toBe("12.345.678/0001-99");
      expect(result.primaryCNAEId).toBe("cnae-1");
      expect(result.ownerId).toBe("user-123");
      expect(result.sourceLeadId).toBe("lead-1");
    });

    it("should handle null optional fields", () => {
      const lead = createMockLead({
        businessName: "Minimal Corp",
        registeredName: null,
        website: null,
      });

      const result = mapLeadToOrganization(lead);

      expect(result.name).toBe("Minimal Corp");
      expect(result.legalName).toBeNull();
      expect(result.website).toBeNull();
    });
  });

  // ==================== mapLeadContactToContact ====================
  describe("mapLeadContactToContact", () => {
    it("should map contact fields correctly", () => {
      const contact = createMockLeadContact({
        id: "lc-123",
        name: "Jane Smith",
        email: "jane@example.com",
        phone: "+55 11 88888-8888",
        role: "CTO", // LeadContact uses "role", maps to "position"
        isPrimary: true,
      });

      const result = mapLeadContactToContact(contact, "user-456");

      expect(result.name).toBe("Jane Smith");
      expect(result.email).toBe("jane@example.com");
      expect(result.phone).toBe("+55 11 88888-8888");
      expect(result.position).toBe("CTO"); // Mapped from role
      expect(result.isPrimary).toBe(true);
      expect(result.ownerId).toBe("user-456");
      expect(result.sourceLeadContactId).toBe("lc-123");
    });

    it("should handle null optional fields", () => {
      const contact = createMockLeadContact({
        name: "John",
        email: null,
        phone: null,
        role: null, // LeadContact uses "role"
        isPrimary: false,
      });

      const result = mapLeadContactToContact(contact, "user-1");

      expect(result.name).toBe("John");
      expect(result.email).toBeNull();
      expect(result.phone).toBeNull();
      expect(result.position).toBeNull(); // Mapped from role
      expect(result.isPrimary).toBe(false);
    });
  });

  // ==================== mapCNAEsForTransfer ====================
  describe("mapCNAEsForTransfer", () => {
    it("should map CNAE IDs correctly", () => {
      const lead = createMockLead({
        primaryCNAEId: "cnae-primary",
        secondaryCNAEs: [
          { cnae: { id: "cnae-1", code: "1234-5/67", description: "Desc 1" } },
          { cnae: { id: "cnae-2", code: "2345-6/78", description: "Desc 2" } },
        ] as any,
      });

      const result = mapCNAEsForTransfer(lead);

      expect(result.primaryCNAEId).toBe("cnae-primary");
      expect(result.secondaryCNAEIds).toEqual(["cnae-1", "cnae-2"]);
    });

    it("should handle empty secondary CNAEs", () => {
      const lead = createMockLead({
        primaryCNAEId: "cnae-1",
        secondaryCNAEs: [],
      });

      const result = mapCNAEsForTransfer(lead);

      expect(result.secondaryCNAEIds).toEqual([]);
    });

    it("should handle null primary CNAE", () => {
      const lead = createMockLead({ primaryCNAEId: null });

      const result = mapCNAEsForTransfer(lead);

      expect(result.primaryCNAEId).toBeNull();
    });
  });

  // ==================== mapTechProfileForTransfer ====================
  describe("mapTechProfileForTransfer", () => {
    it("should map tech profile IDs correctly", () => {
      const lead = createMockLead({
        languages: [
          { language: { id: "lang-1", name: "JavaScript" } },
          { language: { id: "lang-2", name: "TypeScript" } },
        ] as any,
        frameworks: [{ framework: { id: "fw-1", name: "React" } }] as any,
        databases: [{ database: { id: "db-1", name: "PostgreSQL" } }] as any,
      });

      const result = mapTechProfileForTransfer(lead);

      expect(result.languageIds).toEqual(["lang-1", "lang-2"]);
      expect(result.frameworkIds).toEqual(["fw-1"]);
      expect(result.databaseIds).toEqual(["db-1"]);
      expect(result.hostingIds).toEqual([]);
      expect(result.erpIds).toEqual([]);
      expect(result.crmIds).toEqual([]);
      expect(result.ecommerceIds).toEqual([]);
    });

    it("should handle empty tech profile", () => {
      const lead = createMockLead();

      const result = mapTechProfileForTransfer(lead);

      expect(result.languageIds).toEqual([]);
      expect(result.frameworkIds).toEqual([]);
      expect(result.hostingIds).toEqual([]);
      expect(result.databaseIds).toEqual([]);
      expect(result.erpIds).toEqual([]);
      expect(result.crmIds).toEqual([]);
      expect(result.ecommerceIds).toEqual([]);
    });
  });

  // ==================== calculateLeadScore ====================
  describe("calculateLeadScore", () => {
    it("should calculate score for complete lead", () => {
      // Use correct Lead field names
      const lead = createMockLead({
        businessName: "Company",
        website: "https://example.com",
        phone: "+55 11 99999-9999",
        categories: "Tech", // Lead uses "categories" instead of "industry"
        employeesCount: 50, // Lead uses "employeesCount" (with 's')
        country: "BR",
        state: "SP",
        city: "São Paulo",
        companyRegistrationID: "12.345.678/0001-99", // Lead uses "companyRegistrationID" instead of "cnpj"
        primaryCNAEId: "cnae-1",
        contacts: [
          createMockLeadContact({
            isPrimary: true,
            email: "test@example.com",
            phone: "+55 11 88888-8888",
          }),
        ],
        languages: [{ language: { id: "l1", name: "JS" } }] as any,
      });

      const score = calculateLeadScore(lead);

      expect(score).toBeGreaterThan(80);
    });

    it("should return low score for minimal lead", () => {
      const lead = createMockLead({
        businessName: "Company",
        contacts: [],
      });

      const score = calculateLeadScore(lead);

      expect(score).toBeLessThan(30);
    });

    it("should cap score at 100", () => {
      const lead = createMockLead({
        businessName: "Complete Company",
        website: "https://example.com",
        phone: "+55 11 99999-9999",
        industry: "Technology",
        employeeCount: "100-500",
        country: "BR",
        state: "SP",
        city: "São Paulo",
        cnpj: "12.345.678/0001-99",
        primaryCNAEId: "cnae-1",
        contacts: [createMockLeadContact()],
        languages: [{ language: { id: "l1", name: "JS" } }] as any,
      });

      const score = calculateLeadScore(lead);

      expect(score).toBeLessThanOrEqual(100);
    });

    it("should give points for contacts", () => {
      const leadWithContacts = createMockLead({
        contacts: [createMockLeadContact()],
      });
      const leadWithoutContacts = createMockLead({
        contacts: [],
      });

      const scoreWith = calculateLeadScore(leadWithContacts);
      const scoreWithout = calculateLeadScore(leadWithoutContacts);

      expect(scoreWith).toBeGreaterThan(scoreWithout);
    });
  });

  // ==================== getLeadQuality ====================
  describe("getLeadQuality", () => {
    it("should return hot for score >= 70", () => {
      expect(getLeadQuality(70)).toBe("hot");
      expect(getLeadQuality(85)).toBe("hot");
      expect(getLeadQuality(100)).toBe("hot");
    });

    it("should return warm for score >= 40 and < 70", () => {
      expect(getLeadQuality(40)).toBe("warm");
      expect(getLeadQuality(55)).toBe("warm");
      expect(getLeadQuality(69)).toBe("warm");
    });

    it("should return cold for score < 40", () => {
      expect(getLeadQuality(0)).toBe("cold");
      expect(getLeadQuality(20)).toBe("cold");
      expect(getLeadQuality(39)).toBe("cold");
    });
  });
});
