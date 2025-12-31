"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { partnerSchema, PartnerFormData } from "@/lib/validations/partner";
import {
  getAuthenticatedSession,
  getOwnerFilter,
  canAccessRecord,
} from "@/lib/permissions";

export async function getPartners(search?: string) {
  const ownerFilter = await getOwnerFilter();

  const partners = await prisma.partner.findMany({
    where: {
      ...ownerFilter,
      ...(search && {
        OR: [
          { name: { contains: search } },
          { company: { contains: search } },
          { partnerType: { contains: search } },
          { expertise: { contains: search } },
        ],
      }),
    },
    include: {
      _count: {
        select: {
          activities: true,
          referredLeads: true,
        },
      },
    },
    orderBy: {
      lastContactDate: "desc",
    },
  });

  return partners;
}

export async function getPartnerById(id: string) {
  const ownerFilter = await getOwnerFilter();

  const partner = await prisma.partner.findFirst({
    where: {
      id,
      ...ownerFilter,
    },
    include: {
      contacts: {
        orderBy: {
          name: "asc",
        },
      },
      activities: {
        orderBy: {
          createdAt: "desc",
        },
      },
      referredLeads: {
        orderBy: {
          createdAt: "desc",
        },
        include: {
          convertedOrganization: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      _count: {
        select: {
          contacts: true,
          activities: true,
          referredLeads: true,
        },
      },
    },
  });

  return partner;
}

export async function createPartner(data: PartnerFormData) {
  const session = await getAuthenticatedSession();
  const validated = partnerSchema.parse(data);

  const partner = await prisma.partner.create({
    data: {
      name: validated.name,
      legalName: validated.legalName || null,
      foundationDate: validated.foundationDate ? new Date(validated.foundationDate) : null,
      partnerType: validated.partnerType,
      website: validated.website || null,
      email: validated.email || null,
      phone: validated.phone || null,
      whatsapp: validated.whatsapp || null,
      country: validated.country || null,
      state: validated.state || null,
      city: validated.city || null,
      zipCode: validated.zipCode || null,
      streetAddress: validated.streetAddress || null,
      linkedin: validated.linkedin || null,
      instagram: validated.instagram || null,
      facebook: validated.facebook || null,
      twitter: validated.twitter || null,
      industry: validated.industry || null,
      employeeCount: validated.employeeCount || null,
      description: validated.description || null,
      expertise: validated.expertise || null,
      notes: validated.notes || null,
      lastContactDate: new Date(),
      ownerId: session.user.id,
    },
  });

  revalidatePath("/partners");
  return partner;
}

export async function updatePartner(id: string, data: PartnerFormData) {
  await getAuthenticatedSession();
  const validated = partnerSchema.parse(data);

  // Check ownership
  const existing = await prisma.partner.findUnique({ where: { id } });
  if (!existing || !(await canAccessRecord(existing.ownerId))) {
    throw new Error("Parceiro não encontrado");
  }

  const partner = await prisma.partner.update({
    where: { id },
    data: {
      name: validated.name,
      legalName: validated.legalName || null,
      foundationDate: validated.foundationDate ? new Date(validated.foundationDate) : null,
      partnerType: validated.partnerType,
      website: validated.website || null,
      email: validated.email || null,
      phone: validated.phone || null,
      whatsapp: validated.whatsapp || null,
      country: validated.country || null,
      state: validated.state || null,
      city: validated.city || null,
      zipCode: validated.zipCode || null,
      streetAddress: validated.streetAddress || null,
      linkedin: validated.linkedin || null,
      instagram: validated.instagram || null,
      facebook: validated.facebook || null,
      twitter: validated.twitter || null,
      industry: validated.industry || null,
      employeeCount: validated.employeeCount || null,
      description: validated.description || null,
      expertise: validated.expertise || null,
      notes: validated.notes || null,
    },
  });

  revalidatePath("/partners");
  revalidatePath(`/partners/${id}`);
  return partner;
}

export async function deletePartner(id: string) {
  await getAuthenticatedSession();

  // Check ownership
  const existing = await prisma.partner.findUnique({ where: { id } });
  if (!existing || !(await canAccessRecord(existing.ownerId))) {
    throw new Error("Parceiro não encontrado");
  }

  await prisma.partner.delete({ where: { id } });

  revalidatePath("/partners");
}

export async function updatePartnerLastContact(id: string) {
  await getAuthenticatedSession();

  // Check ownership
  const existing = await prisma.partner.findUnique({ where: { id } });
  if (!existing || !(await canAccessRecord(existing.ownerId))) {
    throw new Error("Parceiro não encontrado");
  }

  const partner = await prisma.partner.update({
    where: { id },
    data: { lastContactDate: new Date() },
  });

  revalidatePath(`/partners/${id}`);
  return partner;
}
