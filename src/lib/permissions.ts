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
 * Returns ownerId filter based on user role
 * - admin: empty filter (sees all data)
 * - sdr/closer: filters by ownerId
 */
export async function getOwnerFilter(): Promise<OwnerFilter> {
  const session = await getAuthenticatedSession();

  if (session.user.role === "admin") {
    return {};
  }

  return { ownerId: session.user.id };
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
