import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { organizationSchema } from "@/lib/validations/organization";

// GET /api/organizations/:id
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const organization = await prisma.organization.findFirst({
      where: {
        id: params.id,
        ownerId: session.user.id,
      },
      include: {
        contacts: {
          orderBy: {
            name: "asc",
          },
        },
        deals: {
          include: {
            stage: {
              select: {
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            contacts: true,
            deals: true,
          },
        },
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organização não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(organization);
  } catch {
    return NextResponse.json(
      { error: "Erro ao buscar organização" },
      { status: 500 }
    );
  }
}

// PUT /api/organizations/:id
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
    const validated = organizationSchema.parse(body);

    const organization = await prisma.organization.update({
      where: {
        id: params.id,
        ownerId: session.user.id,
      },
      data: {
        name: validated.name,
        legalName: validated.legalName || null,
        website: validated.website || null,
        phone: validated.phone || null,
        country: validated.country || null,
        state: validated.state || null,
        city: validated.city || null,
        zipCode: validated.zipCode || null,
        streetAddress: validated.streetAddress || null,
        industry: validated.industry || null,
        employeeCount: validated.employeeCount || null,
        annualRevenue: validated.annualRevenue || null,
        taxId: validated.taxId || null,
        description: validated.description || null,
        instagram: validated.instagram || null,
        linkedin: validated.linkedin || null,
        facebook: validated.facebook || null,
        twitter: validated.twitter || null,
      },
      include: {
        _count: {
          select: {
            contacts: true,
            deals: true,
          },
        },
      },
    });

    return NextResponse.json(organization);
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Erro ao atualizar organização" },
      { status: 500 }
    );
  }
}

// DELETE /api/organizations/:id
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    await prisma.organization.delete({
      where: {
        id: params.id,
        ownerId: session.user.id,
      },
    });

    return NextResponse.json({ message: "Organização excluída com sucesso" });
  } catch {
    return NextResponse.json(
      { error: "Erro ao excluir organização" },
      { status: 500 }
    );
  }
}
