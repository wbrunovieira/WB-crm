/**
 * Tests for Contacts API Routes
 * Phase 8: API Routes - Contacts
 *
 * Routes tested:
 * - GET /api/contacts
 * - POST /api/contacts
 * - GET /api/contacts/[id]
 * - PUT /api/contacts/[id]
 * - DELETE /api/contacts/[id]
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Valid CUID format for testing
const USER_ID_A = "clxxxxxxxxxxxxxxxxxxxxxxxxxua";
const USER_ID_B = "clxxxxxxxxxxxxxxxxxxxxxxxxxub";
const CONTACT_ID_1 = "clxxxxxxxxxxxxxxxxxxxxxxxxxc1";
const CONTACT_ID_2 = "clxxxxxxxxxxxxxxxxxxxxxxxxxc2";
const ORG_ID = "clxxxxxxxxxxxxxxxxxxxxxxxxxor1";

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

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    contact: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Mock contact schema
vi.mock("@/lib/validations/contact", () => ({
  contactSchema: {
    parse: vi.fn((data) => data),
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/contacts/route";
import {
  GET as GET_BY_ID,
  PUT,
  DELETE,
} from "@/app/api/contacts/[id]/route";

describe("Contacts API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== GET /api/contacts ====================
  describe("GET /api/contacts", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/contacts");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Não autorizado");
    });

    it("should return contacts for authenticated user", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      const mockContacts = [
        { id: CONTACT_ID_1, name: "Contact 1", ownerId: USER_ID_A },
        { id: CONTACT_ID_2, name: "Contact 2", ownerId: USER_ID_A },
      ];

      vi.mocked(prisma.contact.findMany).mockResolvedValue(mockContacts as any);

      const request = new Request("http://localhost:3000/api/contacts");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(2);
      expect(prisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: USER_ID_A,
          }),
        })
      );
    });

    it("should filter contacts by search query", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.contact.findMany).mockResolvedValue([]);

      const request = new Request("http://localhost:3000/api/contacts?search=test");
      await GET(request);

      expect(prisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: USER_ID_A,
            OR: expect.arrayContaining([
              { name: { contains: "test" } },
              { email: { contains: "test" } },
            ]),
          }),
        })
      );
    });
  });

  // ==================== POST /api/contacts ====================
  describe("POST /api/contacts", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Contact" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Não autorizado");
    });

    it("should create a contact for authenticated user", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      const newContact = {
        id: CONTACT_ID_1,
        name: "New Contact",
        email: "contact@test.com",
        ownerId: USER_ID_A,
      };

      vi.mocked(prisma.contact.create).mockResolvedValue(newContact as any);

      const request = new Request("http://localhost:3000/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Contact", email: "contact@test.com" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe("New Contact");
      expect(prisma.contact.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ownerId: USER_ID_A,
          }),
        })
      );
    });

    it("should create contact with organization link", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      vi.mocked(prisma.contact.create).mockResolvedValue({
        id: CONTACT_ID_1,
        name: "Contact with Org",
        organizationId: ORG_ID,
        ownerId: USER_ID_A,
      } as any);

      const request = new Request("http://localhost:3000/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Contact with Org",
          companyId: ORG_ID,
          companyType: "organization",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(prisma.contact.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: ORG_ID,
          }),
        })
      );
    });
  });

  // ==================== GET /api/contacts/[id] ====================
  describe("GET /api/contacts/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request(`http://localhost:3000/api/contacts/${CONTACT_ID_1}`);
      const response = await GET_BY_ID(request, { params: { id: CONTACT_ID_1 } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Não autorizado");
    });

    it("should return contact when user owns it", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      const contact = { id: CONTACT_ID_1, name: "Contact 1", ownerId: USER_ID_A };
      vi.mocked(prisma.contact.findFirst).mockResolvedValue(contact as any);

      const request = new Request(`http://localhost:3000/api/contacts/${CONTACT_ID_1}`);
      const response = await GET_BY_ID(request, { params: { id: CONTACT_ID_1 } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(CONTACT_ID_1);
    });

    it("should return 404 when contact not found", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.contact.findFirst).mockResolvedValue(null);

      const request = new Request(`http://localhost:3000/api/contacts/${CONTACT_ID_1}`);
      const response = await GET_BY_ID(request, { params: { id: CONTACT_ID_1 } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Contato não encontrado");
    });

    it("should filter by ownerId in query", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.contact.findFirst).mockResolvedValue(null);

      const request = new Request(`http://localhost:3000/api/contacts/${CONTACT_ID_1}`);
      await GET_BY_ID(request, { params: { id: CONTACT_ID_1 } });

      expect(prisma.contact.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: CONTACT_ID_1,
            ownerId: USER_ID_A,
          }),
        })
      );
    });
  });

  // ==================== PUT /api/contacts/[id] ====================
  describe("PUT /api/contacts/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request(`http://localhost:3000/api/contacts/${CONTACT_ID_1}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Contact" }),
      });

      const response = await PUT(request, { params: { id: CONTACT_ID_1 } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Não autorizado");
    });

    it("should update contact when user owns it", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      const updatedContact = { id: CONTACT_ID_1, name: "Updated Contact", ownerId: USER_ID_A };
      vi.mocked(prisma.contact.update).mockResolvedValue(updatedContact as any);

      const request = new Request(`http://localhost:3000/api/contacts/${CONTACT_ID_1}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Contact" }),
      });

      const response = await PUT(request, { params: { id: CONTACT_ID_1 } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe("Updated Contact");
    });

    it("should include ownerId in update where clause", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.contact.update).mockResolvedValue({ id: CONTACT_ID_1 } as any);

      const request = new Request(`http://localhost:3000/api/contacts/${CONTACT_ID_1}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Contact" }),
      });

      await PUT(request, { params: { id: CONTACT_ID_1 } });

      expect(prisma.contact.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: CONTACT_ID_1,
            ownerId: USER_ID_A,
          }),
        })
      );
    });
  });

  // ==================== DELETE /api/contacts/[id] ====================
  describe("DELETE /api/contacts/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request(`http://localhost:3000/api/contacts/${CONTACT_ID_1}`, {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: { id: CONTACT_ID_1 } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Não autorizado");
    });

    it("should delete contact when user owns it", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.contact.delete).mockResolvedValue({ id: CONTACT_ID_1 } as any);

      const request = new Request(`http://localhost:3000/api/contacts/${CONTACT_ID_1}`, {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: { id: CONTACT_ID_1 } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Contato excluído com sucesso");
    });

    it("should include ownerId in delete where clause", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.contact.delete).mockResolvedValue({ id: CONTACT_ID_1 } as any);

      const request = new Request(`http://localhost:3000/api/contacts/${CONTACT_ID_1}`, {
        method: "DELETE",
      });

      await DELETE(request, { params: { id: CONTACT_ID_1 } });

      expect(prisma.contact.delete).toHaveBeenCalledWith({
        where: {
          id: CONTACT_ID_1,
          ownerId: USER_ID_A,
        },
      });
    });
  });

  // ==================== DATA ISOLATION ====================
  describe("Data Isolation", () => {
    it("GET should only return contacts with ownerId filter", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.contact.findMany).mockResolvedValue([]);

      const request = new Request("http://localhost:3000/api/contacts");
      await GET(request);

      expect(prisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: USER_ID_A,
          }),
        })
      );
    });

    it("POST should set ownerId to authenticated user", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.contact.create).mockResolvedValue({ id: CONTACT_ID_1 } as any);

      const request = new Request("http://localhost:3000/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test Contact" }),
      });

      await POST(request);

      expect(prisma.contact.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ownerId: USER_ID_A,
          }),
        })
      );
    });

    it("GET by ID should include ownerId in where clause", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.contact.findFirst).mockResolvedValue(null);

      const request = new Request(`http://localhost:3000/api/contacts/${CONTACT_ID_1}`);
      await GET_BY_ID(request, { params: { id: CONTACT_ID_1 } });

      expect(prisma.contact.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: USER_ID_A,
          }),
        })
      );
    });

    it("PUT should include ownerId in where clause", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.contact.update).mockResolvedValue({ id: CONTACT_ID_1 } as any);

      const request = new Request(`http://localhost:3000/api/contacts/${CONTACT_ID_1}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated" }),
      });

      await PUT(request, { params: { id: CONTACT_ID_1 } });

      expect(prisma.contact.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: USER_ID_A,
          }),
        })
      );
    });

    it("DELETE should include ownerId in where clause", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.contact.delete).mockResolvedValue({ id: CONTACT_ID_1 } as any);

      const request = new Request(`http://localhost:3000/api/contacts/${CONTACT_ID_1}`, {
        method: "DELETE",
      });

      await DELETE(request, { params: { id: CONTACT_ID_1 } });

      expect(prisma.contact.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: USER_ID_A,
          }),
        })
      );
    });
  });
});
