/**
 * Tests for Lead Contacts API Routes
 *
 * Routes tested:
 * - GET /api/leads/[id]/contacts
 * - POST /api/leads/[id]/contacts
 * - GET /api/leads/[id]/contacts/[contactId]
 * - PUT /api/leads/[id]/contacts/[contactId]
 * - DELETE /api/leads/[id]/contacts/[contactId]
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Valid CUID format for testing
const USER_ID_A = "clxxxxxxxxxxxxxxxxxxxxxxxxxua";
const LEAD_ID_1 = "clxxxxxxxxxxxxxxxxxxxxxxxxxl1";
const CONTACT_ID_1 = "clxxxxxxxxxxxxxxxxxxxxxxxxxc1";
const CONTACT_ID_2 = "clxxxxxxxxxxxxxxxxxxxxxxxxxc2";

// Mock sessions
const sessionUserA = {
  user: { id: USER_ID_A, email: "usera@test.com", name: "User A", role: "sdr" },
};

// Mock lead
const mockLead = {
  id: LEAD_ID_1,
  businessName: "Test Company",
  ownerId: USER_ID_A,
};

// Mock lead contact
const mockLeadContact = {
  id: CONTACT_ID_1,
  name: "John Doe",
  role: "CEO",
  email: "john@test.com",
  phone: "11999999999",
  whatsapp: "11999999999",
  isPrimary: true,
  leadId: LEAD_ID_1,
  convertedToContactId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
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
    lead: {
      findFirst: vi.fn(),
    },
    leadContact: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Mock lead contact schema
vi.mock("@/lib/validations/lead-contact", () => ({
  leadContactSchema: {
    parse: vi.fn((data) => data),
  },
  leadContactUpdateSchema: {
    parse: vi.fn((data) => data),
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/leads/[id]/contacts/route";
import {
  GET as GET_BY_ID,
  PUT,
  DELETE,
} from "@/app/api/leads/[id]/contacts/[contactId]/route";

describe("Lead Contacts API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== GET /api/leads/[id]/contacts ====================
  describe("GET /api/leads/[id]/contacts", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request(`http://localhost:3000/api/leads/${LEAD_ID_1}/contacts`);
      const response = await GET(request, { params: { id: LEAD_ID_1 } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Não autorizado");
    });

    it("should return 404 when lead not found", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.lead.findFirst).mockResolvedValue(null);

      const request = new Request(`http://localhost:3000/api/leads/${LEAD_ID_1}/contacts`);
      const response = await GET(request, { params: { id: LEAD_ID_1 } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Lead não encontrado");
    });

    it("should return contacts for lead", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.lead.findFirst).mockResolvedValue(mockLead as any);
      vi.mocked(prisma.leadContact.findMany).mockResolvedValue([mockLeadContact] as any);

      const request = new Request(`http://localhost:3000/api/leads/${LEAD_ID_1}/contacts`);
      const response = await GET(request, { params: { id: LEAD_ID_1 } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe("John Doe");
    });
  });

  // ==================== POST /api/leads/[id]/contacts ====================
  describe("POST /api/leads/[id]/contacts", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request(`http://localhost:3000/api/leads/${LEAD_ID_1}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Contact" }),
      });

      const response = await POST(request, { params: { id: LEAD_ID_1 } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Não autorizado");
    });

    it("should return 404 when lead not found", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.lead.findFirst).mockResolvedValue(null);

      const request = new Request(`http://localhost:3000/api/leads/${LEAD_ID_1}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Contact" }),
      });

      const response = await POST(request, { params: { id: LEAD_ID_1 } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Lead não encontrado");
    });

    it("should create a new contact", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.lead.findFirst).mockResolvedValue(mockLead as any);
      vi.mocked(prisma.leadContact.create).mockResolvedValue({
        ...mockLeadContact,
        id: CONTACT_ID_2,
        name: "New Contact",
      } as any);

      const request = new Request(`http://localhost:3000/api/leads/${LEAD_ID_1}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Contact", email: "new@test.com" }),
      });

      const response = await POST(request, { params: { id: LEAD_ID_1 } });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe("New Contact");
    });

    it("should remove primary from others when creating primary contact", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.lead.findFirst).mockResolvedValue(mockLead as any);
      vi.mocked(prisma.leadContact.updateMany).mockResolvedValue({ count: 1 });
      vi.mocked(prisma.leadContact.create).mockResolvedValue({
        ...mockLeadContact,
        id: CONTACT_ID_2,
        name: "Primary Contact",
      } as any);

      const request = new Request(`http://localhost:3000/api/leads/${LEAD_ID_1}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Primary Contact", isPrimary: true }),
      });

      const response = await POST(request, { params: { id: LEAD_ID_1 } });

      expect(response.status).toBe(201);
      expect(prisma.leadContact.updateMany).toHaveBeenCalledWith({
        where: { leadId: LEAD_ID_1 },
        data: { isPrimary: false },
      });
    });
  });

  // ==================== GET /api/leads/[id]/contacts/[contactId] ====================
  describe("GET /api/leads/[id]/contacts/[contactId]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request(
        `http://localhost:3000/api/leads/${LEAD_ID_1}/contacts/${CONTACT_ID_1}`
      );
      const response = await GET_BY_ID(request, {
        params: { id: LEAD_ID_1, contactId: CONTACT_ID_1 },
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Não autorizado");
    });

    it("should return contact by id", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.leadContact.findFirst).mockResolvedValue(mockLeadContact as any);

      const request = new Request(
        `http://localhost:3000/api/leads/${LEAD_ID_1}/contacts/${CONTACT_ID_1}`
      );
      const response = await GET_BY_ID(request, {
        params: { id: LEAD_ID_1, contactId: CONTACT_ID_1 },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(CONTACT_ID_1);
    });

    it("should return 404 if contact not found", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.leadContact.findFirst).mockResolvedValue(null);

      const request = new Request(
        `http://localhost:3000/api/leads/${LEAD_ID_1}/contacts/not-found`
      );
      const response = await GET_BY_ID(request, {
        params: { id: LEAD_ID_1, contactId: "not-found" },
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Contato não encontrado");
    });
  });

  // ==================== PUT /api/leads/[id]/contacts/[contactId] ====================
  describe("PUT /api/leads/[id]/contacts/[contactId]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request(
        `http://localhost:3000/api/leads/${LEAD_ID_1}/contacts/${CONTACT_ID_1}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Updated Name" }),
        }
      );
      const response = await PUT(request, {
        params: { id: LEAD_ID_1, contactId: CONTACT_ID_1 },
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Não autorizado");
    });

    it("should update a contact", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.leadContact.findFirst).mockResolvedValue(mockLeadContact as any);
      vi.mocked(prisma.leadContact.update).mockResolvedValue({
        ...mockLeadContact,
        name: "Updated Name",
      } as any);

      const request = new Request(
        `http://localhost:3000/api/leads/${LEAD_ID_1}/contacts/${CONTACT_ID_1}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Updated Name" }),
        }
      );
      const response = await PUT(request, {
        params: { id: LEAD_ID_1, contactId: CONTACT_ID_1 },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe("Updated Name");
    });

    it("should return 404 if contact not found", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.leadContact.findFirst).mockResolvedValue(null);

      const request = new Request(
        `http://localhost:3000/api/leads/${LEAD_ID_1}/contacts/not-found`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Test" }),
        }
      );
      const response = await PUT(request, {
        params: { id: LEAD_ID_1, contactId: "not-found" },
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Contato não encontrado");
    });
  });

  // ==================== DELETE /api/leads/[id]/contacts/[contactId] ====================
  describe("DELETE /api/leads/[id]/contacts/[contactId]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request(
        `http://localhost:3000/api/leads/${LEAD_ID_1}/contacts/${CONTACT_ID_1}`,
        { method: "DELETE" }
      );
      const response = await DELETE(request, {
        params: { id: LEAD_ID_1, contactId: CONTACT_ID_1 },
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Não autorizado");
    });

    it("should delete a contact", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.leadContact.findFirst).mockResolvedValue(mockLeadContact as any);
      vi.mocked(prisma.leadContact.delete).mockResolvedValue(mockLeadContact as any);

      const request = new Request(
        `http://localhost:3000/api/leads/${LEAD_ID_1}/contacts/${CONTACT_ID_1}`,
        { method: "DELETE" }
      );
      const response = await DELETE(request, {
        params: { id: LEAD_ID_1, contactId: CONTACT_ID_1 },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Contato excluído com sucesso");
    });

    it("should return 404 if contact not found", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.leadContact.findFirst).mockResolvedValue(null);

      const request = new Request(
        `http://localhost:3000/api/leads/${LEAD_ID_1}/contacts/not-found`,
        { method: "DELETE" }
      );
      const response = await DELETE(request, {
        params: { id: LEAD_ID_1, contactId: "not-found" },
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Contato não encontrado");
    });

    it("should return 409 if contact is already converted", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.leadContact.findFirst).mockResolvedValue({
        ...mockLeadContact,
        convertedToContactId: "converted-contact-123",
      } as any);

      const request = new Request(
        `http://localhost:3000/api/leads/${LEAD_ID_1}/contacts/${CONTACT_ID_1}`,
        { method: "DELETE" }
      );
      const response = await DELETE(request, {
        params: { id: LEAD_ID_1, contactId: CONTACT_ID_1 },
      });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe("Não é possível excluir um contato já convertido");
    });
  });

  // ==================== DATA ISOLATION ====================
  describe("Data Isolation", () => {
    it("should verify lead ownership before listing contacts", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.lead.findFirst).mockResolvedValue(null);

      const request = new Request(`http://localhost:3000/api/leads/${LEAD_ID_1}/contacts`);
      const response = await GET(request, { params: { id: LEAD_ID_1 } });

      expect(response.status).toBe(404);
      expect(prisma.lead.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: LEAD_ID_1,
            ownerId: USER_ID_A,
          }),
        })
      );
    });

    it("should verify lead ownership before creating contact", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.lead.findFirst).mockResolvedValue(null);

      const request = new Request(`http://localhost:3000/api/leads/${LEAD_ID_1}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Contact" }),
      });

      const response = await POST(request, { params: { id: LEAD_ID_1 } });

      expect(response.status).toBe(404);
      expect(prisma.leadContact.create).not.toHaveBeenCalled();
    });
  });
});
