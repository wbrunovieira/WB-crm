import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { leadContactSchema } from "@/lib/validations/lead";
import { getSessionOrInternal } from "@/lib/internal-auth";

/**
 * @swagger
 * /api/leads/{id}/contacts/{contactId}:
 *   get:
 *     summary: Busca um contato específico do lead
 *     description: Retorna os detalhes de um contato específico
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
 *       - in: path
 *         name: contactId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do contato
 *     responses:
 *       200:
 *         description: Contato encontrado
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Contato não encontrado
 *       500:
 *         description: Erro interno
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string; contactId: string } }
) {
  try {
    const auth = await getSessionOrInternal(request);
    if (!auth) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Build owner filter based on role (internal requests act as admin)
    const ownerFilter =
      auth.user.role === "admin" || auth.isInternal ? {} : { ownerId: auth.user.id };

    const contact = await prisma.leadContact.findFirst({
      where: {
        id: params.contactId,
        leadId: params.id,
        lead: ownerFilter,
      },
    });

    if (!contact) {
      return NextResponse.json(
        { error: "Contato não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(contact);
  } catch {
    return NextResponse.json(
      { error: "Erro ao buscar contato" },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/leads/{id}/contacts/{contactId}:
 *   put:
 *     summary: Atualiza um contato do lead
 *     description: Atualiza os dados de um contato específico
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
 *       - in: path
 *         name: contactId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do contato
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               role:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               whatsapp:
 *                 type: string
 *               isPrimary:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Contato atualizado com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Contato não encontrado
 *       500:
 *         description: Erro interno
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string; contactId: string } }
) {
  try {
    const auth = await getSessionOrInternal(request);
    if (!auth) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Build owner filter based on role (internal requests act as admin)
    const ownerFilter =
      auth.user.role === "admin" || auth.isInternal ? {} : { ownerId: auth.user.id };

    // Verify contact exists and user has access
    const existing = await prisma.leadContact.findFirst({
      where: {
        id: params.contactId,
        leadId: params.id,
        lead: ownerFilter,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Contato não encontrado" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validated = leadContactSchema.parse(body);

    // If setting as primary, remove primary from others
    if (validated.isPrimary && !existing.isPrimary) {
      await prisma.leadContact.updateMany({
        where: {
          leadId: params.id,
          id: { not: params.contactId },
        },
        data: { isPrimary: false },
      });
    }

    const contact = await prisma.leadContact.update({
      where: { id: params.contactId },
      data: validated,
    });

    return NextResponse.json(contact);
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Erro ao atualizar contato" },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/leads/{id}/contacts/{contactId}:
 *   delete:
 *     summary: Exclui um contato do lead
 *     description: Remove um contato (não pode excluir contatos já convertidos)
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
 *       - in: path
 *         name: contactId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do contato
 *     responses:
 *       200:
 *         description: Contato excluído com sucesso
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Contato não encontrado
 *       409:
 *         description: Contato já convertido não pode ser excluído
 *       500:
 *         description: Erro interno
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; contactId: string } }
) {
  try {
    const auth = await getSessionOrInternal(request);
    if (!auth) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Build owner filter based on role (internal requests act as admin)
    const ownerFilter =
      auth.user.role === "admin" || auth.isInternal ? {} : { ownerId: auth.user.id };

    // Verify contact exists and user has access
    const contact = await prisma.leadContact.findFirst({
      where: {
        id: params.contactId,
        leadId: params.id,
        lead: ownerFilter,
      },
    });

    if (!contact) {
      return NextResponse.json(
        { error: "Contato não encontrado" },
        { status: 404 }
      );
    }

    if (contact.convertedToContactId) {
      return NextResponse.json(
        { error: "Não é possível excluir um contato já convertido" },
        { status: 409 }
      );
    }

    await prisma.leadContact.delete({
      where: { id: params.contactId },
    });

    return NextResponse.json({ message: "Contato excluído com sucesso" });
  } catch {
    return NextResponse.json(
      { error: "Erro ao excluir contato" },
      { status: 500 }
    );
  }
}
