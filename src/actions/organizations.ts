"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  organizationSchema,
  OrganizationFormData,
} from "@/lib/validations/organization";
import {
  getAuthenticatedSession,
  getOwnerOrSharedFilter,
  canAccessEntity,
} from "@/lib/permissions";

export async function getOrganizations(filters?: { search?: string; owner?: string }) {
  const ownerFilter = await getOwnerOrSharedFilter("organization", filters?.owner);

  const organizations = await prisma.organization.findMany({
    where: {
      ...ownerFilter,
      ...(filters?.search && {
        OR: [{ name: { contains: filters.search } }, { website: { contains: filters.search } }],
      }),
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
        },
      },
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
  const ownerFilter = await getOwnerOrSharedFilter("organization");

  const organization = await prisma.organization.findFirst({
    where: {
      id,
      ...ownerFilter,
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
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
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
      ...ownerFilter,
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
  const session = await getAuthenticatedSession();
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
  await getAuthenticatedSession();
  const validated = organizationSchema.parse(data);

  // Check ownership or shared access
  const existing = await prisma.organization.findUnique({ where: { id } });
  if (!existing || !(await canAccessEntity("organization", id, existing.ownerId))) {
    throw new Error("Organização não encontrada");
  }

  const organization = await prisma.organization.update({
    where: { id },
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
  await getAuthenticatedSession();

  // Check ownership or shared access
  const existing = await prisma.organization.findUnique({ where: { id } });
  if (!existing || !(await canAccessEntity("organization", id, existing.ownerId))) {
    throw new Error("Organização não encontrada");
  }

  await prisma.organization.delete({ where: { id } });

  revalidatePath("/organizations");
}
