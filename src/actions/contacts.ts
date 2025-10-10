"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { contactSchema, ContactFormData } from "@/lib/validations/contact";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getContacts(filters?: {
  search?: string;
  status?: string;
  company?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const whereClause: {
    ownerId: string;
    status?: string;
    OR?: Array<{ name?: { contains: string; mode: string }; email?: { contains: string; mode: string }; phone?: { contains: string } }>;
    organizationId?: { not: null };
    leadId?: { not: null };
    partnerId?: { not: null };
    AND?: Array<{ organizationId: null; leadId: null; partnerId: null }>;
  } = {
    ownerId: session.user.id,
  };

  // Search filter
  if (filters?.search) {
    whereClause.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { email: { contains: filters.search, mode: "insensitive" } },
      { phone: { contains: filters.search } },
    ];
  }

  // Status filter
  if (filters?.status) {
    whereClause.status = filters.status;
  }

  // Company filter
  if (filters?.company) {
    if (filters.company === "organization") {
      whereClause.organizationId = { not: null };
    } else if (filters.company === "lead") {
      whereClause.leadId = { not: null };
    } else if (filters.company === "partner") {
      whereClause.partnerId = { not: null };
    } else if (filters.company === "none") {
      whereClause.AND = [
        { organizationId: null },
        { leadId: null },
        { partnerId: null },
      ];
    }
  }

  const contacts = await prisma.contact.findMany({
    where: whereClause,
    include: {
      lead: {
        select: {
          id: true,
          businessName: true,
        },
      },
      organization: {
        select: {
          id: true,
          name: true,
        },
      },
      partner: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [
      { isPrimary: "desc" },
      { name: "asc" },
    ],
  });

  return contacts;
}

export async function getContactById(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const contact = await prisma.contact.findFirst({
    where: {
      id,
      ownerId: session.user.id,
    },
    include: {
      lead: {
        select: {
          id: true,
          businessName: true,
          status: true,
        },
      },
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

  return contact;
}

export async function createContact(data: ContactFormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const validated = contactSchema.parse(data);

  // Determine leadId, organizationId, or partnerId based on companyType
  const leadId = validated.companyType === "lead" ? validated.companyId : null;
  const organizationId = validated.companyType === "organization" ? validated.companyId : null;
  const partnerId = validated.companyType === "partner" ? validated.companyId : null;

  const contact = await prisma.contact.create({
    data: {
      name: validated.name,
      email: validated.email || null,
      phone: validated.phone || null,
      whatsapp: validated.whatsapp || null,
      role: validated.role || null,
      department: validated.department || null,
      leadId: leadId || null,
      organizationId: organizationId || null,
      partnerId: partnerId || null,
      linkedin: validated.linkedin || null,
      status: validated.status || "active",
      isPrimary: validated.isPrimary || false,
      birthDate: validated.birthDate ? new Date(validated.birthDate) : null,
      notes: validated.notes || null,
      preferredLanguage: validated.preferredLanguage || "pt-BR",
      source: validated.source || null,
      sourceLeadContactId: validated.sourceLeadContactId || null,
      ownerId: session.user.id,
    },
  });

  revalidatePath("/contacts");
  return contact;
}

export async function updateContact(id: string, data: ContactFormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const validated = contactSchema.parse(data);

  // Determine leadId, organizationId, or partnerId based on companyType
  const leadId = validated.companyType === "lead" ? validated.companyId : null;
  const organizationId = validated.companyType === "organization" ? validated.companyId : null;
  const partnerId = validated.companyType === "partner" ? validated.companyId : null;

  const contact = await prisma.contact.update({
    where: {
      id,
      ownerId: session.user.id,
    },
    data: {
      name: validated.name,
      email: validated.email || null,
      phone: validated.phone || null,
      whatsapp: validated.whatsapp || null,
      role: validated.role || null,
      department: validated.department || null,
      leadId: leadId || null,
      organizationId: organizationId || null,
      partnerId: partnerId || null,
      linkedin: validated.linkedin || null,
      status: validated.status,
      isPrimary: validated.isPrimary,
      birthDate: validated.birthDate ? new Date(validated.birthDate) : null,
      notes: validated.notes || null,
      preferredLanguage: validated.preferredLanguage,
      source: validated.source || null,
      sourceLeadContactId: validated.sourceLeadContactId || null,
    },
  });

  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
  return contact;
}

export async function deleteContact(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  await prisma.contact.delete({
    where: {
      id,
      ownerId: session.user.id,
    },
  });

  revalidatePath("/contacts");
}
