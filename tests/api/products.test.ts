/**
 * Tests for Products API Routes
 * Phase 8: API Routes - Products
 *
 * Routes tested:
 * - GET /api/products/active
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Valid CUID format for testing
const USER_ID_A = "clxxxxxxxxxxxxxxxxxxxxxxxxxua";
const PRODUCT_ID_1 = "clxxxxxxxxxxxxxxxxxxxxxxxxxp1";
const PRODUCT_ID_2 = "clxxxxxxxxxxxxxxxxxxxxxxxxxp2";

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

// Mock getActiveProducts action
vi.mock("@/actions/products", () => ({
  getActiveProducts: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { getActiveProducts } from "@/actions/products";
import { GET } from "@/app/api/products/active/route";

describe("Products API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== GET /api/products/active ====================
  describe("GET /api/products/active", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Não autorizado");
    });

    it("should return active products for authenticated user", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      const mockProducts = [
        { id: PRODUCT_ID_1, name: "Product 1", active: true },
        { id: PRODUCT_ID_2, name: "Product 2", active: true },
      ];

      vi.mocked(getActiveProducts).mockResolvedValue(mockProducts as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(2);
      expect(getActiveProducts).toHaveBeenCalled();
    });

    it("should return empty array when no active products", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(getActiveProducts).mockResolvedValue([]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
    });

    it("should call getActiveProducts action", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(getActiveProducts).mockResolvedValue([]);

      await GET();

      expect(getActiveProducts).toHaveBeenCalledTimes(1);
    });

    it("should return 500 on error", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(getActiveProducts).mockRejectedValue(new Error("Database error"));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Erro ao buscar produtos");
    });
  });

  // ==================== AUTHENTICATION ====================
  describe("Authentication", () => {
    it("should require authentication for products endpoint", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const response = await GET();

      expect(response.status).toBe(401);
      expect(getActiveProducts).not.toHaveBeenCalled();
    });

    it("should call getActiveProducts only when authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(getActiveProducts).mockResolvedValue([]);

      await GET();

      expect(getActiveProducts).toHaveBeenCalled();
    });
  });
});
