"use server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedSession, isAdmin } from "@/lib/permissions";

export type UserListItem = {
  id: string;
  name: string;
  email: string;
  role: string;
};

/**
 * Get all users (admin only)
 */
export async function getUsers(): Promise<UserListItem[]> {
  const session = await getAuthenticatedSession();

  if (!(await isAdmin())) {
    return [
      {
        id: session.user.id,
        name: session.user.name || "",
        email: session.user.email || "",
        role: session.user.role,
      },
    ];
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
    orderBy: { name: "asc" },
  });

  return users;
}
