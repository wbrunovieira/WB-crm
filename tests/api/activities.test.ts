/**
 * Tests for Activities API Routes
 * Phase 8: API Routes - Activities
 *
 * Routes tested:
 * - GET /api/activities
 * - POST /api/activities
 * - GET /api/activities/[id]
 * - PUT /api/activities/[id]
 * - DELETE /api/activities/[id]
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Valid CUID format for testing
const USER_ID_A = "clxxxxxxxxxxxxxxxxxxxxxxxxxua";
const USER_ID_B = "clxxxxxxxxxxxxxxxxxxxxxxxxxub";
const ACTIVITY_ID_1 = "clxxxxxxxxxxxxxxxxxxxxxxxxxa1";
const ACTIVITY_ID_2 = "clxxxxxxxxxxxxxxxxxxxxxxxxxa2";
const DEAL_ID = "clxxxxxxxxxxxxxxxxxxxxxxxxxd1";
const CONTACT_ID = "clxxxxxxxxxxxxxxxxxxxxxxxxxc1";

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
    activity: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Mock activity schema
vi.mock("@/lib/validations/activity", () => ({
  activitySchema: {
    parse: vi.fn((data) => data),
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/activities/route";
import {
  GET as GET_BY_ID,
  PUT,
  DELETE,
} from "@/app/api/activities/[id]/route";

describe("Activities API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== GET /api/activities ====================
  describe("GET /api/activities", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/activities");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Não autorizado");
    });

    it("should return activities for authenticated user", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      const mockActivities = [
        { id: ACTIVITY_ID_1, subject: "Call client", type: "call", ownerId: USER_ID_A },
        { id: ACTIVITY_ID_2, subject: "Send email", type: "email", ownerId: USER_ID_A },
      ];

      vi.mocked(prisma.activity.findMany).mockResolvedValue(mockActivities as any);

      const request = new Request("http://localhost:3000/api/activities");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(2);
      expect(prisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: USER_ID_A,
          }),
        })
      );
    });

    it("should filter activities by type", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.activity.findMany).mockResolvedValue([]);

      const request = new Request("http://localhost:3000/api/activities?type=call");
      await GET(request);

      expect(prisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: USER_ID_A,
            type: "call",
          }),
        })
      );
    });

    it("should filter activities by dealId", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.activity.findMany).mockResolvedValue([]);

      const request = new Request(`http://localhost:3000/api/activities?dealId=${DEAL_ID}`);
      await GET(request);

      expect(prisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: USER_ID_A,
            dealId: DEAL_ID,
          }),
        })
      );
    });

    it("should filter activities by contactId", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.activity.findMany).mockResolvedValue([]);

      const request = new Request(`http://localhost:3000/api/activities?contactId=${CONTACT_ID}`);
      await GET(request);

      expect(prisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: USER_ID_A,
            contactId: CONTACT_ID,
          }),
        })
      );
    });
  });

  // ==================== POST /api/activities ====================
  describe("POST /api/activities", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: "New Activity", type: "call" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Não autorizado");
    });

    it("should create an activity for authenticated user", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      const newActivity = {
        id: ACTIVITY_ID_1,
        subject: "New Activity",
        type: "call",
        ownerId: USER_ID_A,
      };

      vi.mocked(prisma.activity.create).mockResolvedValue(newActivity as any);

      const request = new Request("http://localhost:3000/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: "New Activity", type: "call" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.subject).toBe("New Activity");
      expect(prisma.activity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ownerId: USER_ID_A,
          }),
        })
      );
    });

    it("should create activity with deal link", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      vi.mocked(prisma.activity.create).mockResolvedValue({
        id: ACTIVITY_ID_1,
        subject: "Activity with Deal",
        type: "call",
        dealId: DEAL_ID,
        ownerId: USER_ID_A,
      } as any);

      const request = new Request("http://localhost:3000/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: "Activity with Deal",
          type: "call",
          dealId: DEAL_ID,
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(prisma.activity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dealId: DEAL_ID,
          }),
        })
      );
    });
  });

  // ==================== GET /api/activities/[id] ====================
  describe("GET /api/activities/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request(`http://localhost:3000/api/activities/${ACTIVITY_ID_1}`);
      const response = await GET_BY_ID(request, { params: { id: ACTIVITY_ID_1 } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Não autorizado");
    });

    it("should return activity when user owns it", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      const activity = { id: ACTIVITY_ID_1, subject: "Activity 1", ownerId: USER_ID_A };
      vi.mocked(prisma.activity.findUnique).mockResolvedValue(activity as any);

      const request = new Request(`http://localhost:3000/api/activities/${ACTIVITY_ID_1}`);
      const response = await GET_BY_ID(request, { params: { id: ACTIVITY_ID_1 } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(ACTIVITY_ID_1);
    });

    it("should return 404 when activity not found", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.activity.findUnique).mockResolvedValue(null);

      const request = new Request(`http://localhost:3000/api/activities/${ACTIVITY_ID_1}`);
      const response = await GET_BY_ID(request, { params: { id: ACTIVITY_ID_1 } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Atividade não encontrada");
    });

    it("should filter by ownerId in query", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.activity.findUnique).mockResolvedValue(null);

      const request = new Request(`http://localhost:3000/api/activities/${ACTIVITY_ID_1}`);
      await GET_BY_ID(request, { params: { id: ACTIVITY_ID_1 } });

      expect(prisma.activity.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: ACTIVITY_ID_1,
            ownerId: USER_ID_A,
          }),
        })
      );
    });
  });

  // ==================== PUT /api/activities/[id] ====================
  describe("PUT /api/activities/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request(`http://localhost:3000/api/activities/${ACTIVITY_ID_1}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: "Updated Activity", type: "call" }),
      });

      const response = await PUT(request, { params: { id: ACTIVITY_ID_1 } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Não autorizado");
    });

    it("should update activity when user owns it", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      const existingActivity = { id: ACTIVITY_ID_1, subject: "Activity 1", ownerId: USER_ID_A };
      vi.mocked(prisma.activity.findUnique).mockResolvedValue(existingActivity as any);

      const updatedActivity = { id: ACTIVITY_ID_1, subject: "Updated Activity", ownerId: USER_ID_A };
      vi.mocked(prisma.activity.update).mockResolvedValue(updatedActivity as any);

      const request = new Request(`http://localhost:3000/api/activities/${ACTIVITY_ID_1}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: "Updated Activity", type: "call" }),
      });

      const response = await PUT(request, { params: { id: ACTIVITY_ID_1 } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.subject).toBe("Updated Activity");
    });

    it("should return 404 when activity not found", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.activity.findUnique).mockResolvedValue(null);

      const request = new Request(`http://localhost:3000/api/activities/${ACTIVITY_ID_1}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: "Updated Activity", type: "call" }),
      });

      const response = await PUT(request, { params: { id: ACTIVITY_ID_1 } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Atividade não encontrada");
    });

    it("should return 404 when activity belongs to another user", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      const otherUserActivity = { id: ACTIVITY_ID_1, subject: "Activity 1", ownerId: USER_ID_B };
      vi.mocked(prisma.activity.findUnique).mockResolvedValue(otherUserActivity as any);

      const request = new Request(`http://localhost:3000/api/activities/${ACTIVITY_ID_1}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: "Updated Activity", type: "call" }),
      });

      const response = await PUT(request, { params: { id: ACTIVITY_ID_1 } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Atividade não encontrada");
      expect(prisma.activity.update).not.toHaveBeenCalled();
    });
  });

  // ==================== DELETE /api/activities/[id] ====================
  describe("DELETE /api/activities/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request(`http://localhost:3000/api/activities/${ACTIVITY_ID_1}`, {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: { id: ACTIVITY_ID_1 } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Não autorizado");
    });

    it("should delete activity when user owns it", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      const existingActivity = { id: ACTIVITY_ID_1, subject: "Activity 1", ownerId: USER_ID_A };
      vi.mocked(prisma.activity.findUnique).mockResolvedValue(existingActivity as any);
      vi.mocked(prisma.activity.delete).mockResolvedValue(existingActivity as any);

      const request = new Request(`http://localhost:3000/api/activities/${ACTIVITY_ID_1}`, {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: { id: ACTIVITY_ID_1 } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should return 404 when activity not found", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.activity.findUnique).mockResolvedValue(null);

      const request = new Request(`http://localhost:3000/api/activities/${ACTIVITY_ID_1}`, {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: { id: ACTIVITY_ID_1 } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Atividade não encontrada");
      expect(prisma.activity.delete).not.toHaveBeenCalled();
    });

    it("should return 404 when activity belongs to another user", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      const otherUserActivity = { id: ACTIVITY_ID_1, subject: "Activity 1", ownerId: USER_ID_B };
      vi.mocked(prisma.activity.findUnique).mockResolvedValue(otherUserActivity as any);

      const request = new Request(`http://localhost:3000/api/activities/${ACTIVITY_ID_1}`, {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: { id: ACTIVITY_ID_1 } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Atividade não encontrada");
      expect(prisma.activity.delete).not.toHaveBeenCalled();
    });
  });

  // ==================== DATA ISOLATION ====================
  describe("Data Isolation", () => {
    it("GET should only return activities with ownerId filter", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.activity.findMany).mockResolvedValue([]);

      const request = new Request("http://localhost:3000/api/activities");
      await GET(request);

      expect(prisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: USER_ID_A,
          }),
        })
      );
    });

    it("POST should set ownerId to authenticated user", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);
      vi.mocked(prisma.activity.create).mockResolvedValue({ id: ACTIVITY_ID_1 } as any);

      const request = new Request("http://localhost:3000/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: "Test", type: "call" }),
      });

      await POST(request);

      expect(prisma.activity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ownerId: USER_ID_A,
          }),
        })
      );
    });

    it("PUT should verify ownership before updating", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      const otherUserActivity = { id: ACTIVITY_ID_1, ownerId: USER_ID_B };
      vi.mocked(prisma.activity.findUnique).mockResolvedValue(otherUserActivity as any);

      const request = new Request(`http://localhost:3000/api/activities/${ACTIVITY_ID_1}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: "Hacked", type: "call" }),
      });

      const response = await PUT(request, { params: { id: ACTIVITY_ID_1 } });

      expect(response.status).toBe(404);
      expect(prisma.activity.update).not.toHaveBeenCalled();
    });

    it("DELETE should verify ownership before deleting", async () => {
      vi.mocked(getServerSession).mockResolvedValue(sessionUserA as any);

      const otherUserActivity = { id: ACTIVITY_ID_1, ownerId: USER_ID_B };
      vi.mocked(prisma.activity.findUnique).mockResolvedValue(otherUserActivity as any);

      const request = new Request(`http://localhost:3000/api/activities/${ACTIVITY_ID_1}`, {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: { id: ACTIVITY_ID_1 } });

      expect(response.status).toBe(404);
      expect(prisma.activity.delete).not.toHaveBeenCalled();
    });
  });
});
