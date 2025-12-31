import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@/types/next-auth";
import { prisma } from "@/lib/prisma";

export type OwnerFilter = { ownerId: string } | Record<string, never>;
export type EntityType = "lead" | "contact" | "organization" | "partner" | "deal";

/**
 * Get the current session with user info
 * Throws error if not authenticated
 */
export async function getAuthenticatedSession() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Não autorizado");
  }

  return session;
}

/**
 * Returns ownerId filter based on user role and optional filter
 * - admin with no filter: empty filter (sees all data)
 * - admin with "mine": filters by admin's ownerId
 * - admin with specific userId: filters by that userId
 * - sdr/closer: always filters by their ownerId
 */
export async function getOwnerFilter(ownerIdFilter?: string): Promise<OwnerFilter> {
  const session = await getAuthenticatedSession();

  // Non-admin users always see only their own data
  if (session.user.role !== "admin") {
    return { ownerId: session.user.id };
  }

  // Admin with no filter sees all
  if (!ownerIdFilter || ownerIdFilter === "all") {
    return {};
  }

  // Admin filtering by "mine"
  if (ownerIdFilter === "mine") {
    return { ownerId: session.user.id };
  }

  // Admin filtering by specific user
  return { ownerId: ownerIdFilter };
}

/**
 * Check if user can access a specific record
 * - admin: can access any record
 * - sdr/closer: can only access their own records OR shared records
 */
export async function canAccessRecord(recordOwnerId: string): Promise<boolean> {
  const session = await getAuthenticatedSession();

  if (session.user.role === "admin") {
    return true;
  }

  return recordOwnerId === session.user.id;
}

/**
 * Check if user can access a specific entity (including shared)
 * - admin: can access any entity
 * - sdr/closer: can access if they own it OR if it's shared with them
 */
export async function canAccessEntity(
  entityType: EntityType,
  entityId: string,
  entityOwnerId: string
): Promise<boolean> {
  const session = await getAuthenticatedSession();

  // Admin can access everything
  if (session.user.role === "admin") {
    return true;
  }

  // Owner can access
  if (entityOwnerId === session.user.id) {
    return true;
  }

  // Check if shared with this user
  const share = await prisma.sharedEntity.findFirst({
    where: {
      entityType,
      entityId,
      sharedWithUserId: session.user.id,
    },
  });

  return share !== null;
}

/**
 * Get IDs of entities shared with the current user
 */
export async function getSharedEntityIds(entityType: EntityType): Promise<string[]> {
  const session = await getAuthenticatedSession();

  const shares = await prisma.sharedEntity.findMany({
    where: {
      entityType,
      sharedWithUserId: session.user.id,
    },
    select: {
      entityId: true,
    },
  });

  return shares.map((s) => s.entityId);
}

/**
 * Get owner filter that includes shared entities
 * For non-admin users, returns a filter that includes owned AND shared entities
 */
export async function getOwnerOrSharedFilter(
  entityType: EntityType,
  ownerIdFilter?: string
): Promise<{ OR: Array<{ ownerId: string } | { id: { in: string[] } }> } | OwnerFilter> {
  const session = await getAuthenticatedSession();

  // Admin with no filter sees all
  if (session.user.role === "admin") {
    if (!ownerIdFilter || ownerIdFilter === "all") {
      return {};
    }
    if (ownerIdFilter === "mine") {
      return { ownerId: session.user.id };
    }
    return { ownerId: ownerIdFilter };
  }

  // Non-admin: get shared entity IDs
  const sharedIds = await getSharedEntityIds(entityType);

  // If no shared entities, just filter by owner
  if (sharedIds.length === 0) {
    return { ownerId: session.user.id };
  }

  // Include both owned and shared
  return {
    OR: [
      { ownerId: session.user.id },
      { id: { in: sharedIds } },
    ],
  };
}

/**
 * Check if user has admin role
 */
export async function isAdmin(): Promise<boolean> {
  const session = await getAuthenticatedSession();
  return session.user.role === "admin";
}

/**
 * Get user role from session
 */
export async function getUserRole(): Promise<UserRole> {
  const session = await getAuthenticatedSession();
  return session.user.role;
}
