import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { contactSchema } from "@/lib/validations/contact";

// GET /api/contacts/:id
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const contact = await prisma.contact.findFirst({
      where: {
        id: params.id,
        ownerId: session.user.id,
      },
      include: {
        organization: true,
        deals: {
          include: {
            stage: {
              select: {
                name: true,
              },
            },
          },
        },
        activities: {
          orderBy: {
            dueDate: "desc",
          },
        },
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

// PUT /api/contacts/:id
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const validated = contactSchema.parse(body);

    const contact = await prisma.contact.update({
      where: {
        id: params.id,
        ownerId: session.user.id,
      },
      data: {
        name: validated.name,
        email: validated.email || null,
        phone: validated.phone || null,
        organizationId: validated.organizationId || null,
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
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

// DELETE /api/contacts/:id
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    await prisma.contact.delete({
      where: {
        id: params.id,
        ownerId: session.user.id,
      },
    });

    return NextResponse.json({ message: "Contato excluído com sucesso" });
  } catch {
    return NextResponse.json(
      { error: "Erro ao excluir contato" },
      { status: 500 }
    );
  }
}
