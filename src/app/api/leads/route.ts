import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { leadSchema } from "@/lib/validations/lead";

/**
 * @swagger
 * /api/leads:
 *   get:
 *     summary: Lista todos os leads
 *     description: Retorna lista de leads do usuário autenticado com filtros opcionais
 *     tags:
 *       - Leads
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Busca por nome comercial, razão social ou email
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [new, contacted, qualified, disqualified]
 *         description: Filtrar por status
 *       - in: query
 *         name: quality
 *         schema:
 *           type: string
 *           enum: [cold, warm, hot]
 *         description: Filtrar por qualidade
 *     responses:
 *       200:
 *         description: Lista de leads
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const status = searchParams.get("status") || undefined;
    const quality = searchParams.get("quality") || undefined;

    const leads = await prisma.lead.findMany({
      where: {
        ownerId: session.user.id,
        ...(search && {
          OR: [
            { businessName: { contains: search } },
            { registeredName: { contains: search } },
            { email: { contains: search } },
          ],
        }),
        ...(status && { status }),
        ...(quality && { quality }),
      },
      include: {
        leadContacts: {
          orderBy: [
            { isPrimary: "desc" },
            { name: "asc" },
          ],
        },
        owner: {
          select: {
            id: true,
            name: true,
          },
        },
        label: true,
        _count: {
          select: {
            leadContacts: true,
            activities: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(leads);
  } catch {
    return NextResponse.json(
      { error: "Erro ao buscar leads" },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/leads:
 *   post:
 *     summary: Cria um novo lead
 *     description: Cria um novo lead vinculado ao usuário autenticado
 *     tags:
 *       - Leads
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - businessName
 *             properties:
 *               businessName:
 *                 type: string
 *                 description: Nome comercial (obrigatório)
 *               registeredName:
 *                 type: string
 *                 description: Razão social
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
 *       201:
 *         description: Lead criado com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();

    // Parse date fields if they exist
    if (body.foundationDate && typeof body.foundationDate === "string") {
      body.foundationDate = new Date(body.foundationDate);
    }

    const validated = leadSchema.parse(body);

    const lead = await prisma.lead.create({
      data: {
        ...validated,
        ownerId: session.user.id,
      },
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

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Erro ao criar lead" },
      { status: 500 }
    );
  }
}
