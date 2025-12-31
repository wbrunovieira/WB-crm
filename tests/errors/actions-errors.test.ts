/**
 * Tests for Error Handling in Server Actions
 * Phase 9: Architecture Improvements - Error Integration
 *
 * These tests verify that actions throw appropriate custom errors
 * Note: Current implementation throws generic errors, these tests
 * document expected behavior after error handling migration
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    deal: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    contact: {
      findFirst: vi.fn(),
    },
    lead: {
      findFirst: vi.fn(),
    },
    organization: {
      findFirst: vi.fn(),
    },
    label: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Mock next-auth
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

// Valid CUID format for testing
const USER_ID = "clxxxxxxxxxxxxxxxxxxxxxxxxxu1";
const OTHER_USER_ID = "clxxxxxxxxxxxxxxxxxxxxxxxxxu2";
const DEAL_ID = "clxxxxxxxxxxxxxxxxxxxxxxxxxd1";
const CONTACT_ID = "clxxxxxxxxxxxxxxxxxxxxxxxxxc1";
const LEAD_ID = "clxxxxxxxxxxxxxxxxxxxxxxxxxl1";
const ORG_ID = "clxxxxxxxxxxxxxxxxxxxxxxxxxo1";
const STAGE_ID = "clxxxxxxxxxxxxxxxxxxxxxxxxxs1";

const mockSession = {
  user: { id: USER_ID, email: "test@example.com", name: "Test User", role: "sdr" },
};

describe("Actions Error Handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== Unauthorized Errors ====================
  describe("Unauthorized Errors (No Session)", () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(null);
    });

    it("getDealById throws error when not authenticated", async () => {
      // Dynamic import to ensure mocks are applied
      const { getDealById } = await import("@/actions/deals");

      await expect(getDealById(DEAL_ID)).rejects.toThrow("Não autorizado");
    });

    it("getContactById throws error when not authenticated", async () => {
      const { getContactById } = await import("@/actions/contacts");

      await expect(getContactById(CONTACT_ID)).rejects.toThrow("Não autorizado");
    });

    it("getLeadById throws error when not authenticated", async () => {
      const { getLeadById } = await import("@/actions/leads");

      await expect(getLeadById(LEAD_ID)).rejects.toThrow("Não autorizado");
    });

    it("getOrganizationById throws error when not authenticated", async () => {
      const { getOrganizationById } = await import("@/actions/organizations");

      await expect(getOrganizationById(ORG_ID)).rejects.toThrow("Não autorizado");
    });

    it("createDeal throws error when not authenticated", async () => {
      const { createDeal } = await import("@/actions/deals");

      await expect(
        createDeal({ title: "Test", value: 1000, stageId: STAGE_ID })
      ).rejects.toThrow("Não autorizado");
    });
  });

  // ==================== Not Found Errors ====================
  describe("Not Found Errors", () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    });

    it("getDealById returns null for non-existent deal", async () => {
      vi.mocked(prisma.deal.findFirst).mockResolvedValue(null);

      const { getDealById } = await import("@/actions/deals");
      const result = await getDealById(DEAL_ID);

      expect(result).toBeNull();
    });

    it("getContactById returns null for non-existent contact", async () => {
      vi.mocked(prisma.contact.findFirst).mockResolvedValue(null);

      const { getContactById } = await import("@/actions/contacts");
      const result = await getContactById(CONTACT_ID);

      expect(result).toBeNull();
    });

    it("getLeadById returns null for non-existent lead", async () => {
      vi.mocked(prisma.lead.findFirst).mockResolvedValue(null);

      const { getLeadById } = await import("@/actions/leads");
      const result = await getLeadById(LEAD_ID);

      expect(result).toBeNull();
    });

    it("getOrganizationById returns null for non-existent organization", async () => {
      vi.mocked(prisma.organization.findFirst).mockResolvedValue(null);

      const { getOrganizationById } = await import("@/actions/organizations");
      const result = await getOrganizationById(ORG_ID);

      expect(result).toBeNull();
    });
  });

  // ==================== Forbidden Errors (Other User's Data) ====================
  describe("Forbidden Errors (Data Isolation)", () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    });

    it("getDealById returns null for deal owned by another user", async () => {
      // findFirst with ownerId filter returns null for other user's deal
      vi.mocked(prisma.deal.findFirst).mockResolvedValue(null);

      const { getDealById } = await import("@/actions/deals");
      const result = await getDealById(DEAL_ID);

      expect(result).toBeNull();
      expect(prisma.deal.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: DEAL_ID,
            ownerId: USER_ID,
          }),
        })
      );
    });

    it("getContactById returns null for contact owned by another user", async () => {
      vi.mocked(prisma.contact.findFirst).mockResolvedValue(null);

      const { getContactById } = await import("@/actions/contacts");
      const result = await getContactById(CONTACT_ID);

      expect(result).toBeNull();
      expect(prisma.contact.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: CONTACT_ID,
            ownerId: USER_ID,
          }),
        })
      );
    });
  });

  // ==================== Conflict Errors ====================
  describe("Conflict Errors", () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    });

    it("createLabel throws error for duplicate label name", async () => {
      // Label with same name already exists
      vi.mocked(prisma.label.findFirst).mockResolvedValue({
        id: "existing-label",
        name: "Importante",
        color: "#FF0000",
        ownerId: USER_ID,
      } as any);

      const { createLabel } = await import("@/actions/labels");

      await expect(
        createLabel({ name: "Importante", color: "#00FF00" })
      ).rejects.toThrow();
    });
  });

  // ==================== Error Message Format ====================
  describe("Error Message Format", () => {
    it("error messages are in Portuguese", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const { getDealById } = await import("@/actions/deals");

      try {
        await getDealById(DEAL_ID);
        expect.fail("Should have thrown");
      } catch (error) {
        expect((error as Error).message).toBe("Não autorizado");
      }
    });
  });
});
