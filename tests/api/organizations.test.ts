/**
 * Tests for Organizations API Routes
 * Phase 8: API Routes - Organizations
 *
 * Routes tested:
 * - GET /api/organizations
 * - POST /api/organizations
 * - GET /api/organizations/[id]
 * - PUT /api/organizations/[id]
 * - DELETE /api/organizations/[id]
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Valid CUID format for testing
const USER_ID_A = "clxxxxxxxxxxxxxxxxxxxxxxxxxua";
const USER_ID_B = "clxxxxxxxxxxxxxxxxxxxxxxxxxub";
const ORG_ID_1 = "clxxxxxxxxxxxxxxxxxxxxxxxxxo1";
const ORG_ID_2 = "clxxxxxxxxxxxxxxxxxxxxxxxxxo2";

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
    organization: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Mock organization schema
vi.mock("@/lib/validations/organization", () => ({
  organizationSchema: {
    parse: vi.fn((data) => data),
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/organizations/route";
import {
  GET as GET_BY_ID,
  PUT,
  DELETE,
} from "@/app/api/organizations/[id]/route";

describe("Organizations API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== GET /api/organizations ====================
  describe("GET /api/organizations", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/organizations");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Não autorizado");
    });

    it("should return organizations for authenticated user", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      const mockOrgs = [
        { id: ORG_ID_1, name: "Org 1", ownerId: USER_ID_A },
        { id: ORG_ID_2, name: "Org 2", ownerId: USER_ID_A },
      ];

      vi.mocked(prisma.organization.findMany).mockResolvedValue(mockOrgs as any);

      const request = new Request("http://localhost:3000/api/organizations");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(2);
      expect(prisma.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: USER_ID_A,
          }),
        })
      );
    });

    it("should filter organizations by search query", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.organization.findMany).mockResolvedValue([]);

      const request = new Request("http://localhost:3000/api/organizations?search=test");
      await GET(request);

      expect(prisma.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: USER_ID_A,
            OR: expect.arrayContaining([
              { name: { contains: "test" } },
              { website: { contains: "test" } },
            ]),
          }),
        })
      );
    });
  });

  // ==================== POST /api/organizations ====================
  describe("POST /api/organizations", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Organization" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Não autorizado");
    });

    it("should create an organization for authenticated user", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      const newOrg = {
        id: ORG_ID_1,
        name: "New Organization",
        ownerId: USER_ID_A,
      };

      vi.mocked(prisma.organization.create).mockResolvedValue(newOrg as any);

      const request = new Request("http://localhost:3000/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Organization" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe("New Organization");
      expect(prisma.organization.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ownerId: USER_ID_A,
          }),
        })
      );
    });

    it("should create organization with all fields", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      const fullOrg = {
        id: ORG_ID_1,
        name: "Full Organization",
        legalName: "Full Org LTDA",
        website: "https://example.com",
        phone: "+55 11 99999-9999",
        country: "BR",
        state: "SP",
        city: "São Paulo",
        industry: "Technology",
        ownerId: USER_ID_A,
      };

      vi.mocked(prisma.organization.create).mockResolvedValue(fullOrg as any);

      const request = new Request("http://localhost:3000/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Full Organization",
          legalName: "Full Org LTDA",
          website: "https://example.com",
          phone: "+55 11 99999-9999",
          country: "BR",
          state: "SP",
          city: "São Paulo",
          industry: "Technology",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
    });
  });

  // ==================== GET /api/organizations/[id] ====================
  describe("GET /api/organizations/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request(`http://localhost:3000/api/organizations/${ORG_ID_1}`);
      const response = await GET_BY_ID(request, { params: { id: ORG_ID_1 } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Não autorizado");
    });

    it("should return organization when user owns it", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      const org = { id: ORG_ID_1, name: "Org 1", ownerId: USER_ID_A };
      vi.mocked(prisma.organization.findFirst).mockResolvedValue(org as any);

      const request = new Request(`http://localhost:3000/api/organizations/${ORG_ID_1}`);
      const response = await GET_BY_ID(request, { params: { id: ORG_ID_1 } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(ORG_ID_1);
    });

    it("should return 404 when organization not found", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.organization.findFirst).mockResolvedValue(null);

      const request = new Request(`http://localhost:3000/api/organizations/${ORG_ID_1}`);
      const response = await GET_BY_ID(request, { params: { id: ORG_ID_1 } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Organização não encontrada");
    });

    it("should filter by ownerId in query", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.organization.findFirst).mockResolvedValue(null);

      const request = new Request(`http://localhost:3000/api/organizations/${ORG_ID_1}`);
      await GET_BY_ID(request, { params: { id: ORG_ID_1 } });

      expect(prisma.organization.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: ORG_ID_1,
            ownerId: USER_ID_A,
          }),
        })
      );
    });
  });

  // ==================== PUT /api/organizations/[id] ====================
  describe("PUT /api/organizations/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request(`http://localhost:3000/api/organizations/${ORG_ID_1}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Organization" }),
      });

      const response = await PUT(request, { params: { id: ORG_ID_1 } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Não autorizado");
    });

    it("should update organization when user owns it", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      const updatedOrg = { id: ORG_ID_1, name: "Updated Organization", ownerId: USER_ID_A };
      vi.mocked(prisma.organization.update).mockResolvedValue(updatedOrg as any);

      const request = new Request(`http://localhost:3000/api/organizations/${ORG_ID_1}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Organization" }),
      });

      const response = await PUT(request, { params: { id: ORG_ID_1 } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe("Updated Organization");
    });

    it("should include ownerId in update where clause", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.organization.update).mockResolvedValue({ id: ORG_ID_1 } as any);

      const request = new Request(`http://localhost:3000/api/organizations/${ORG_ID_1}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Organization" }),
      });

      await PUT(request, { params: { id: ORG_ID_1 } });

      expect(prisma.organization.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: ORG_ID_1,
            ownerId: USER_ID_A,
          }),
        })
      );
    });
  });

  // ==================== DELETE /api/organizations/[id] ====================
  describe("DELETE /api/organizations/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request(`http://localhost:3000/api/organizations/${ORG_ID_1}`, {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: { id: ORG_ID_1 } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Não autorizado");
    });

    it("should delete organization when user owns it", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.organization.delete).mockResolvedValue({ id: ORG_ID_1 } as any);

      const request = new Request(`http://localhost:3000/api/organizations/${ORG_ID_1}`, {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: { id: ORG_ID_1 } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Organização excluída com sucesso");
    });

    it("should include ownerId in delete where clause", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.organization.delete).mockResolvedValue({ id: ORG_ID_1 } as any);

      const request = new Request(`http://localhost:3000/api/organizations/${ORG_ID_1}`, {
        method: "DELETE",
      });

      await DELETE(request, { params: { id: ORG_ID_1 } });

      expect(prisma.organization.delete).toHaveBeenCalledWith({
        where: {
          id: ORG_ID_1,
          ownerId: USER_ID_A,
        },
      });
    });
  });

  // ==================== DATA ISOLATION ====================
  describe("Data Isolation", () => {
    it("GET should only return organizations with ownerId filter", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.organization.findMany).mockResolvedValue([]);

      const request = new Request("http://localhost:3000/api/organizations");
      await GET(request);

      expect(prisma.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: USER_ID_A,
          }),
        })
      );
    });

    it("POST should set ownerId to authenticated user", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.organization.create).mockResolvedValue({ id: ORG_ID_1 } as any);

      const request = new Request("http://localhost:3000/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test Org" }),
      });

      await POST(request);

      expect(prisma.organization.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ownerId: USER_ID_A,
          }),
        })
      );
    });

    it("GET by ID should include ownerId in where clause", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.organization.findFirst).mockResolvedValue(null);

      const request = new Request(`http://localhost:3000/api/organizations/${ORG_ID_1}`);
      await GET_BY_ID(request, { params: { id: ORG_ID_1 } });

      expect(prisma.organization.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: USER_ID_A,
          }),
        })
      );
    });

    it("PUT should include ownerId in where clause", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.organization.update).mockResolvedValue({ id: ORG_ID_1 } as any);

      const request = new Request(`http://localhost:3000/api/organizations/${ORG_ID_1}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated" }),
      });

      await PUT(request, { params: { id: ORG_ID_1 } });

      expect(prisma.organization.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: USER_ID_A,
          }),
        })
      );
    });

    it("DELETE should include ownerId in where clause", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.organization.delete).mockResolvedValue({ id: ORG_ID_1 } as any);

      const request = new Request(`http://localhost:3000/api/organizations/${ORG_ID_1}`, {
        method: "DELETE",
      });

      await DELETE(request, { params: { id: ORG_ID_1 } });

      expect(prisma.organization.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: USER_ID_A,
          }),
        })
      );
    });
  });
});
