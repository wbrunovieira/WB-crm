"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  leadSchema,
  leadContactSchema,
  LeadFormData,
  LeadContactFormData,
} from "@/lib/validations/lead";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// ============ LEAD CRUD ============

export async function getLeads(filters?: {
  search?: string;
  status?: string;
  quality?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const leads = await prisma.lead.findMany({
    where: {
      ownerId: session.user.id,
      ...(filters?.search && {
        OR: [
          { businessName: { contains: filters.search } },
          { registeredName: { contains: filters.search } },
          { email: { contains: filters.search } },
        ],
      }),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.quality && { quality: filters.quality }),
    },
    include: {
      leadContacts: true,
      _count: {
        select: {
          leadContacts: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return leads;
}

export async function getLeadById(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const lead = await prisma.lead.findFirst({
    where: {
      id,
      ownerId: session.user.id,
    },
    include: {
      leadContacts: {
        orderBy: [
          { isPrimary: "desc" },
          { name: "asc" },
        ],
      },
      convertedOrganization: {
        include: {
          contacts: true,
          deals: true,
        },
      },
    },
  });

  return lead;
}

export async function createLead(data: LeadFormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const validated = leadSchema.parse(data);

  const lead = await prisma.lead.create({
    data: {
      ...validated,
      ownerId: session.user.id,
    },
  });

  revalidatePath("/leads");
  return lead;
}

export async function updateLead(id: string, data: LeadFormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const validated = leadSchema.parse(data);

  const lead = await prisma.lead.update({
    where: {
      id,
      ownerId: session.user.id,
    },
    data: validated,
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  return lead;
}

export async function deleteLead(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  // Check if lead is already converted
  const lead = await prisma.lead.findFirst({
    where: { id, ownerId: session.user.id },
    select: { convertedAt: true },
  });

  if (lead?.convertedAt) {
    throw new Error("Não é possível excluir um lead já convertido");
  }

  await prisma.lead.delete({
    where: {
      id,
      ownerId: session.user.id,
    },
  });

  revalidatePath("/leads");
}

// ============ LEAD CONTACT CRUD ============

export async function getLeadContacts(leadId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const contacts = await prisma.leadContact.findMany({
    where: {
      leadId,
      lead: {
        ownerId: session.user.id,
      },
    },
    orderBy: [
      { isPrimary: "desc" },
      { name: "asc" },
    ],
  });

  return contacts;
}

export async function createLeadContact(leadId: string, data: LeadContactFormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  // Verify lead ownership
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, ownerId: session.user.id },
  });

  if (!lead) {
    throw new Error("Lead não encontrado");
  }

  const validated = leadContactSchema.parse(data);

  // If setting as primary, remove primary from others
  if (validated.isPrimary) {
    await prisma.leadContact.updateMany({
      where: { leadId },
      data: { isPrimary: false },
    });
  }

  const contact = await prisma.leadContact.create({
    data: {
      ...validated,
      leadId,
    },
  });

  revalidatePath(`/leads/${leadId}`);
  return contact;
}

export async function updateLeadContact(
  id: string,
  data: LeadContactFormData
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const validated = leadContactSchema.parse(data);

  const leadContact = await prisma.leadContact.findUnique({
    where: { id },
    include: { lead: true },
  });

  if (!leadContact || leadContact.lead.ownerId !== session.user.id) {
    throw new Error("Não autorizado");
  }

  // If setting as primary, remove primary from others
  if (validated.isPrimary && !leadContact.isPrimary) {
    await prisma.leadContact.updateMany({
      where: { leadId: leadContact.leadId, id: { not: id } },
      data: { isPrimary: false },
    });
  }

  const updated = await prisma.leadContact.update({
    where: { id },
    data: validated,
  });

  revalidatePath(`/leads/${leadContact.leadId}`);
  return updated;
}

export async function deleteLeadContact(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const leadContact = await prisma.leadContact.findUnique({
    where: { id },
    include: { lead: true },
  });

  if (!leadContact || leadContact.lead.ownerId !== session.user.id) {
    throw new Error("Não autorizado");
  }

  // Check if already converted
  if (leadContact.convertedToContactId) {
    throw new Error("Não é possível excluir um contato já convertido");
  }

  await prisma.leadContact.delete({
    where: { id },
  });

  revalidatePath(`/leads/${leadContact.leadId}`);
}

// ============ LEAD CONVERSION ============

export async function convertLeadToOrganization(leadId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, ownerId: session.user.id },
    include: { leadContacts: true },
  });

  if (!lead) {
    throw new Error("Lead não encontrado");
  }

  if (lead.convertedAt) {
    throw new Error("Lead já foi convertido");
  }

  if (lead.leadContacts.length === 0) {
    throw new Error("Lead precisa ter pelo menos um contato antes de ser convertido");
  }

  // Transaction: Create Organization + Contacts
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create Organization from Lead
    const organization = await tx.organization.create({
      data: {
        name: lead.businessName,
        legalName: lead.registeredName,
        website: lead.website,
        phone: lead.phone,
        country: lead.country,
        state: lead.state,
        city: lead.city,
        zipCode: lead.zipCode,
        streetAddress: lead.address,
        industry: lead.primaryActivity,
        employeeCount: lead.employeesCount,
        annualRevenue: lead.revenue,
        taxId: lead.companyRegistrationID,
        description: lead.description,
        instagram: lead.instagram,
        facebook: lead.facebook,
        sourceLeadId: lead.id,
        ownerId: session.user.id,
      },
    });

    // 2. Create Contacts from LeadContacts
    const contacts = await Promise.all(
      lead.leadContacts.map(async (leadContact) => {
        const contact = await tx.contact.create({
          data: {
            name: leadContact.name,
            email: leadContact.email,
            phone: leadContact.phone,
            role: leadContact.role,
            organizationId: organization.id,
            sourceLeadContactId: leadContact.id,
            ownerId: session.user.id,
          },
        });

        // Update LeadContact with conversion info
        await tx.leadContact.update({
          where: { id: leadContact.id },
          data: { convertedToContactId: contact.id },
        });

        return contact;
      })
    );

    // 3. Update Lead as converted
    await tx.lead.update({
      where: { id: leadId },
      data: {
        status: "qualified",
        convertedAt: new Date(),
        convertedToOrganizationId: organization.id,
      },
    });

    return { organization, contacts };
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/organizations");
  revalidatePath(`/organizations/${result.organization.id}`);

  return result;
}
