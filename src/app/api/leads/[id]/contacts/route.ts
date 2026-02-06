import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { leadContactSchema } from "@/lib/validations/lead";

/**
 * @swagger
 * /api/leads/{id}/contacts:
 *   get:
 *     summary: Lista contatos de um lead
 *     description: Retorna todos os contatos vinculados a um lead
 *     tags:
 *       - Lead Contacts
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
 *         description: Lista de contatos do lead
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

    // Verify lead ownership
    const lead = await prisma.lead.findFirst({
      where: {
        id: params.id,
        ownerId: session.user.id,
      },
    });

    if (!lead) {
      return NextResponse.json(
        { error: "Lead não encontrado" },
        { status: 404 }
      );
    }

    const contacts = await prisma.leadContact.findMany({
      where: { leadId: params.id },
      orderBy: [
        { isPrimary: "desc" },
        { name: "asc" },
      ],
    });

    return NextResponse.json(contacts);
  } catch {
    return NextResponse.json(
      { error: "Erro ao buscar contatos" },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/leads/{id}/contacts:
 *   post:
 *     summary: Cria um contato para o lead
 *     description: Adiciona um novo contato vinculado ao lead
 *     tags:
 *       - Lead Contacts
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
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nome do contato (obrigatório)
 *               role:
 *                 type: string
 *                 description: Cargo/função
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               whatsapp:
 *                 type: string
 *               isPrimary:
 *                 type: boolean
 *                 description: Se é o contato principal
 *     responses:
 *       201:
 *         description: Contato criado com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Lead não encontrado
 *       500:
 *         description: Erro interno
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Verify lead ownership
    const lead = await prisma.lead.findFirst({
      where: {
        id: params.id,
        ownerId: session.user.id,
      },
    });

    if (!lead) {
      return NextResponse.json(
        { error: "Lead não encontrado" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validated = leadContactSchema.parse(body);

    // If setting as primary, remove primary from others
    if (validated.isPrimary) {
      await prisma.leadContact.updateMany({
        where: { leadId: params.id },
        data: { isPrimary: false },
      });
    }

    const contact = await prisma.leadContact.create({
      data: {
        ...validated,
        leadId: params.id,
      },
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Erro ao criar contato" },
      { status: 500 }
    );
  }
}
