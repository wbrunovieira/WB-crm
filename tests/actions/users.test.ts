/**
 * Tests for Users Actions
 * Phase 7: Auxiliary Actions - Users
 *
 * Actions tested:
 * - getUsers
 *
 * Note: getUsers returns all users for admin, only self for non-admin
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { UserRole } from "@/types/next-auth";

// Valid CUID format for testing
const USER_ID_ADMIN = "clxxxxxxxxxxxxxxxxxxxxxxxxxad";
const USER_ID_SDR = "clxxxxxxxxxxxxxxxxxxxxxxxxxsd";
const USER_ID_CLOSER = "clxxxxxxxxxxxxxxxxxxxxxxxxxcl";

// Type for mock sessions
interface MockSession {
  user: { id: string; email: string; name: string | null; role: UserRole };
}

// Mock sessions
const sessionAdmin: MockSession = {
  user: { id: USER_ID_ADMIN, email: "admin@test.com", name: "Admin User", role: "admin" },
};
const sessionSDR: MockSession = {
  user: { id: USER_ID_SDR, email: "sdr@test.com", name: "SDR User", role: "sdr" },
};
const sessionCloser: MockSession = {
  user: { id: USER_ID_CLOSER, email: "closer@test.com", name: "Closer User", role: "closer" },
};

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
    },
  },
}));

// Mock the permissions module functions
vi.mock("@/lib/permissions", () => ({
  getAuthenticatedSession: vi.fn(),
  isAdmin: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { getUsers } from "@/actions/users";
import { getAuthenticatedSession, isAdmin } from "@/lib/permissions";

describe("Users Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== GET USERS ====================
  describe("getUsers", () => {
    it("should throw error when not authenticated", async () => {
      vi.mocked(getAuthenticatedSession).mockRejectedValue(new Error("Não autorizado"));

      await expect(getUsers()).rejects.toThrow("Não autorizado");
    });

    it("should return all users when admin", async () => {
      vi.mocked(getAuthenticatedSession).mockResolvedValue(sessionAdmin as any);
      vi.mocked(isAdmin).mockResolvedValue(true);

      const allUsers = [
        { id: USER_ID_ADMIN, name: "Admin User", email: "admin@test.com", role: "admin" },
        { id: USER_ID_SDR, name: "SDR User", email: "sdr@test.com", role: "sdr" },
        { id: USER_ID_CLOSER, name: "Closer User", email: "closer@test.com", role: "closer" },
      ];

      vi.mocked(prisma.user.findMany).mockResolvedValue(allUsers as any);

      const result = await getUsers();

      expect(isAdmin).toHaveBeenCalled();
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
        orderBy: { name: "asc" },
      });
      expect(result).toHaveLength(3);
      expect(result).toEqual(allUsers);
    });

    it("should return only self when SDR", async () => {
      vi.mocked(getAuthenticatedSession).mockResolvedValue(sessionSDR as any);
      vi.mocked(isAdmin).mockResolvedValue(false);

      const result = await getUsers();

      expect(isAdmin).toHaveBeenCalled();
      expect(prisma.user.findMany).not.toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: USER_ID_SDR,
        name: "SDR User",
        email: "sdr@test.com",
        role: "sdr",
      });
    });

    it("should return only self when Closer", async () => {
      vi.mocked(getAuthenticatedSession).mockResolvedValue(sessionCloser as any);
      vi.mocked(isAdmin).mockResolvedValue(false);

      const result = await getUsers();

      expect(isAdmin).toHaveBeenCalled();
      expect(prisma.user.findMany).not.toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: USER_ID_CLOSER,
        name: "Closer User",
        email: "closer@test.com",
        role: "closer",
      });
    });

    it("should handle null name for non-admin user", async () => {
      const sessionWithNullName: MockSession = {
        user: { id: USER_ID_SDR, email: "sdr@test.com", name: null, role: "sdr" },
      };

      vi.mocked(getAuthenticatedSession).mockResolvedValue(sessionWithNullName as any);
      vi.mocked(isAdmin).mockResolvedValue(false);

      const result = await getUsers();

      expect(result[0].name).toBe("");
    });

    it("should handle null email for non-admin user", async () => {
      const sessionWithNullEmail: { user: { id: string; email: null; name: string; role: UserRole } } = {
        user: { id: USER_ID_SDR, email: null, name: "SDR User", role: "sdr" },
      };

      vi.mocked(getAuthenticatedSession).mockResolvedValue(sessionWithNullEmail as any);
      vi.mocked(isAdmin).mockResolvedValue(false);

      const result = await getUsers();

      expect(result[0].email).toBe("");
    });
  });

  // ==================== ROLE-BASED ACCESS ====================
  describe("Role-Based Access", () => {
    it("admin should see all users including other admins", async () => {
      vi.mocked(getAuthenticatedSession).mockResolvedValue(sessionAdmin as any);
      vi.mocked(isAdmin).mockResolvedValue(true);

      const allUsers = [
        { id: USER_ID_ADMIN, name: "Admin User", email: "admin@test.com", role: "admin" },
        { id: "admin-2", name: "Admin 2", email: "admin2@test.com", role: "admin" },
        { id: USER_ID_SDR, name: "SDR User", email: "sdr@test.com", role: "sdr" },
      ];

      vi.mocked(prisma.user.findMany).mockResolvedValue(allUsers as any);

      const result = await getUsers();

      expect(result.filter(u => u.role === "admin")).toHaveLength(2);
    });

    it("SDR should not be able to list other users", async () => {
      vi.mocked(getAuthenticatedSession).mockResolvedValue(sessionSDR as any);
      vi.mocked(isAdmin).mockResolvedValue(false);

      const result = await getUsers();

      expect(prisma.user.findMany).not.toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(USER_ID_SDR);
    });

    it("Closer should not be able to list other users", async () => {
      vi.mocked(getAuthenticatedSession).mockResolvedValue(sessionCloser as any);
      vi.mocked(isAdmin).mockResolvedValue(false);

      const result = await getUsers();

      expect(prisma.user.findMany).not.toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(USER_ID_CLOSER);
    });
  });

  // ==================== RETURN FORMAT ====================
  describe("Return Format", () => {
    it("should return UserListItem format for admin", async () => {
      vi.mocked(getAuthenticatedSession).mockResolvedValue(sessionAdmin as any);
      vi.mocked(isAdmin).mockResolvedValue(true);

      vi.mocked(prisma.user.findMany).mockResolvedValue([
        { id: USER_ID_ADMIN, name: "Admin", email: "admin@test.com", role: "admin" },
      ] as any);

      const result = await getUsers();

      expect(result[0]).toHaveProperty("id");
      expect(result[0]).toHaveProperty("name");
      expect(result[0]).toHaveProperty("email");
      expect(result[0]).toHaveProperty("role");
    });

    it("should return UserListItem format for non-admin", async () => {
      vi.mocked(getAuthenticatedSession).mockResolvedValue(sessionSDR as any);
      vi.mocked(isAdmin).mockResolvedValue(false);

      const result = await getUsers();

      expect(result[0]).toHaveProperty("id");
      expect(result[0]).toHaveProperty("name");
      expect(result[0]).toHaveProperty("email");
      expect(result[0]).toHaveProperty("role");
    });

    it("should order users by name for admin", async () => {
      vi.mocked(getAuthenticatedSession).mockResolvedValue(sessionAdmin as any);
      vi.mocked(isAdmin).mockResolvedValue(true);

      vi.mocked(prisma.user.findMany).mockResolvedValue([]);

      await getUsers();

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: "asc" },
        })
      );
    });
  });
});
