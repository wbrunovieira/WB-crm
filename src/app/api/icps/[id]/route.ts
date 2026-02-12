import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrInternal } from "@/lib/internal-auth";

/**
 * @swagger
 * /api/icps/{id}:
 *   get:
 *     summary: Busca um ICP por ID
 *     description: Retorna os detalhes completos de um ICP específico, incluindo leads e organizações vinculadas
 *     tags:
 *       - ICPs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do ICP
 *     responses:
 *       200:
 *         description: ICP encontrado com detalhes completos
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: ICP não encontrado
 *       500:
 *         description: Erro interno
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getSessionOrInternal(request);
    if (!auth) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Build owner filter based on role (internal requests act as admin)
    const ownerFilter =
      auth.user.role === "admin" || auth.isInternal ? {} : { ownerId: auth.user.id };

    const icp = await prisma.iCP.findFirst({
      where: {
        id: params.id,
        ...ownerFilter,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            leads: true,
            organizations: true,
            versions: true,
          },
        },
        leads: {
          include: {
            lead: {
              select: {
                id: true,
                businessName: true,
                status: true,
                quality: true,
              },
            },
          },
          orderBy: {
            matchScore: "desc",
          },
        },
        organizations: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            matchScore: "desc",
          },
        },
        versions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            versionNumber: "desc",
          },
          take: 10, // Limit to last 10 versions
        },
      },
    });

    if (!icp) {
      return NextResponse.json(
        { error: "ICP não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(icp);
  } catch {
    return NextResponse.json(
      { error: "Erro ao buscar ICP" },
      { status: 500 }
    );
  }
}
