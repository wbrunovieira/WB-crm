/**
 * Tests for Error Handling in API Routes
 * Phase 9: Architecture Improvements - API Error Responses
 *
 * Verifies that API routes return proper error responses with:
 * - Correct HTTP status codes
 * - JSON error bodies
 * - Portuguese error messages
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Valid CUID format for testing
const USER_ID = "clxxxxxxxxxxxxxxxxxxxxxxxxxu1";
const DEAL_ID = "clxxxxxxxxxxxxxxxxxxxxxxxxxd1";
const STAGE_ID = "clxxxxxxxxxxxxxxxxxxxxxxxxxs1";

const mockSession = {
  user: { id: USER_ID, email: "test@example.com", name: "Test User", role: "sdr" },
};

// Mock next-auth
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    deal: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
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
import {
  GET as GET_DEAL,
  PUT as PUT_DEAL,
  DELETE as DELETE_DEAL,
} from "@/app/api/deals/[id]/route";
import {
  GET as GET_DEALS,
  POST as POST_DEAL,
} from "@/app/api/deals/route";

describe("API Error Responses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== 401 Unauthorized ====================
  describe("401 Unauthorized", () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(null);
    });

    it("GET /api/deals returns 401 when not authenticated", async () => {
      const request = new Request("http://localhost:3000/api/deals");

      const response = await GET_DEALS(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBe("Não autorizado");
    });

    it("POST /api/deals returns 401 when not authenticated", async () => {
      const request = new Request("http://localhost:3000/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Test", value: 1000, stageId: STAGE_ID }),
      });

      const response = await POST_DEAL(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBe("Não autorizado");
    });

    it("GET /api/deals/[id] returns 401 when not authenticated", async () => {
      const request = new Request(`http://localhost:3000/api/deals/${DEAL_ID}`);

      const response = await GET_DEAL(request, { params: { id: DEAL_ID } });
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBe("Não autorizado");
    });

    it("PUT /api/deals/[id] returns 401 when not authenticated", async () => {
      const request = new Request(`http://localhost:3000/api/deals/${DEAL_ID}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Updated" }),
      });

      const response = await PUT_DEAL(request, { params: { id: DEAL_ID } });
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBe("Não autorizado");
    });

    it("DELETE /api/deals/[id] returns 401 when not authenticated", async () => {
      const request = new Request(`http://localhost:3000/api/deals/${DEAL_ID}`, {
        method: "DELETE",
      });

      const response = await DELETE_DEAL(request, { params: { id: DEAL_ID } });
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBe("Não autorizado");
    });
  });

  // ==================== 404 Not Found ====================
  describe("404 Not Found", () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      // Mock findUnique to return null (deal not found)
      vi.mocked(prisma.deal.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.deal.findFirst).mockResolvedValue(null);
    });

    it("GET /api/deals/[id] returns 404 for non-existent deal", async () => {
      const request = new Request(`http://localhost:3000/api/deals/${DEAL_ID}`);

      const response = await GET_DEAL(request, { params: { id: DEAL_ID } });
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error).toBe("Negócio não encontrado");
    });

    it("PUT /api/deals/[id] returns 404 for non-existent deal", async () => {
      // Implementation checks existence with findUnique first
      vi.mocked(prisma.deal.findUnique).mockResolvedValue(null);

      const request = new Request(`http://localhost:3000/api/deals/${DEAL_ID}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Updated", value: 1000, stageId: STAGE_ID }),
      });

      const response = await PUT_DEAL(request, { params: { id: DEAL_ID } });
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error).toBe("Negócio não encontrado");
    });

    it("DELETE /api/deals/[id] returns 404 for non-existent deal", async () => {
      // Implementation checks existence with findUnique first
      vi.mocked(prisma.deal.findUnique).mockResolvedValue(null);

      const request = new Request(`http://localhost:3000/api/deals/${DEAL_ID}`, {
        method: "DELETE",
      });

      const response = await DELETE_DEAL(request, { params: { id: DEAL_ID } });
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error).toBe("Negócio não encontrado");
    });
  });

  // ==================== Data Isolation ====================
  describe("Data Isolation", () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      // When filtering by ownerId, other user's records return null
      vi.mocked(prisma.deal.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.deal.findFirst).mockResolvedValue(null);
    });

    it("GET /api/deals/[id] returns 404 for deal owned by another user", async () => {
      // The API uses findUnique with ownerId filter, so other user's deals
      // appear as "not found" rather than "forbidden" for security
      const request = new Request(`http://localhost:3000/api/deals/${DEAL_ID}`);

      const response = await GET_DEAL(request, { params: { id: DEAL_ID } });
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error).toBe("Negócio não encontrado");
    });
  });

  // ==================== Error Response Format ====================
  describe("Error Response Format", () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(null);
    });

    it("error response includes error field", async () => {
      const request = new Request("http://localhost:3000/api/deals");

      const response = await GET_DEALS(request);
      const body = await response.json();

      expect(body).toHaveProperty("error");
      expect(typeof body.error).toBe("string");
    });

    it("error messages are in Portuguese", async () => {
      const request = new Request("http://localhost:3000/api/deals");

      const response = await GET_DEALS(request);
      const body = await response.json();

      // Should be Portuguese message
      expect(body.error).toBe("Não autorizado");
    });
  });

  // ==================== 500 Internal Server Error ====================
  describe("500 Internal Server Error", () => {
    const originalEnv = process.env.NODE_ENV;
    const env = process.env as { NODE_ENV?: string };

    afterEach(() => {
      env.NODE_ENV = originalEnv;
    });

    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    });

    it("returns 500 on database error", async () => {
      vi.mocked(prisma.deal.findMany).mockRejectedValue(
        new Error("Database connection failed")
      );

      const request = new Request("http://localhost:3000/api/deals");

      const response = await GET_DEALS(request);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBeDefined();
    });

    it("hides internal error details in production", async () => {
      env.NODE_ENV = "production";
      vi.mocked(prisma.deal.findMany).mockRejectedValue(
        new Error("SECRET: Database credentials exposed")
      );

      const request = new Request("http://localhost:3000/api/deals");

      const response = await GET_DEALS(request);
      const body = await response.json();

      expect(response.status).toBe(500);
      // In production, should show generic message
      expect(body.error).toBe("Erro interno do servidor");
      expect(JSON.stringify(body)).not.toContain("SECRET");
    });
  });
});
