/**
 * Tests for Leads API Routes
 *
 * Routes tested:
 * - GET /api/leads
 * - POST /api/leads
 * - GET /api/leads/[id]
 * - PUT /api/leads/[id]
 * - DELETE /api/leads/[id]
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Valid CUID format for testing
const USER_ID_A = "clxxxxxxxxxxxxxxxxxxxxxxxxxua";
const USER_ID_B = "clxxxxxxxxxxxxxxxxxxxxxxxxxub";
const LEAD_ID_1 = "clxxxxxxxxxxxxxxxxxxxxxxxxxl1";
const LEAD_ID_2 = "clxxxxxxxxxxxxxxxxxxxxxxxxxl2";

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
    lead: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Mock lead schema
vi.mock("@/lib/validations/lead", () => ({
  leadSchema: {
    parse: vi.fn((data) => data),
  },
  leadUpdateSchema: {
    parse: vi.fn((data) => data),
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/leads/route";
import {
  GET as GET_BY_ID,
  PUT,
  DELETE,
} from "@/app/api/leads/[id]/route";

describe("Leads API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== GET /api/leads ====================
  describe("GET /api/leads", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/leads");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Não autorizado");
    });

    it("should return leads for authenticated user", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      const mockLeads = [
        { id: LEAD_ID_1, businessName: "Lead 1", ownerId: USER_ID_A },
        { id: LEAD_ID_2, businessName: "Lead 2", ownerId: USER_ID_A },
      ];

      vi.mocked(prisma.lead.findMany).mockResolvedValue(mockLeads as any);

      const request = new Request("http://localhost:3000/api/leads");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(2);
      expect(prisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: USER_ID_A,
          }),
        })
      );
    });

    it("should filter leads by search query", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.lead.findMany).mockResolvedValue([]);

      const request = new Request("http://localhost:3000/api/leads?search=test");
      await GET(request);

      expect(prisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: USER_ID_A,
            OR: expect.arrayContaining([
              { businessName: { contains: "test" } },
            ]),
          }),
        })
      );
    });

    it("should filter leads by status", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.lead.findMany).mockResolvedValue([]);

      const request = new Request("http://localhost:3000/api/leads?status=new");
      await GET(request);

      expect(prisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: USER_ID_A,
            status: "new",
          }),
        })
      );
    });

    it("should only return leads owned by authenticated user", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.lead.findMany).mockResolvedValue([]);

      const request = new Request("http://localhost:3000/api/leads");
      await GET(request);

      expect(prisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: USER_ID_A,
          }),
        })
      );
    });
  });

  // ==================== POST /api/leads ====================
  describe("POST /api/leads", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName: "New Lead" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Não autorizado");
    });

    it("should create a lead for authenticated user", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      const newLead = {
        id: LEAD_ID_1,
        businessName: "New Lead",
        ownerId: USER_ID_A,
      };

      vi.mocked(prisma.lead.create).mockResolvedValue(newLead as any);

      const request = new Request("http://localhost:3000/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName: "New Lead" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.businessName).toBe("New Lead");
      expect(prisma.lead.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ownerId: USER_ID_A,
          }),
        })
      );
    });

    it("should set ownerId to authenticated user", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.lead.create).mockResolvedValue({ id: LEAD_ID_1 } as any);

      const request = new Request("http://localhost:3000/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName: "New Lead" }),
      });

      await POST(request);

      expect(prisma.lead.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ownerId: USER_ID_A,
          }),
        })
      );
    });
  });

  // ==================== GET /api/leads/[id] ====================
  describe("GET /api/leads/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request(`http://localhost:3000/api/leads/${LEAD_ID_1}`);
      const response = await GET_BY_ID(request, { params: { id: LEAD_ID_1 } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Não autorizado");
    });

    it("should return lead when user owns it", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      const lead = { id: LEAD_ID_1, businessName: "Lead 1", ownerId: USER_ID_A };
      vi.mocked(prisma.lead.findFirst).mockResolvedValue(lead as any);

      const request = new Request(`http://localhost:3000/api/leads/${LEAD_ID_1}`);
      const response = await GET_BY_ID(request, { params: { id: LEAD_ID_1 } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(LEAD_ID_1);
    });

    it("should return 404 when lead not found", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.lead.findFirst).mockResolvedValue(null);

      const request = new Request(`http://localhost:3000/api/leads/${LEAD_ID_1}`);
      const response = await GET_BY_ID(request, { params: { id: LEAD_ID_1 } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Lead não encontrado");
    });

    it("should filter by ownerId in query", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.lead.findFirst).mockResolvedValue(null);

      const request = new Request(`http://localhost:3000/api/leads/${LEAD_ID_1}`);
      await GET_BY_ID(request, { params: { id: LEAD_ID_1 } });

      expect(prisma.lead.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: LEAD_ID_1,
            ownerId: USER_ID_A,
          }),
        })
      );
    });
  });

  // ==================== PUT /api/leads/[id] ====================
  describe("PUT /api/leads/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request(`http://localhost:3000/api/leads/${LEAD_ID_1}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName: "Updated Lead" }),
      });

      const response = await PUT(request, { params: { id: LEAD_ID_1 } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Não autorizado");
    });

    it("should update lead when user owns it", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      const existingLead = { id: LEAD_ID_1, businessName: "Lead 1", ownerId: USER_ID_A };
      vi.mocked(prisma.lead.findFirst).mockResolvedValue(existingLead as any);

      const updatedLead = { id: LEAD_ID_1, businessName: "Updated Lead", ownerId: USER_ID_A };
      vi.mocked(prisma.lead.update).mockResolvedValue(updatedLead as any);

      const request = new Request(`http://localhost:3000/api/leads/${LEAD_ID_1}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName: "Updated Lead" }),
      });

      const response = await PUT(request, { params: { id: LEAD_ID_1 } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.businessName).toBe("Updated Lead");
    });

    it("should return 404 when lead not found", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.lead.findFirst).mockResolvedValue(null);

      const request = new Request(`http://localhost:3000/api/leads/${LEAD_ID_1}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName: "Updated Lead" }),
      });

      const response = await PUT(request, { params: { id: LEAD_ID_1 } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Lead não encontrado");
    });

    it("should return 404 when lead belongs to another user", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      // Lead exists but belongs to another user - findFirst with ownerId filter returns null
      vi.mocked(prisma.lead.findFirst).mockResolvedValue(null);

      const request = new Request(`http://localhost:3000/api/leads/${LEAD_ID_1}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName: "Updated Lead" }),
      });

      const response = await PUT(request, { params: { id: LEAD_ID_1 } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Lead não encontrado");
      expect(prisma.lead.update).not.toHaveBeenCalled();
    });
  });

  // ==================== DELETE /api/leads/[id] ====================
  describe("DELETE /api/leads/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request(`http://localhost:3000/api/leads/${LEAD_ID_1}`, {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: { id: LEAD_ID_1 } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Não autorizado");
    });

    it("should delete lead when user owns it", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      const existingLead = { id: LEAD_ID_1, businessName: "Lead 1", ownerId: USER_ID_A, convertedAt: null };
      vi.mocked(prisma.lead.findFirst).mockResolvedValue(existingLead as any);
      vi.mocked(prisma.lead.delete).mockResolvedValue(existingLead as any);

      const request = new Request(`http://localhost:3000/api/leads/${LEAD_ID_1}`, {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: { id: LEAD_ID_1 } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Lead excluído com sucesso");
      expect(prisma.lead.delete).toHaveBeenCalledWith({
        where: { id: LEAD_ID_1 },
      });
    });

    it("should return 404 when lead not found", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.lead.findFirst).mockResolvedValue(null);

      const request = new Request(`http://localhost:3000/api/leads/${LEAD_ID_1}`, {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: { id: LEAD_ID_1 } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Lead não encontrado");
      expect(prisma.lead.delete).not.toHaveBeenCalled();
    });

    it("should return 409 when lead is already converted", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      const convertedLead = { id: LEAD_ID_1, businessName: "Lead 1", ownerId: USER_ID_A, convertedAt: new Date() };
      vi.mocked(prisma.lead.findFirst).mockResolvedValue(convertedLead as any);

      const request = new Request(`http://localhost:3000/api/leads/${LEAD_ID_1}`, {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: { id: LEAD_ID_1 } });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe("Não é possível excluir um lead já convertido");
      expect(prisma.lead.delete).not.toHaveBeenCalled();
    });
  });

  // ==================== DATA ISOLATION ====================
  describe("Data Isolation", () => {
    it("GET should only return leads with ownerId filter", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.lead.findMany).mockResolvedValue([]);

      const request = new Request("http://localhost:3000/api/leads");
      await GET(request);

      expect(prisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: USER_ID_A,
          }),
        })
      );
    });

    it("GET by ID should include ownerId in where clause", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.lead.findFirst).mockResolvedValue(null);

      const request = new Request(`http://localhost:3000/api/leads/${LEAD_ID_1}`);
      await GET_BY_ID(request, { params: { id: LEAD_ID_1 } });

      expect(prisma.lead.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: USER_ID_A,
          }),
        })
      );
    });

    it("PUT should verify ownership before updating", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      // findFirst with ownerId filter returns null for other user's leads
      vi.mocked(prisma.lead.findFirst).mockResolvedValue(null);

      const request = new Request(`http://localhost:3000/api/leads/${LEAD_ID_1}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName: "Hacked Lead" }),
      });

      const response = await PUT(request, { params: { id: LEAD_ID_1 } });

      expect(response.status).toBe(404);
      expect(prisma.lead.update).not.toHaveBeenCalled();
    });

    it("DELETE should verify ownership before deleting", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      // findFirst with ownerId filter returns null for other user's leads
      vi.mocked(prisma.lead.findFirst).mockResolvedValue(null);

      const request = new Request(`http://localhost:3000/api/leads/${LEAD_ID_1}`, {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: { id: LEAD_ID_1 } });

      expect(response.status).toBe(404);
      expect(prisma.lead.delete).not.toHaveBeenCalled();
    });
  });
});
