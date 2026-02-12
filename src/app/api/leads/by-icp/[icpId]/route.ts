import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrInternal } from "@/lib/internal-auth";

/**
 * @swagger
 * /api/leads/by-icp/{icpId}:
 *   get:
 *     summary: Lista leads vinculados a um ICP
 *     description: Retorna lista de leads vinculados ao ICP especificado (para evitar duplicados)
 *     tags:
 *       - Leads
 *       - ICP
 *     security:
 *       - bearerAuth: []
 *       - internalAuth: []
 *     parameters:
 *       - in: path
 *         name: icpId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do ICP
 *     responses:
 *       200:
 *         description: Lista de leads do ICP
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   businessName:
 *                     type: string
 *                   registeredName:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   status:
 *                     type: string
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: ICP não encontrado
 *       500:
 *         description: Erro interno
 */
export async function GET(
  request: Request,
  { params }: { params: { icpId: string } }
) {
  try {
    const auth = await getSessionOrInternal(request);
    if (!auth) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { icpId } = params;

    // Build owner filter based on role (internal requests act as admin)
    const ownerFilter =
      auth.user.role === "admin" || auth.isInternal ? {} : { ownerId: auth.user.id };

    // Verify ICP exists and user has access
    const icp = await prisma.iCP.findFirst({
      where: {
        id: icpId,
        ...ownerFilter,
      },
    });

    if (!icp) {
      return NextResponse.json(
        { error: "ICP não encontrado" },
        { status: 404 }
      );
    }

    // Get all leads linked to this ICP (lightweight response)
    const leadICPs = await prisma.leadICP.findMany({
      where: { icpId },
      include: {
        lead: {
          select: {
            id: true,
            businessName: true,
            registeredName: true,
            city: true,
            state: true,
            status: true,
            quality: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Flatten to just the lead data
    const leads = leadICPs.map((link) => link.lead);

    return NextResponse.json(leads);
  } catch {
    return NextResponse.json(
      { error: "Erro ao buscar leads do ICP" },
      { status: 500 }
    );
  }
}
