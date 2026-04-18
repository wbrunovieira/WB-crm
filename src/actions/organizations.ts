"use server";

import { prisma } from "@/lib/prisma";
import {
  getOwnerOrSharedFilter,
} from "@/lib/permissions";

// ============ READ (SSR) — individual migrations migrado para NestJS ============

export async function getOrganizations(filters?: { search?: string; owner?: string; hasHosting?: boolean }) {
  const ownerFilter = await getOwnerOrSharedFilter("organization", filters?.owner);

  const organizations = await prisma.organization.findMany({
    where: {
      ...ownerFilter,
      ...(filters?.search && {
        OR: [{ name: { contains: filters.search } }, { website: { contains: filters.search } }],
      }),
      ...(filters?.hasHosting !== undefined && {
        hasHosting: filters.hasHosting,
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
