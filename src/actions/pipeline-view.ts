"use server";

import { prisma } from "@/lib/prisma";
import { getOwnerOrSharedFilter } from "@/lib/permissions";

export async function getPipelineView(pipelineId?: string) {
  const ownerFilter = await getOwnerOrSharedFilter("deal");

  // Build deal filter: only open deals + proper ownership/sharing
  const dealWhere = {
    status: "open",
    ...ownerFilter,
  };

  const dealInclude = {
    contact: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
    organization: {
      select: {
        id: true,
        name: true,
      },
    },
    activities: {
      where: {
        completed: false,
      },
      orderBy: [
        {
          dueDate: {
            sort: "asc" as const,
            nulls: "last" as const,
          },
        },
        {
          createdAt: "desc" as const,
        },
      ],
      take: 1,
      select: {
        id: true,
        subject: true,
        type: true,
        dueDate: true,
      },
    },
  };

  // Get default pipeline or specified pipeline
  const pipeline = pipelineId
    ? await prisma.pipeline.findUnique({
        where: { id: pipelineId },
        include: {
          stages: {
            orderBy: { order: "asc" },
            include: {
              deals: {
                where: dealWhere,
                include: dealInclude,
                orderBy: { createdAt: "desc" },
              },
            },
          },
        },
      })
    : await prisma.pipeline.findFirst({
        where: { isDefault: true },
        include: {
          stages: {
            orderBy: { order: "asc" },
            include: {
              deals: {
                where: dealWhere,
                include: dealInclude,
                orderBy: { createdAt: "desc" },
              },
            },
          },
        },
      });

  if (!pipeline) {
    throw new Error("Pipeline não encontrado");
  }

  return pipeline;
}
