"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getPipelineView(pipelineId?: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  // Get default pipeline or specified pipeline
  const pipeline = pipelineId
    ? await prisma.pipeline.findUnique({
        where: { id: pipelineId },
        include: {
          stages: {
            orderBy: { order: "asc" },
            include: {
              deals: {
                where: {
                  ownerId: session.user.id,
                  status: "open",
                },
                include: {
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
                },
                orderBy: {
                  createdAt: "desc",
                },
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
                where: {
                  ownerId: session.user.id,
                  status: "open",
                },
                include: {
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
                },
                orderBy: {
                  createdAt: "desc",
                },
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
