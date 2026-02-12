import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

// Mock NextAuth
const mockGetServerSession = vi.fn();
vi.mock("next-auth", () => ({
  getServerSession: () => mockGetServerSession(),
}));

// Mock Prisma
const mockICPFindMany = vi.fn();
const mockICPFindFirst = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    iCP: {
      findMany: () => mockICPFindMany(),
      findFirst: () => mockICPFindFirst(),
    },
  },
}));

// Mock auth options
vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

// Import after mocks
import { GET as getICPs } from "@/app/api/icps/route";
import { GET as getICPById } from "@/app/api/icps/[id]/route";

describe("ICP API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/icps", () => {
    it("should return 401 if not authenticated", async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/icps");
      const response = await getICPs(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Não autorizado");
    });

    it("should return all ICPs for authenticated user", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "user-1", role: "sdr" },
      });

      const mockICPs = [
        {
          id: "icp-1",
          name: "Startup de Tech",
          slug: "startup-de-tech",
          content: "Descrição do ICP",
          status: "active",
          ownerId: "user-1",
          createdAt: new Date(),
          updatedAt: new Date(),
          owner: { id: "user-1", name: "User 1" },
          _count: { leads: 5, organizations: 2, versions: 3 },
        },
        {
          id: "icp-2",
          name: "E-commerce Médio",
          slug: "e-commerce-medio",
          content: "Outro ICP",
          status: "draft",
          ownerId: "user-1",
          createdAt: new Date(),
          updatedAt: new Date(),
          owner: { id: "user-1", name: "User 1" },
          _count: { leads: 10, organizations: 5, versions: 1 },
        },
      ];

      mockICPFindMany.mockResolvedValue(mockICPs);

      const request = new Request("http://localhost:3000/api/icps");
      const response = await getICPs(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(2);
      expect(data[0].name).toBe("Startup de Tech");
      expect(data[1].name).toBe("E-commerce Médio");
    });

    it("should filter ICPs by status", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "user-1", role: "sdr" },
      });

      const mockICPs = [
        {
          id: "icp-1",
          name: "Active ICP",
          slug: "active-icp",
          content: "Descrição",
          status: "active",
          ownerId: "user-1",
          owner: { id: "user-1", name: "User 1" },
          _count: { leads: 5, organizations: 2, versions: 3 },
        },
      ];

      mockICPFindMany.mockResolvedValue(mockICPs);

      const request = new Request("http://localhost:3000/api/icps?status=active");
      const response = await getICPs(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(1);
      expect(data[0].status).toBe("active");
    });

    it("should filter ICPs by search term", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "user-1", role: "sdr" },
      });

      const mockICPs = [
        {
          id: "icp-1",
          name: "Startup de Tech",
          slug: "startup-de-tech",
          content: "Descrição com tecnologia",
          status: "active",
          ownerId: "user-1",
          owner: { id: "user-1", name: "User 1" },
          _count: { leads: 5, organizations: 2, versions: 3 },
        },
      ];

      mockICPFindMany.mockResolvedValue(mockICPs);

      const request = new Request("http://localhost:3000/api/icps?search=tech");
      const response = await getICPs(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(1);
    });

    it("should return empty array when no ICPs found", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "user-1", role: "sdr" },
      });

      mockICPFindMany.mockResolvedValue([]);

      const request = new Request("http://localhost:3000/api/icps");
      const response = await getICPs(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(0);
    });

    it("should return 500 on database error", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "user-1", role: "sdr" },
      });

      mockICPFindMany.mockRejectedValue(new Error("Database error"));

      const request = new Request("http://localhost:3000/api/icps");
      const response = await getICPs(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Erro ao buscar ICPs");
    });
  });

  describe("GET /api/icps/[id]", () => {
    it("should return 401 if not authenticated", async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/icps/icp-1");
      const response = await getICPById(request, { params: { id: "icp-1" } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Não autorizado");
    });

    it("should return ICP with full details for authenticated user", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "user-1", role: "sdr" },
      });

      const mockICP = {
        id: "icp-1",
        name: "Startup de Tech",
        slug: "startup-de-tech",
        content: "# ICP Detalhado\n\nDescrição completa do perfil ideal de cliente.",
        status: "active",
        ownerId: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
        owner: { id: "user-1", name: "User 1", email: "user@test.com" },
        _count: { leads: 5, organizations: 2, versions: 3 },
        leads: [
          {
            id: "lead-icp-1",
            leadId: "lead-1",
            matchScore: 85,
            notes: "Bom fit",
            lead: {
              id: "lead-1",
              businessName: "Empresa A",
              status: "qualified",
            },
          },
        ],
        organizations: [
          {
            id: "org-icp-1",
            organizationId: "org-1",
            matchScore: 90,
            notes: "Cliente ideal",
            organization: {
              id: "org-1",
              name: "Empresa B",
            },
          },
        ],
        versions: [
          {
            id: "version-1",
            versionNumber: 1,
            name: "Startup de Tech",
            createdAt: new Date(),
            user: { id: "user-1", name: "User 1" },
          },
        ],
      };

      mockICPFindFirst.mockResolvedValue(mockICP);

      const request = new Request("http://localhost:3000/api/icps/icp-1");
      const response = await getICPById(request, { params: { id: "icp-1" } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe("icp-1");
      expect(data.name).toBe("Startup de Tech");
      expect(data.content).toContain("ICP Detalhado");
      expect(data.leads).toHaveLength(1);
      expect(data.organizations).toHaveLength(1);
      expect(data.versions).toHaveLength(1);
    });

    it("should return 404 if ICP not found", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "user-1", role: "sdr" },
      });

      mockICPFindFirst.mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/icps/non-existent");
      const response = await getICPById(request, { params: { id: "non-existent" } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("ICP não encontrado");
    });

    it("should return 404 if ICP belongs to another user (non-admin)", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "user-2", role: "sdr" },
      });

      // ICP belongs to user-1, but request is from user-2
      mockICPFindFirst.mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/icps/icp-1");
      const response = await getICPById(request, { params: { id: "icp-1" } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("ICP não encontrado");
    });

    it("should return ICP for admin even if owned by another user", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "admin-1", role: "admin" },
      });

      const mockICP = {
        id: "icp-1",
        name: "Startup de Tech",
        slug: "startup-de-tech",
        content: "Descrição",
        status: "active",
        ownerId: "user-1", // Different owner
        createdAt: new Date(),
        updatedAt: new Date(),
        owner: { id: "user-1", name: "User 1", email: "user@test.com" },
        _count: { leads: 5, organizations: 2, versions: 3 },
        leads: [],
        organizations: [],
        versions: [],
      };

      mockICPFindFirst.mockResolvedValue(mockICP);

      const request = new Request("http://localhost:3000/api/icps/icp-1");
      const response = await getICPById(request, { params: { id: "icp-1" } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe("icp-1");
    });

    it("should return 500 on database error", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "user-1", role: "sdr" },
      });

      mockICPFindFirst.mockRejectedValue(new Error("Database error"));

      const request = new Request("http://localhost:3000/api/icps/icp-1");
      const response = await getICPById(request, { params: { id: "icp-1" } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Erro ao buscar ICP");
    });
  });
});
