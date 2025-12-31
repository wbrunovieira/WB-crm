"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { contactSchema, ContactFormData } from "@/lib/validations/contact";
import {
  getAuthenticatedSession,
  getOwnerOrSharedFilter,
  canAccessEntity,
} from "@/lib/permissions";

export async function getContacts(filters?: {
  search?: string;
  status?: string;
  company?: string;
  owner?: string;
}) {
  const ownerFilter = await getOwnerOrSharedFilter("contact", filters?.owner);

  // Build additional filters
  const additionalFilters: Record<string, unknown> = {};

  // Search filter
  if (filters?.search) {
    additionalFilters.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { email: { contains: filters.search, mode: "insensitive" } },
      { phone: { contains: filters.search } },
    ];
  }

  // Status filter
  if (filters?.status) {
    additionalFilters.status = filters.status;
  }

  // Company filter
  if (filters?.company) {
    if (filters.company === "organization") {
      additionalFilters.organizationId = { not: null };
    } else if (filters.company === "lead") {
      additionalFilters.leadId = { not: null };
    } else if (filters.company === "partner") {
      additionalFilters.partnerId = { not: null };
    } else if (filters.company === "none") {
      additionalFilters.organizationId = null;
      additionalFilters.leadId = null;
      additionalFilters.partnerId = null;
    }
  }

  // Combine owner filter with additional filters
  // Use AND only when ownerFilter has OR (shared entities case)
  // Otherwise spread both objects together (simpler structure)
  const hasSharedEntities = 'OR' in ownerFilter;
  const hasAdditionalFilters = Object.keys(additionalFilters).length > 0;

  let whereClause: Record<string, unknown>;
  if (hasSharedEntities && hasAdditionalFilters) {
    // Need AND to combine OR-based owner filter with other filters
    whereClause = { AND: [ownerFilter, additionalFilters] };
  } else if (hasAdditionalFilters) {
    // Simple case: spread owner filter (ownerId) with other filters
    whereClause = { ...ownerFilter, ...additionalFilters };
  } else {
    // No additional filters, just use owner filter
    whereClause = ownerFilter;
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
      owner: {
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
  const ownerFilter = await getOwnerOrSharedFilter("contact");

  const contact = await prisma.contact.findFirst({
    where: {
      id,
      ...ownerFilter,
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
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return contact;
}

export async function createContact(data: ContactFormData) {
  const session = await getAuthenticatedSession();
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
  await getAuthenticatedSession();
  const validated = contactSchema.parse(data);

  // Check ownership or shared access
  const existing = await prisma.contact.findUnique({ where: { id } });
  if (!existing || !(await canAccessEntity("contact", id, existing.ownerId))) {
    throw new Error("Contato não encontrado");
  }

  // Determine leadId, organizationId, or partnerId based on companyType
  const leadId = validated.companyType === "lead" ? validated.companyId : null;
  const organizationId = validated.companyType === "organization" ? validated.companyId : null;
  const partnerId = validated.companyType === "partner" ? validated.companyId : null;

  const contact = await prisma.contact.update({
    where: { id },
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
  await getAuthenticatedSession();

  // Check ownership or shared access
  const existing = await prisma.contact.findUnique({ where: { id } });
  if (!existing || !(await canAccessEntity("contact", id, existing.ownerId))) {
    throw new Error("Contato não encontrado");
  }

  await prisma.contact.delete({ where: { id } });

  revalidatePath("/contacts");
}
