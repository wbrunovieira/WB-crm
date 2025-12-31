import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dealSchema } from "@/lib/validations/deal";
import { errorToResponse } from "@/lib/errors";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const deal = await prisma.deal.findUnique({
      where: {
        id: params.id,
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
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        activities: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!deal) {
      return NextResponse.json(
        { error: "Negócio não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(deal);
  } catch (error) {
    return errorToResponse(error);
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
    const existingDeal = await prisma.deal.findUnique({
      where: { id: params.id },
    });

    if (!existingDeal || existingDeal.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "Negócio não encontrado" },
        { status: 404 }
      );
    }

    const body = await request.json();

    const data = {
      ...body,
      value: Number(body.value),
      expectedCloseDate: body.expectedCloseDate
        ? new Date(body.expectedCloseDate)
        : null,
    };

    const validated = dealSchema.parse(data);

    const deal = await prisma.deal.update({
      where: { id: params.id },
      data: {
        title: validated.title,
        value: validated.value,
        currency: validated.currency,
        status: validated.status,
        stageId: validated.stageId,
        contactId: validated.contactId,
        organizationId: validated.organizationId,
        expectedCloseDate: validated.expectedCloseDate,
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

    return NextResponse.json(deal);
  } catch (error) {
    return errorToResponse(error);
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
    const deal = await prisma.deal.findUnique({
      where: { id: params.id },
    });

    if (!deal || deal.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "Negócio não encontrado" },
        { status: 404 }
      );
    }

    await prisma.deal.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorToResponse(error);
  }
}
