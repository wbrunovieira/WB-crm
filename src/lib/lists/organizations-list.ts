"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getOrganizationsList() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return [];
  }

  const organizations = await prisma.organization.findMany({
    where: {
      ownerId: session.user.id,
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return organizations;
}
