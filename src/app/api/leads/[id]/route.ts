import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { leadSchema } from "@/lib/validations/lead";

/**
 * @swagger
 * /api/leads/{id}:
 *   get:
 *     summary: Busca um lead por ID
 *     description: Retorna os detalhes completos de um lead específico
 *     tags:
 *       - Leads
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do lead
 *     responses:
 *       200:
 *         description: Lead encontrado
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
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const lead = await prisma.lead.findFirst({
      where: {
        id: params.id,
        ownerId: session.user.id,
      },
      include: {
        primaryCNAE: true,
        label: true,
        leadContacts: {
          orderBy: [
            { isPrimary: "desc" },
            { name: "asc" },
          ],
        },
        activities: {
          orderBy: [
            { completed: "asc" },
            { dueDate: "asc" },
            { createdAt: "desc" },
          ],
        },
        convertedOrganization: {
          select: {
            id: true,
            name: true,
          },
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            leadContacts: true,
            activities: true,
          },
        },
      },
    });

    if (!lead) {
      return NextResponse.json(
        { error: "Lead não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(lead);
  } catch {
    return NextResponse.json(
      { error: "Erro ao buscar lead" },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/leads/{id}:
 *   put:
 *     summary: Atualiza um lead
 *     description: Atualiza os dados de um lead existente
 *     tags:
 *       - Leads
 *     security:
 *       - bearerAuth: []
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
 *             properties:
 *               businessName:
 *                 type: string
 *               registeredName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               whatsapp:
 *                 type: string
 *               website:
 *                 type: string
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               country:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [new, contacted, qualified, disqualified]
 *               quality:
 *                 type: string
 *                 enum: [cold, warm, hot]
 *     responses:
 *       200:
 *         description: Lead atualizado com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Lead não encontrado
 *       500:
 *         description: Erro interno
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Check if lead exists and belongs to user
    const existing = await prisma.lead.findFirst({
      where: {
        id: params.id,
        ownerId: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Lead não encontrado" },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Parse date fields if they exist
    if (body.foundationDate && typeof body.foundationDate === "string") {
      body.foundationDate = new Date(body.foundationDate);
    }

    const validated = leadSchema.parse(body);

    const lead = await prisma.lead.update({
      where: { id: params.id },
      data: validated,
      include: {
        leadContacts: true,
        owner: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(lead);
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Erro ao atualizar lead" },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/leads/{id}:
 *   delete:
 *     summary: Exclui um lead
 *     description: Remove um lead (não pode excluir leads já convertidos)
 *     tags:
 *       - Leads
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do lead
 *     responses:
 *       200:
 *         description: Lead excluído com sucesso
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Lead não encontrado
 *       409:
 *         description: Lead já convertido não pode ser excluído
 *       500:
 *         description: Erro interno
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Check if lead exists and belongs to user
    const lead = await prisma.lead.findFirst({
      where: {
        id: params.id,
        ownerId: session.user.id,
      },
      select: {
        id: true,
        convertedAt: true,
      },
    });

    if (!lead) {
      return NextResponse.json(
        { error: "Lead não encontrado" },
        { status: 404 }
      );
    }

    if (lead.convertedAt) {
      return NextResponse.json(
        { error: "Não é possível excluir um lead já convertido" },
        { status: 409 }
      );
    }

    await prisma.lead.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Lead excluído com sucesso" });
  } catch {
    return NextResponse.json(
      { error: "Erro ao excluir lead" },
      { status: 500 }
    );
  }
}
