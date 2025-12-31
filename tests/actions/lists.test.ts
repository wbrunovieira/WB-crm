/**
 * Tests for List Actions
 * Phase 7: Auxiliary Actions - Lists
 *
 * Actions tested:
 * - getOrganizationsList (organizations-list.ts)
 * - getLeadsList (leads-list.ts)
 * - getLeadContactsList (leads-list.ts)
 * - getCompaniesList (companies-list.ts)
 *
 * Note: All list functions are user-scoped (filter by ownerId)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Valid CUID format for testing
const USER_ID_A = "clxxxxxxxxxxxxxxxxxxxxxxxxxua";
const USER_ID_B = "clxxxxxxxxxxxxxxxxxxxxxxxxxub";
const ORG_ID_1 = "clxxxxxxxxxxxxxxxxxxxxxxxxxo1";
const ORG_ID_2 = "clxxxxxxxxxxxxxxxxxxxxxxxxxo2";
const LEAD_ID_1 = "clxxxxxxxxxxxxxxxxxxxxxxxxxl1";
const LEAD_ID_2 = "clxxxxxxxxxxxxxxxxxxxxxxxxxl2";
const PARTNER_ID_1 = "clxxxxxxxxxxxxxxxxxxxxxxxxxp1";
const LEAD_CONTACT_ID_1 = "clxxxxxxxxxxxxxxxxxxxxxxxxxlc1";

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

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    organization: {
      findMany: vi.fn(),
    },
    lead: {
      findMany: vi.fn(),
    },
    leadContact: {
      findMany: vi.fn(),
    },
    partner: {
      findMany: vi.fn(),
    },
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { getOrganizationsList } from "@/actions/organizations-list";
import { getLeadsList, getLeadContactsList } from "@/actions/leads-list";
import { getCompaniesList } from "@/actions/companies-list";

describe("List Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== GET ORGANIZATIONS LIST ====================
  describe("getOrganizationsList", () => {
    it("should return empty array when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const result = await getOrganizationsList();

      expect(result).toEqual([]);
      expect(prisma.organization.findMany).not.toHaveBeenCalled();
    });

    it("should return organizations for authenticated user", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      const mockOrgs = [
        { id: ORG_ID_1, name: "Org A" },
        { id: ORG_ID_2, name: "Org B" },
      ];

      vi.mocked(prisma.organization.findMany).mockResolvedValue(mockOrgs as any);

      const result = await getOrganizationsList();

      expect(prisma.organization.findMany).toHaveBeenCalledWith({
        where: { ownerId: USER_ID_A },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });
      expect(result).toEqual(mockOrgs);
    });

    it("should filter by ownerId (data isolation)", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      vi.mocked(prisma.organization.findMany).mockResolvedValue([]);

      await getOrganizationsList();

      expect(prisma.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { ownerId: USER_ID_A },
        })
      );
    });

    it("should return empty array when user has no organizations", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      vi.mocked(prisma.organization.findMany).mockResolvedValue([]);

      const result = await getOrganizationsList();

      expect(result).toEqual([]);
    });
  });

  // ==================== GET LEADS LIST ====================
  describe("getLeadsList", () => {
    it("should return empty array when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const result = await getLeadsList();

      expect(result).toEqual([]);
      expect(prisma.lead.findMany).not.toHaveBeenCalled();
    });

    it("should return leads for authenticated user", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      const mockLeads = [
        { id: LEAD_ID_1, businessName: "Lead A" },
        { id: LEAD_ID_2, businessName: "Lead B" },
      ];

      vi.mocked(prisma.lead.findMany).mockResolvedValue(mockLeads as any);

      const result = await getLeadsList();

      expect(prisma.lead.findMany).toHaveBeenCalledWith({
        where: {
          ownerId: USER_ID_A,
          status: { not: "disqualified" },
        },
        select: { id: true, businessName: true },
        orderBy: { businessName: "asc" },
      });
      expect(result).toEqual(mockLeads);
    });

    it("should exclude disqualified leads", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      vi.mocked(prisma.lead.findMany).mockResolvedValue([]);

      await getLeadsList();

      expect(prisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { not: "disqualified" },
          }),
        })
      );
    });

    it("should filter by ownerId (data isolation)", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      vi.mocked(prisma.lead.findMany).mockResolvedValue([]);

      await getLeadsList();

      expect(prisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: USER_ID_A,
          }),
        })
      );
    });
  });

  // ==================== GET LEAD CONTACTS LIST ====================
  describe("getLeadContactsList", () => {
    it("should return empty array when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const result = await getLeadContactsList(LEAD_ID_1);

      expect(result).toEqual([]);
      expect(prisma.leadContact.findMany).not.toHaveBeenCalled();
    });

    it("should return lead contacts for a lead", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      const mockContacts = [
        { id: LEAD_CONTACT_ID_1, name: "Contact A", role: "CEO" },
      ];

      vi.mocked(prisma.leadContact.findMany).mockResolvedValue(mockContacts as any);

      const result = await getLeadContactsList(LEAD_ID_1);

      expect(prisma.leadContact.findMany).toHaveBeenCalledWith({
        where: {
          leadId: LEAD_ID_1,
          lead: { ownerId: USER_ID_A },
          convertedToContactId: null,
        },
        select: { id: true, name: true, role: true },
        orderBy: { name: "asc" },
      });
      expect(result).toEqual(mockContacts);
    });

    it("should filter by lead owner (data isolation)", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      vi.mocked(prisma.leadContact.findMany).mockResolvedValue([]);

      await getLeadContactsList(LEAD_ID_1);

      expect(prisma.leadContact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            lead: { ownerId: USER_ID_A },
          }),
        })
      );
    });

    it("should exclude converted contacts", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      vi.mocked(prisma.leadContact.findMany).mockResolvedValue([]);

      await getLeadContactsList(LEAD_ID_1);

      expect(prisma.leadContact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            convertedToContactId: null,
          }),
        })
      );
    });
  });

  // ==================== GET COMPANIES LIST ====================
  describe("getCompaniesList", () => {
    it("should return empty array when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const result = await getCompaniesList();

      expect(result).toEqual([]);
      expect(prisma.lead.findMany).not.toHaveBeenCalled();
      expect(prisma.organization.findMany).not.toHaveBeenCalled();
      expect(prisma.partner.findMany).not.toHaveBeenCalled();
    });

    it("should return combined list of leads, organizations, and partners", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      const mockLeads = [
        { id: LEAD_ID_1, businessName: "Lead Co", status: "new" },
      ];
      const mockOrgs = [
        { id: ORG_ID_1, name: "Org Co" },
      ];
      const mockPartners = [
        { id: PARTNER_ID_1, name: "Partner Co" },
      ];

      vi.mocked(prisma.lead.findMany).mockResolvedValue(mockLeads as any);
      vi.mocked(prisma.organization.findMany).mockResolvedValue(mockOrgs as any);
      vi.mocked(prisma.partner.findMany).mockResolvedValue(mockPartners as any);

      const result = await getCompaniesList();

      expect(result).toHaveLength(3);
      expect(result.some(c => c.type === "lead")).toBe(true);
      expect(result.some(c => c.type === "organization")).toBe(true);
      expect(result.some(c => c.type === "partner")).toBe(true);
    });

    it("should only include unconverted and non-disqualified leads", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      vi.mocked(prisma.lead.findMany).mockResolvedValue([]);
      vi.mocked(prisma.organization.findMany).mockResolvedValue([]);
      vi.mocked(prisma.partner.findMany).mockResolvedValue([]);

      await getCompaniesList();

      expect(prisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            convertedAt: null,
            status: { not: "disqualified" },
          }),
        })
      );
    });

    it("should filter all entities by ownerId", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      vi.mocked(prisma.lead.findMany).mockResolvedValue([]);
      vi.mocked(prisma.organization.findMany).mockResolvedValue([]);
      vi.mocked(prisma.partner.findMany).mockResolvedValue([]);

      await getCompaniesList();

      expect(prisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: USER_ID_A,
          }),
        })
      );
      expect(prisma.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { ownerId: USER_ID_A },
        })
      );
      expect(prisma.partner.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { ownerId: USER_ID_A },
        })
      );
    });

    it("should return companies sorted alphabetically", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      const mockLeads = [{ id: "l1", businessName: "Zebra Co", status: "new" }];
      const mockOrgs = [{ id: "o1", name: "Alpha Inc" }];
      const mockPartners = [{ id: "p1", name: "Beta LLC" }];

      vi.mocked(prisma.lead.findMany).mockResolvedValue(mockLeads as any);
      vi.mocked(prisma.organization.findMany).mockResolvedValue(mockOrgs as any);
      vi.mocked(prisma.partner.findMany).mockResolvedValue(mockPartners as any);

      const result = await getCompaniesList();

      expect(result[0].name).toBe("Alpha Inc");
      expect(result[1].name).toBe("Beta LLC");
      expect(result[2].name).toBe("Zebra Co");
    });

    it("should include lead status in result", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      const mockLeads = [{ id: LEAD_ID_1, businessName: "Lead Co", status: "qualified" }];
      vi.mocked(prisma.lead.findMany).mockResolvedValue(mockLeads as any);
      vi.mocked(prisma.organization.findMany).mockResolvedValue([]);
      vi.mocked(prisma.partner.findMany).mockResolvedValue([]);

      const result = await getCompaniesList();

      const lead = result.find(c => c.type === "lead");
      expect(lead?.status).toBe("qualified");
    });

    it("should map businessName to name for leads", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      const mockLeads = [{ id: LEAD_ID_1, businessName: "My Lead Business", status: "new" }];
      vi.mocked(prisma.lead.findMany).mockResolvedValue(mockLeads as any);
      vi.mocked(prisma.organization.findMany).mockResolvedValue([]);
      vi.mocked(prisma.partner.findMany).mockResolvedValue([]);

      const result = await getCompaniesList();

      expect(result[0].name).toBe("My Lead Business");
    });

    it("should return correct type for each entity", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      vi.mocked(prisma.lead.findMany).mockResolvedValue([
        { id: "l1", businessName: "Lead", status: "new" },
      ] as any);
      vi.mocked(prisma.organization.findMany).mockResolvedValue([
        { id: "o1", name: "Org" },
      ] as any);
      vi.mocked(prisma.partner.findMany).mockResolvedValue([
        { id: "p1", name: "Partner" },
      ] as any);

      const result = await getCompaniesList();

      const lead = result.find(c => c.id === "l1");
      const org = result.find(c => c.id === "o1");
      const partner = result.find(c => c.id === "p1");

      expect(lead?.type).toBe("lead");
      expect(org?.type).toBe("organization");
      expect(partner?.type).toBe("partner");
    });
  });

  // ==================== DATA ISOLATION ====================
  describe("Data Isolation", () => {
    it("getOrganizationsList should only return user's organizations", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      const userAOrgs = [{ id: ORG_ID_1, name: "User A Org" }];
      vi.mocked(prisma.organization.findMany).mockResolvedValue(userAOrgs as any);

      const result = await getOrganizationsList();

      expect(prisma.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { ownerId: USER_ID_A },
        })
      );
      expect(result.every(org => org.id === ORG_ID_1)).toBe(true);
    });

    it("getLeadsList should only return user's leads", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserB as any);

      const userBLeads = [{ id: LEAD_ID_2, businessName: "User B Lead" }];
      vi.mocked(prisma.lead.findMany).mockResolvedValue(userBLeads as any);

      const result = await getLeadsList();

      expect(prisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: USER_ID_B,
          }),
        })
      );
      expect(result.every(lead => lead.id === LEAD_ID_2)).toBe(true);
    });

    it("getLeadContactsList should verify lead ownership", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      vi.mocked(prisma.leadContact.findMany).mockResolvedValue([]);

      await getLeadContactsList(LEAD_ID_1);

      // Should filter by lead.ownerId
      expect(prisma.leadContact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            lead: { ownerId: USER_ID_A },
          }),
        })
      );
    });

    it("getCompaniesList should only return user's companies", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      vi.mocked(prisma.lead.findMany).mockResolvedValue([]);
      vi.mocked(prisma.organization.findMany).mockResolvedValue([]);
      vi.mocked(prisma.partner.findMany).mockResolvedValue([]);

      await getCompaniesList();

      // All three should filter by ownerId
      expect(prisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ ownerId: USER_ID_A }),
        })
      );
      expect(prisma.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ ownerId: USER_ID_A }),
        })
      );
      expect(prisma.partner.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ ownerId: USER_ID_A }),
        })
      );
    });
  });
});
