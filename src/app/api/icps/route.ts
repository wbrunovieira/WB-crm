import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;

    // Build owner filter based on role
    const ownerFilter =
      session.user.role === "admin" ? {} : { ownerId: session.user.id };

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
