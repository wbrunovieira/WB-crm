import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { organizationSchema } from "@/lib/validations/organization";

// GET /api/organizations?search=termo
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;

    const organizations = await prisma.organization.findMany({
      where: {
        ownerId: session.user.id,
        ...(search && {
          OR: [{ name: { contains: search } }, { website: { contains: search } }],
        }),
      },
      include: {
        _count: {
          select: {
            contacts: true,
            deals: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(organizations);
  } catch {
    return NextResponse.json(
      { error: "Erro ao buscar organizações" },
      { status: 500 }
    );
  }
}

// POST /api/organizations
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const validated = organizationSchema.parse(body);

    const organization = await prisma.organization.create({
      data: {
        name: validated.name,
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
        ownerId: session.user.id,
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

    return NextResponse.json(organization, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Erro ao criar organização" },
      { status: 500 }
    );
  }
}
