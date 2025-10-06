"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { partnerSchema, PartnerFormData } from "@/lib/validations/partner";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getPartners(search?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const partners = await prisma.partner.findMany({
    where: {
      ownerId: session.user.id,
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
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const partner = await prisma.partner.findFirst({
    where: {
      id,
      ownerId: session.user.id,
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
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Não autorizado");
  }

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
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const validated = partnerSchema.parse(data);

  const partner = await prisma.partner.update({
    where: {
      id,
      ownerId: session.user.id,
    },
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
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  await prisma.partner.delete({
    where: {
      id,
      ownerId: session.user.id,
    },
  });

  revalidatePath("/partners");
}

export async function updatePartnerLastContact(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const partner = await prisma.partner.update({
    where: {
      id,
      ownerId: session.user.id,
    },
    data: {
      lastContactDate: new Date(),
    },
  });

  revalidatePath(`/partners/${id}`);
  return partner;
}
