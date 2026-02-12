import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrInternal } from "@/lib/internal-auth";
import { z } from "zod";

const linkLeadToICPSchema = z.object({
  icpId: z.string().min(1, "icpId é obrigatório"),
  matchScore: z.number().int().min(0).max(100).optional(),
  notes: z.string().optional(),
});

/**
 * @swagger
 * /api/leads/{id}/icps:
 *   get:
 *     summary: Lista ICPs vinculados a um lead
 *     description: Retorna todos os ICPs vinculados ao lead
 *     tags:
 *       - Leads
 *       - ICP
 *     security:
 *       - bearerAuth: []
 *       - internalAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do lead
 *     responses:
 *       200:
 *         description: Lista de ICPs do lead
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Lead não encontrado
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

    const { id: leadId } = params;

    // Build owner filter based on role (internal requests act as admin)
    const ownerFilter =
      auth.user.role === "admin" || auth.isInternal ? {} : { ownerId: auth.user.id };

    // Verify lead exists and user has access
    const lead = await prisma.lead.findFirst({
      where: {
        id: leadId,
        ...ownerFilter,
      },
    });

    if (!lead) {
      return NextResponse.json(
        { error: "Lead não encontrado" },
        { status: 404 }
      );
    }

    // Get all ICPs linked to this lead
    const leadICPs = await prisma.leadICP.findMany({
      where: { leadId },
      include: {
        icp: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(leadICPs);
  } catch {
    return NextResponse.json(
      { error: "Erro ao buscar ICPs do lead" },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/leads/{id}/icps:
 *   post:
 *     summary: Vincula um lead a um ICP
 *     description: Cria um vínculo entre o lead e o ICP especificado
 *     tags:
 *       - Leads
 *       - ICP
 *     security:
 *       - bearerAuth: []
 *       - internalAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do lead
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - icpId
 *             properties:
 *               icpId:
 *                 type: string
 *                 description: ID do ICP para vincular
 *               matchScore:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *                 description: Score de fit (0-100)
 *               notes:
 *                 type: string
 *                 description: Observações do vínculo
 *     responses:
 *       201:
 *         description: Vínculo criado com sucesso
 *       400:
 *         description: Dados inválidos ou vínculo já existe
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Lead ou ICP não encontrado
 *       500:
 *         description: Erro interno
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getSessionOrInternal(request);
    if (!auth) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id: leadId } = params;
    const body = await request.json();

    // Validate input
    const validated = linkLeadToICPSchema.parse(body);

    // Build owner filter based on role (internal requests act as admin)
    const ownerFilter =
      auth.user.role === "admin" || auth.isInternal ? {} : { ownerId: auth.user.id };

    // Verify lead exists and user has access
    const lead = await prisma.lead.findFirst({
      where: {
        id: leadId,
        ...ownerFilter,
      },
    });

    if (!lead) {
      return NextResponse.json(
        { error: "Lead não encontrado" },
        { status: 404 }
      );
    }

    // Verify ICP exists and user has access
    const icp = await prisma.iCP.findFirst({
      where: {
        id: validated.icpId,
        ...ownerFilter,
      },
    });

    if (!icp) {
      return NextResponse.json(
        { error: "ICP não encontrado" },
        { status: 404 }
      );
    }

    // Check if link already exists
    const existingLink = await prisma.leadICP.findUnique({
      where: {
        leadId_icpId: {
          leadId,
          icpId: validated.icpId,
        },
      },
    });

    if (existingLink) {
      return NextResponse.json(
        { error: "Lead já está vinculado a este ICP" },
        { status: 400 }
      );
    }

    // Create link
    const link = await prisma.leadICP.create({
      data: {
        leadId,
        icpId: validated.icpId,
        matchScore: validated.matchScore,
        notes: validated.notes,
      },
      include: {
        icp: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
          },
        },
      },
    });

    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Erro ao vincular lead ao ICP" },
      { status: 500 }
    );
  }
}
