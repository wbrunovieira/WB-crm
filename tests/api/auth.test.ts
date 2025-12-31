/**
 * Tests for Auth API Routes
 * Phase 8: API Routes - Auth
 *
 * Routes tested:
 * - POST /api/register
 *
 * Note: NextAuth routes are tested through authentication.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock bcryptjs - need to mock both default export and named export
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashedPassword123"),
  },
  hash: vi.fn().mockResolvedValue("hashedPassword123"),
}));

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/register/route";

describe("Auth API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== POST /api/register ====================
  describe("POST /api/register", () => {
    it("should register a new user successfully", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue({
        id: "user-1",
        name: "Test User",
        email: "test@example.com",
        password: "hashedPassword123",
        role: "sdr",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const request = new Request("http://localhost:3000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test User",
          email: "test@example.com",
          password: "password123",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.user).toHaveProperty("id");
      expect(data.user.name).toBe("Test User");
      expect(data.user.email).toBe("test@example.com");
      expect(data.user).not.toHaveProperty("password");
    });

    it("should return 400 when email already exists", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "existing-user",
        email: "test@example.com",
      } as any);

      const request = new Request("http://localhost:3000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test User",
          email: "test@example.com",
          password: "password123",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Usuário já existe com este email");
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it("should return 400 for invalid email", async () => {
      const request = new Request("http://localhost:3000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test User",
          email: "invalid-email",
          password: "password123",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Email inválido");
    });

    it("should return 400 for short password", async () => {
      const request = new Request("http://localhost:3000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test User",
          email: "test@example.com",
          password: "123",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Senha deve ter no mínimo 6 caracteres");
    });

    it("should return 400 for short name", async () => {
      const request = new Request("http://localhost:3000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "A",
          email: "test@example.com",
          password: "password123",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Nome deve ter no mínimo 2 caracteres");
    });

    it("should return 400 for missing required fields", async () => {
      const request = new Request("http://localhost:3000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "test@example.com",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("should hash password before storing", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue({
        id: "user-1",
        name: "Test User",
        email: "test@example.com",
        password: "hashedPassword123",
        role: "sdr",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const request = new Request("http://localhost:3000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test User",
          email: "test@example.com",
          password: "password123",
        }),
      });

      await POST(request);

      // Verify bcrypt.hash was called with the plain password
      expect(bcrypt.hash).toHaveBeenCalledWith("password123", 10);
      // Verify user was created
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it("should handle database errors gracefully", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockRejectedValue(new Error("Database error"));

      const request = new Request("http://localhost:3000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test User",
          email: "test@example.com",
          password: "password123",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Erro ao criar usuário");
    });
  });
});
