"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { dealSchema, type DealFormData } from "@/lib/validations/deal";
import {
  getAuthenticatedSession,
  getOwnerFilter,
  canAccessRecord,
} from "@/lib/permissions";

export async function getDeals(filters?: {
  search?: string;
  status?: string;
  valueRange?: string;
  sortBy?: string;
  owner?: string;
}) {
  const ownerFilter = await getOwnerFilter(filters?.owner);

  // Build where clause
  const whereClause: {
    ownerId?: string;
    OR?: Array<{
      title?: { contains: string };
      contact?: { name: { contains: string } };
      organization?: { name: { contains: string } };
    }>;
    status?: string;
    value?: { gte?: number; lt?: number };
  } = {
    ...ownerFilter,
  };

  // Search filter
  if (filters?.search) {
    whereClause.OR = [
      { title: { contains: filters.search } },
      { contact: { name: { contains: filters.search } } },
      { organization: { name: { contains: filters.search } } },
    ];
  }

  // Status filter
  if (filters?.status && filters.status !== "all") {
    whereClause.status = filters.status;
  }

  // Value range filter
  if (filters?.valueRange && filters.valueRange !== "all") {
    if (filters.valueRange === "0-10000") {
      whereClause.value = { lt: 10000 };
    } else if (filters.valueRange === "10000-50000") {
      whereClause.value = { gte: 10000, lt: 50000 };
    } else if (filters.valueRange === "50000-100000") {
      whereClause.value = { gte: 50000, lt: 100000 };
    } else if (filters.valueRange === "100000+") {
      whereClause.value = { gte: 100000 };
    }
  }

  // Build order by clause
  const orderByClause: Array<{ [key: string]: string }> = [];
  if (filters?.sortBy) {
    switch (filters.sortBy) {
      case "value-desc":
        orderByClause.push({ value: "desc" });
        break;
      case "value-asc":
        orderByClause.push({ value: "asc" });
        break;
      case "title":
        orderByClause.push({ title: "asc" });
        break;
      case "expectedCloseDate":
        orderByClause.push({ expectedCloseDate: "asc" });
        break;
      default:
        orderByClause.push({ createdAt: "desc" });
    }
  } else {
    orderByClause.push({ createdAt: "desc" });
  }

  const deals = await prisma.deal.findMany({
    where: whereClause,
    include: {
      contact: true,
      organization: true,
      stage: {
        include: {
          pipeline: true,
        },
      },
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      activities: {
        where: {
          completed: false,
        },
        orderBy: [
          {
            dueDate: {
              sort: "asc",
              nulls: "last",
            },
          },
          {
            createdAt: "desc",
          },
        ],
        take: 1,
        select: {
          id: true,
          subject: true,
          type: true,
          dueDate: true,
        },
      },
    },
    orderBy: orderByClause,
  });

  return deals;
}

export async function getDealById(id: string) {
  const ownerFilter = await getOwnerFilter();

  const deal = await prisma.deal.findFirst({
    where: {
      id,
      ...ownerFilter,
    },
    include: {
      contact: true,
      organization: true,
      stage: {
        include: {
          pipeline: true,
        },
      },
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      activities: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  return deal;
}

export async function createDeal(data: DealFormData) {
  const session = await getAuthenticatedSession();
  const validated = dealSchema.parse(data);

  const deal = await prisma.deal.create({
    data: {
      title: validated.title,
      value: validated.value,
      currency: validated.currency,
      status: validated.status,
      stageId: validated.stageId,
      contactId: validated.contactId,
      organizationId: validated.organizationId,
      expectedCloseDate: validated.expectedCloseDate,
      ownerId: session.user.id,
    },
    include: {
      contact: true,
      organization: true,
      stage: {
        include: {
          pipeline: true,
        },
      },
    },
  });

  revalidatePath("/deals");
  return deal;
}

export async function updateDeal(id: string, data: DealFormData) {
  await getAuthenticatedSession();

  const existingDeal = await prisma.deal.findUnique({ where: { id } });
  if (!existingDeal || !(await canAccessRecord(existingDeal.ownerId))) {
    throw new Error("Negócio não encontrado");
  }

  const validated = dealSchema.parse(data);

  const deal = await prisma.deal.update({
    where: { id },
    data: {
      title: validated.title,
      value: validated.value,
      currency: validated.currency,
      status: validated.status,
      stageId: validated.stageId,
      contactId: validated.contactId,
      organizationId: validated.organizationId,
      expectedCloseDate: validated.expectedCloseDate,
    },
    include: {
      contact: true,
      organization: true,
      stage: {
        include: {
          pipeline: true,
        },
      },
    },
  });

  revalidatePath("/deals");
  revalidatePath(`/deals/${id}`);
  return deal;
}

export async function deleteDeal(id: string) {
  await getAuthenticatedSession();

  const deal = await prisma.deal.findUnique({ where: { id } });
  if (!deal || !(await canAccessRecord(deal.ownerId))) {
    throw new Error("Negócio não encontrado");
  }

  await prisma.deal.delete({ where: { id } });

  revalidatePath("/deals");
}

export async function updateDealStage(id: string, stageId: string) {
  await getAuthenticatedSession();

  const deal = await prisma.deal.findUnique({ where: { id } });
  if (!deal || !(await canAccessRecord(deal.ownerId))) {
    throw new Error("Negócio não encontrado");
  }

  const updatedDeal = await prisma.deal.update({
    where: { id },
    data: { stageId },
    include: {
      contact: true,
      organization: true,
      stage: {
        include: {
          pipeline: true,
        },
      },
    },
  });

  revalidatePath("/deals");
  revalidatePath(`/deals/${id}`);
  revalidatePath("/pipeline");
  return updatedDeal;
}
