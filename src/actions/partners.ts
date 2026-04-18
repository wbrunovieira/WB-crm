"use server";

import { prisma } from "@/lib/prisma";
import { getOwnerOrSharedFilter } from "@/lib/permissions";

// ============ READ (SSR) — mutações migradas para NestJS ============

export async function getPartners(filters?: { search?: string; owner?: string }) {
  const ownerFilter = await getOwnerOrSharedFilter("partner", filters?.owner);

  const partners = await prisma.partner.findMany({
    where: {
      ...ownerFilter,
      ...(filters?.search && {
        OR: [
          { name: { contains: filters.search } },
          { partnerType: { contains: filters.search } },
          { expertise: { contains: filters.search } },
        ],
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
  const ownerFilter = await getOwnerOrSharedFilter("partner");

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
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return partner;
}
