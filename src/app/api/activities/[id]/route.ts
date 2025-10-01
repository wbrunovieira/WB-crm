import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { activitySchema } from "@/lib/validations/activity";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const activity = await prisma.activity.findUnique({
      where: {
        id: params.id,
        ownerId: session.user.id,
      },
      include: {
        deal: {
          select: {
            id: true,
            title: true,
            value: true,
            currency: true,
          },
        },
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!activity) {
      return NextResponse.json(
        { error: "Atividade não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(activity);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Erro ao buscar atividade",
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const existingActivity = await prisma.activity.findUnique({
      where: { id: params.id },
    });

    if (!existingActivity || existingActivity.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "Atividade não encontrada" },
        { status: 404 }
      );
    }

    const body = await request.json();

    const data = {
      ...body,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
    };

    const validated = activitySchema.parse(data);

    const activity = await prisma.activity.update({
      where: { id: params.id },
      data: {
        type: validated.type,
        subject: validated.subject,
        description: validated.description,
        dueDate: validated.dueDate,
        completed: validated.completed,
        dealId: validated.dealId,
        contactId: validated.contactId,
      },
      include: {
        deal: {
          select: {
            id: true,
            title: true,
          },
        },
        contact: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(activity);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao atualizar atividade",
      },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const activity = await prisma.activity.findUnique({
      where: { id: params.id },
    });

    if (!activity || activity.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "Atividade não encontrada" },
        { status: 404 }
      );
    }

    await prisma.activity.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Erro ao excluir atividade",
      },
      { status: 500 }
    );
  }
}
