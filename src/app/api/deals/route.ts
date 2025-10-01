import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dealSchema } from "@/lib/validations/deal";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;

    const deals = await prisma.deal.findMany({
      where: {
        ownerId: session.user.id,
        ...(search && {
          OR: [
            { title: { contains: search } },
            { contact: { name: { contains: search } } },
            { organization: { name: { contains: search } } },
          ],
        }),
      },
      include: {
        contact: true,
        organization: true,
        stage: {
          include: {
            pipeline: true,
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
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(deals);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao buscar negócios",
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
      value: Number(body.value),
      expectedCloseDate: body.expectedCloseDate
        ? new Date(body.expectedCloseDate)
        : null,
    };

    const validated = dealSchema.parse(data);

    const deal = await prisma.deal.create({
      data: {
        title: validated.title,
        value: validated.value,
        currency: validated.currency,
        status: validated.status,
        stageId: validated.stageId,
        contactId: validated.contactId,
        organizationId: validated.organizationId,
        expectedCloseDate: validated.expectedCloseDate,
        ownerId: session.user.id,
      },
      include: {
        contact: true,
        organization: true,
        stage: {
          include: {
            pipeline: true,
          },
        },
      },
    });

    return NextResponse.json(deal, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Erro ao criar negócio",
      },
      { status: 400 }
    );
  }
}
