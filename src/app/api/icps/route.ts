import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrInternal } from "@/lib/internal-auth";

/**
 * @swagger
 * /api/icps:
 *   get:
 *     summary: Lista todos os ICPs
 *     description: Retorna lista de ICPs do usuário autenticado com filtros opcionais
 *     tags:
 *       - ICPs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, active, archived]
 *         description: Filtrar por status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Busca por nome ou conteúdo
 *     responses:
 *       200:
 *         description: Lista de ICPs
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno
 */
export async function GET(request: Request) {
  try {
    const auth = await getSessionOrInternal(request);
    if (!auth) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;

    // Build owner filter based on role (internal requests act as admin)
    const ownerFilter =
      auth.user.role === "admin" || auth.isInternal ? {} : { ownerId: auth.user.id };

    const icps = await prisma.iCP.findMany({
      where: {
        ...ownerFilter,
        ...(status && { status }),
        ...(search && {
          OR: [
            { name: { contains: search } },
            { content: { contains: search } },
          ],
        }),
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            leads: true,
            organizations: true,
            versions: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json(icps);
  } catch {
    return NextResponse.json(
      { error: "Erro ao buscar ICPs" },
      { status: 500 }
    );
  }
}
