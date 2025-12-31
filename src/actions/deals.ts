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
  stageId?: string;
  valueRange?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  owner?: string;
}) {
  const ownerFilter = await getOwnerFilter(filters?.owner);

  // Build where clause
  const whereClause: {
    ownerId?: string;
    title?: { contains: string };
    status?: string;
    stageId?: string;
    value?: { gte?: number; lt?: number };
  } = {
    ...ownerFilter,
  };

  // Search filter (simple title search)
  if (filters?.search) {
    whereClause.title = { contains: filters.search };
  }

  // Status filter
  if (filters?.status && filters.status !== "all") {
    whereClause.status = filters.status;
  }

  // Stage filter
  if (filters?.stageId) {
    whereClause.stageId = filters.stageId;
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
  const orderByClause: { [key: string]: string } = {};
  if (filters?.sortBy) {
    const order = filters.sortOrder || "asc";
    orderByClause[filters.sortBy] = order;
  } else {
    orderByClause.createdAt = "desc";
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

  // Record initial stage in history
  if (validated.stageId) {
    await prisma.dealStageHistory.create({
      data: {
        dealId: deal.id,
        fromStageId: null, // null indicates deal creation
        toStageId: validated.stageId,
        changedById: session.user.id,
      },
    });
  }

  revalidatePath("/deals");
  return deal;
}

export async function updateDeal(id: string, data: DealFormData) {
  const session = await getAuthenticatedSession();

  const existingDeal = await prisma.deal.findUnique({ where: { id } });
  if (!existingDeal || !(await canAccessRecord(existingDeal.ownerId))) {
    throw new Error("Negócio não encontrado");
  }

  const validated = dealSchema.parse(data);

  // Check if stage changed
  const stageChanged = validated.stageId && existingDeal.stageId !== validated.stageId;

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

  // Record stage change in history
  if (stageChanged && validated.stageId) {
    await prisma.dealStageHistory.create({
      data: {
        dealId: id,
        fromStageId: existingDeal.stageId,
        toStageId: validated.stageId,
        changedById: session.user.id,
      },
    });
  }

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
  const session = await getAuthenticatedSession();

  const deal = await prisma.deal.findUnique({ where: { id } });
  if (!deal || !(await canAccessRecord(deal.ownerId))) {
    throw new Error("Negócio não encontrado");
  }

  // Only record if stage actually changed
  const stageChanged = deal.stageId !== stageId;

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

  // Record stage change in history
  if (stageChanged) {
    await prisma.dealStageHistory.create({
      data: {
        dealId: id,
        fromStageId: deal.stageId,
        toStageId: stageId,
        changedById: session.user.id,
      },
    });
  }

  revalidatePath("/deals");
  revalidatePath(`/deals/${id}`);
  revalidatePath("/pipeline");
  return updatedDeal;
}
