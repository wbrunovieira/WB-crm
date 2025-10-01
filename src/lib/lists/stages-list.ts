"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getStagesList() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return [];
  }

  const stages = await prisma.stage.findMany({
    orderBy: [{ pipeline: { isDefault: "desc" } }, { order: "asc" }],
    include: {
      pipeline: {
        select: {
          id: true,
          name: true,
          isDefault: true,
        },
      },
    },
  });

  return stages;
}
