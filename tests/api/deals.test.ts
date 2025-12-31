/**
 * Tests for Deals API Routes
 * Phase 8: API Routes - Deals
 *
 * Routes tested:
 * - GET /api/deals
 * - POST /api/deals
 * - GET /api/deals/[id]
 * - PUT /api/deals/[id]
 * - DELETE /api/deals/[id]
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Valid CUID format for testing
const USER_ID_A = "clxxxxxxxxxxxxxxxxxxxxxxxxxua";
const USER_ID_B = "clxxxxxxxxxxxxxxxxxxxxxxxxxub";
const DEAL_ID_1 = "clxxxxxxxxxxxxxxxxxxxxxxxxxd1";
const DEAL_ID_2 = "clxxxxxxxxxxxxxxxxxxxxxxxxxd2";
const STAGE_ID = "clxxxxxxxxxxxxxxxxxxxxxxxxxs1";

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
    deal: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Mock deal schema
vi.mock("@/lib/validations/deal", () => ({
  dealSchema: {
    parse: vi.fn((data) => data),
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/deals/route";
import {
  GET as GET_BY_ID,
  PUT,
  DELETE,
} from "@/app/api/deals/[id]/route";

describe("Deals API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== GET /api/deals ====================
  describe("GET /api/deals", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/deals");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Não autorizado");
    });

    it("should return deals for authenticated user", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      const mockDeals = [
        { id: DEAL_ID_1, title: "Deal 1", ownerId: USER_ID_A },
        { id: DEAL_ID_2, title: "Deal 2", ownerId: USER_ID_A },
      ];

      vi.mocked(prisma.deal.findMany).mockResolvedValue(mockDeals as any);

      const request = new Request("http://localhost:3000/api/deals");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(2);
      expect(prisma.deal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: USER_ID_A,
          }),
        })
      );
    });

    it("should filter deals by search query", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.deal.findMany).mockResolvedValue([]);

      const request = new Request("http://localhost:3000/api/deals?search=test");
      await GET(request);

      expect(prisma.deal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: USER_ID_A,
            OR: expect.arrayContaining([
              { title: { contains: "test" } },
            ]),
          }),
        })
      );
    });

    it("should only return deals owned by authenticated user", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.deal.findMany).mockResolvedValue([]);

      const request = new Request("http://localhost:3000/api/deals");
      await GET(request);

      expect(prisma.deal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: USER_ID_A,
          }),
        })
      );
    });
  });

  // ==================== POST /api/deals ====================
  describe("POST /api/deals", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Deal", value: 1000, stageId: STAGE_ID }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Não autorizado");
    });

    it("should create a deal for authenticated user", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      const newDeal = {
        id: DEAL_ID_1,
        title: "New Deal",
        value: 1000,
        stageId: STAGE_ID,
        ownerId: USER_ID_A,
      };

      vi.mocked(prisma.deal.create).mockResolvedValue(newDeal as any);

      const request = new Request("http://localhost:3000/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Deal", value: 1000, stageId: STAGE_ID }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.title).toBe("New Deal");
      expect(prisma.deal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ownerId: USER_ID_A,
          }),
        })
      );
    });

    it("should set ownerId to authenticated user", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.deal.create).mockResolvedValue({ id: DEAL_ID_1 } as any);

      const request = new Request("http://localhost:3000/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Deal", value: 1000, stageId: STAGE_ID }),
      });

      await POST(request);

      expect(prisma.deal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ownerId: USER_ID_A,
          }),
        })
      );
    });
  });

  // ==================== GET /api/deals/[id] ====================
  describe("GET /api/deals/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request(`http://localhost:3000/api/deals/${DEAL_ID_1}`);
      const response = await GET_BY_ID(request, { params: { id: DEAL_ID_1 } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Não autorizado");
    });

    it("should return deal when user owns it", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      const deal = { id: DEAL_ID_1, title: "Deal 1", ownerId: USER_ID_A };
      vi.mocked(prisma.deal.findUnique).mockResolvedValue(deal as any);

      const request = new Request(`http://localhost:3000/api/deals/${DEAL_ID_1}`);
      const response = await GET_BY_ID(request, { params: { id: DEAL_ID_1 } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(DEAL_ID_1);
    });

    it("should return 404 when deal not found", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.deal.findUnique).mockResolvedValue(null);

      const request = new Request(`http://localhost:3000/api/deals/${DEAL_ID_1}`);
      const response = await GET_BY_ID(request, { params: { id: DEAL_ID_1 } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Negócio não encontrado");
    });

    it("should return 404 when deal belongs to another user", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      // findUnique with ownerId filter returns null for other user's deals
      vi.mocked(prisma.deal.findUnique).mockResolvedValue(null);

      const request = new Request(`http://localhost:3000/api/deals/${DEAL_ID_2}`);
      const response = await GET_BY_ID(request, { params: { id: DEAL_ID_2 } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Negócio não encontrado");
    });

    it("should filter by ownerId in query", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.deal.findUnique).mockResolvedValue(null);

      const request = new Request(`http://localhost:3000/api/deals/${DEAL_ID_1}`);
      await GET_BY_ID(request, { params: { id: DEAL_ID_1 } });

      expect(prisma.deal.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: DEAL_ID_1,
            ownerId: USER_ID_A,
          }),
        })
      );
    });
  });

  // ==================== PUT /api/deals/[id] ====================
  describe("PUT /api/deals/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request(`http://localhost:3000/api/deals/${DEAL_ID_1}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Updated Deal", value: 2000, stageId: STAGE_ID }),
      });

      const response = await PUT(request, { params: { id: DEAL_ID_1 } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Não autorizado");
    });

    it("should update deal when user owns it", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      const existingDeal = { id: DEAL_ID_1, title: "Deal 1", ownerId: USER_ID_A };
      vi.mocked(prisma.deal.findUnique).mockResolvedValue(existingDeal as any);

      const updatedDeal = { id: DEAL_ID_1, title: "Updated Deal", ownerId: USER_ID_A };
      vi.mocked(prisma.deal.update).mockResolvedValue(updatedDeal as any);

      const request = new Request(`http://localhost:3000/api/deals/${DEAL_ID_1}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Updated Deal", value: 2000, stageId: STAGE_ID }),
      });

      const response = await PUT(request, { params: { id: DEAL_ID_1 } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe("Updated Deal");
    });

    it("should return 404 when deal not found", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.deal.findUnique).mockResolvedValue(null);

      const request = new Request(`http://localhost:3000/api/deals/${DEAL_ID_1}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Updated Deal", value: 2000, stageId: STAGE_ID }),
      });

      const response = await PUT(request, { params: { id: DEAL_ID_1 } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Negócio não encontrado");
    });

    it("should return 404 when deal belongs to another user", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      // Deal exists but belongs to another user
      const otherUserDeal = { id: DEAL_ID_1, title: "Deal 1", ownerId: USER_ID_B };
      vi.mocked(prisma.deal.findUnique).mockResolvedValue(otherUserDeal as any);

      const request = new Request(`http://localhost:3000/api/deals/${DEAL_ID_1}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Updated Deal", value: 2000, stageId: STAGE_ID }),
      });

      const response = await PUT(request, { params: { id: DEAL_ID_1 } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Negócio não encontrado");
      expect(prisma.deal.update).not.toHaveBeenCalled();
    });
  });

  // ==================== DELETE /api/deals/[id] ====================
  describe("DELETE /api/deals/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request(`http://localhost:3000/api/deals/${DEAL_ID_1}`, {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: { id: DEAL_ID_1 } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Não autorizado");
    });

    it("should delete deal when user owns it", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      const existingDeal = { id: DEAL_ID_1, title: "Deal 1", ownerId: USER_ID_A };
      vi.mocked(prisma.deal.findUnique).mockResolvedValue(existingDeal as any);
      vi.mocked(prisma.deal.delete).mockResolvedValue(existingDeal as any);

      const request = new Request(`http://localhost:3000/api/deals/${DEAL_ID_1}`, {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: { id: DEAL_ID_1 } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(prisma.deal.delete).toHaveBeenCalledWith({
        where: { id: DEAL_ID_1 },
      });
    });

    it("should return 404 when deal not found", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.deal.findUnique).mockResolvedValue(null);

      const request = new Request(`http://localhost:3000/api/deals/${DEAL_ID_1}`, {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: { id: DEAL_ID_1 } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Negócio não encontrado");
      expect(prisma.deal.delete).not.toHaveBeenCalled();
    });

    it("should return 404 when deal belongs to another user", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      const otherUserDeal = { id: DEAL_ID_1, title: "Deal 1", ownerId: USER_ID_B };
      vi.mocked(prisma.deal.findUnique).mockResolvedValue(otherUserDeal as any);

      const request = new Request(`http://localhost:3000/api/deals/${DEAL_ID_1}`, {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: { id: DEAL_ID_1 } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Negócio não encontrado");
      expect(prisma.deal.delete).not.toHaveBeenCalled();
    });
  });

  // ==================== DATA ISOLATION ====================
  describe("Data Isolation", () => {
    it("GET should only return deals with ownerId filter", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.deal.findMany).mockResolvedValue([]);

      const request = new Request("http://localhost:3000/api/deals");
      await GET(request);

      expect(prisma.deal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: USER_ID_A,
          }),
        })
      );
    });

    it("GET by ID should include ownerId in where clause", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.deal.findUnique).mockResolvedValue(null);

      const request = new Request(`http://localhost:3000/api/deals/${DEAL_ID_1}`);
      await GET_BY_ID(request, { params: { id: DEAL_ID_1 } });

      expect(prisma.deal.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: USER_ID_A,
          }),
        })
      );
    });

    it("PUT should verify ownership before updating", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      const otherUserDeal = { id: DEAL_ID_1, ownerId: USER_ID_B };
      vi.mocked(prisma.deal.findUnique).mockResolvedValue(otherUserDeal as any);

      const request = new Request(`http://localhost:3000/api/deals/${DEAL_ID_1}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Hacked Deal", value: 1, stageId: STAGE_ID }),
      });

      const response = await PUT(request, { params: { id: DEAL_ID_1 } });

      expect(response.status).toBe(404);
      expect(prisma.deal.update).not.toHaveBeenCalled();
    });

    it("DELETE should verify ownership before deleting", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      const otherUserDeal = { id: DEAL_ID_1, ownerId: USER_ID_B };
      vi.mocked(prisma.deal.findUnique).mockResolvedValue(otherUserDeal as any);

      const request = new Request(`http://localhost:3000/api/deals/${DEAL_ID_1}`, {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: { id: DEAL_ID_1 } });

      expect(response.status).toBe(404);
      expect(prisma.deal.delete).not.toHaveBeenCalled();
    });
  });
});
