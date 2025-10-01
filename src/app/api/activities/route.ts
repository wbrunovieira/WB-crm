import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { activitySchema } from "@/lib/validations/activity";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || undefined;
    const completed = searchParams.get("completed");
    const dealId = searchParams.get("dealId") || undefined;
    const contactId = searchParams.get("contactId") || undefined;

    const activities = await prisma.activity.findMany({
      where: {
        ownerId: session.user.id,
        ...(type && { type }),
        ...(completed !== null && { completed: completed === "true" }),
        ...(dealId && { dealId }),
        ...(contactId && { contactId }),
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
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { completed: "asc" },
        { dueDate: "asc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json(activities);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao buscar atividades",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();

    const data = {
      ...body,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
    };

    const validated = activitySchema.parse(data);

    const activity = await prisma.activity.create({
      data: {
        type: validated.type,
        subject: validated.subject,
        description: validated.description,
        dueDate: validated.dueDate,
        completed: validated.completed,
        dealId: validated.dealId,
        contactId: validated.contactId,
        ownerId: session.user.id,
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

    return NextResponse.json(activity, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Erro ao criar atividade",
      },
      { status: 400 }
    );
  }
}
