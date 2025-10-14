"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  organizationSchema,
  OrganizationFormData,
} from "@/lib/validations/organization";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getOrganizations(search?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Não autorizado");
  }

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

  return organizations;
}

export async function getOrganizationById(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const organization = await prisma.organization.findFirst({
    where: {
      id,
      ownerId: session.user.id,
    },
    include: {
      primaryCNAE: true,
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
          activities: {
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          },
        },
      },
    },
  });

  if (!organization) {
    return null;
  }

  // Get all activities related to this organization (through deals and contacts)
  const activities = await prisma.activity.findMany({
    where: {
      ownerId: session.user.id,
      OR: [
        {
          deal: {
            organizationId: id,
          },
        },
        {
          contact: {
            organizationId: id,
          },
        },
      ],
    },
    include: {
      deal: {
        select: {
          title: true,
        },
      },
      contact: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return {
    ...organization,
    activities,
  };
}

export async function createOrganization(data: OrganizationFormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const validated = organizationSchema.parse(data);

  const organization = await prisma.organization.create({
    data: {
      name: validated.name,
      legalName: validated.legalName || null,
      foundationDate: validated.foundationDate ? new Date(validated.foundationDate) : null,
      website: validated.website || null,
      phone: validated.phone || null,
      whatsapp: validated.whatsapp || null,
      email: validated.email || null,
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
      companyOwner: validated.companyOwner || null,
      companySize: validated.companySize || null,
      primaryCNAEId: validated.primaryCNAEId || null,
      internationalActivity: validated.internationalActivity || null,
      instagram: validated.instagram || null,
      linkedin: validated.linkedin || null,
      facebook: validated.facebook || null,
      twitter: validated.twitter || null,
      tiktok: validated.tiktok || null,
      labelId: validated.labelId || null,
      ownerId: session.user.id,
    },
  });

  revalidatePath("/organizations");
  return organization;
}

export async function updateOrganization(
  id: string,
  data: OrganizationFormData
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const validated = organizationSchema.parse(data);

  const organization = await prisma.organization.update({
    where: {
      id,
      ownerId: session.user.id,
    },
    data: {
      name: validated.name,
      legalName: validated.legalName || null,
      foundationDate: validated.foundationDate ? new Date(validated.foundationDate) : null,
      website: validated.website || null,
      phone: validated.phone || null,
      whatsapp: validated.whatsapp || null,
      email: validated.email || null,
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
      companyOwner: validated.companyOwner || null,
      companySize: validated.companySize || null,
      primaryCNAEId: validated.primaryCNAEId || null,
      internationalActivity: validated.internationalActivity || null,
      instagram: validated.instagram || null,
      linkedin: validated.linkedin || null,
      facebook: validated.facebook || null,
      twitter: validated.twitter || null,
      tiktok: validated.tiktok || null,
      labelId: validated.labelId || null,
    },
  });

  revalidatePath("/organizations");
  revalidatePath(`/organizations/${id}`);
  return organization;
}

export async function deleteOrganization(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  await prisma.organization.delete({
    where: {
      id,
      ownerId: session.user.id,
    },
  });

  revalidatePath("/organizations");
}
