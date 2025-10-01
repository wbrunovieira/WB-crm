"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getDealsList() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return [];
  }

  const deals = await prisma.deal.findMany({
    where: {
      ownerId: session.user.id,
    },
    select: {
      id: true,
      title: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return deals;
}
