import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { contactSchema } from "@/lib/validations/contact";

// GET /api/contacts?search=termo
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;

    const contacts = await prisma.contact.findMany({
      where: {
        ownerId: session.user.id,
        ...(search && {
          OR: [{ name: { contains: search } }, { email: { contains: search } }],
        }),
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(contacts);
  } catch {
    return NextResponse.json(
      { error: "Erro ao buscar contatos" },
      { status: 500 }
    );
  }
}

// POST /api/contacts
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const validated = contactSchema.parse(body);

    // Determine which ID field to set based on companyType
    let organizationId: string | null = null;
    let leadId: string | null = null;
    let partnerId: string | null = null;

    if (validated.companyId && validated.companyType) {
      switch (validated.companyType) {
        case "organization":
          organizationId = validated.companyId;
          break;
        case "lead":
          leadId = validated.companyId;
          break;
        case "partner":
          partnerId = validated.companyId;
          break;
      }
    }

    const contact = await prisma.contact.create({
      data: {
        name: validated.name,
        email: validated.email || null,
        phone: validated.phone || null,
        organizationId,
        leadId,
        partnerId,
        ownerId: session.user.id,
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

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Erro ao criar contato" },
      { status: 500 }
    );
  }
}
