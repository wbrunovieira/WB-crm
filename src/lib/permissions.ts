import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@/types/next-auth";

export type OwnerFilter = { ownerId: string } | Record<string, never>;

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
 * - sdr/closer: can only access their own records
 */
export async function canAccessRecord(recordOwnerId: string): Promise<boolean> {
  const session = await getAuthenticatedSession();

  if (session.user.role === "admin") {
    return true;
  }

  return recordOwnerId === session.user.id;
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
