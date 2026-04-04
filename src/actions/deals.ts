"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { dealSchema, type DealFormData } from "@/lib/validations/deal";
import {
  getAuthenticatedSession,
  getOwnerOrSharedFilter,
  canAccessEntity,
} from "@/lib/permissions";

export async function getDeals(filters?: {
  search?: string;
  status?: string;
  stageId?: string;
  valueRange?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  owner?: string;
  closedMonth?: string; // "YYYY-MM" to filter won/lost by month, "all" to show all, undefined = current month
}) {
  const ownerFilter = await getOwnerOrSharedFilter("deal", filters?.owner);

  // Build additional filters
  const additionalFilters: Record<string, unknown> = {};

  // Search filter (simple title search)
  if (filters?.search) {
    additionalFilters.title = { contains: filters.search };
  }

  // Stage filter
  if (filters?.stageId) {
    additionalFilters.stageId = filters.stageId;
  }

  // Value range filter
  if (filters?.valueRange && filters.valueRange !== "all") {
    if (filters.valueRange === "0-10000") {
      additionalFilters.value = { lt: 10000 };
    } else if (filters.valueRange === "10000-50000") {
      additionalFilters.value = { gte: 10000, lt: 50000 };
    } else if (filters.valueRange === "50000-100000") {
      additionalFilters.value = { gte: 50000, lt: 100000 };
    } else if (filters.valueRange === "100000+") {
      additionalFilters.value = { gte: 100000 };
    }
  }

  // Date filtering for won/lost deals
  // Default behavior: show all open deals + won/lost only from current month
  // When user explicitly selects a status (won/lost), show all of that status (no date filter)
  // When closedMonth is "all", show everything
  // When closedMonth is "YYYY-MM", filter won/lost to that month
  const closedMonth = filters?.closedMonth;
  const explicitStatus = filters?.status && filters.status !== "all";

  if (explicitStatus) {
    // User explicitly filtered by status — show all of that status, no date restriction
    additionalFilters.status = filters.status;
  } else if (closedMonth === "all") {
    // Show all deals regardless of date
  } else {
    // Default: all open + won/lost from selected month (or current month)
    const now = new Date();
    let year: number, month: number;

    if (closedMonth && /^\d{4}-\d{2}$/.test(closedMonth)) {
      [year, month] = closedMonth.split("-").map(Number);
    } else {
      year = now.getFullYear();
      month = now.getMonth() + 1;
    }

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 1);

    // OR: status is open, OR status is won/lost AND closedAt within month
    additionalFilters.OR = [
      { status: "open" },
      {
        status: { in: ["won", "lost"] },
        closedAt: { gte: monthStart, lt: monthEnd },
      },
    ];
  }

  // Combine owner filter with additional filters
  // Use AND only when ownerFilter has OR (shared entities case)
  const hasSharedEntities = 'OR' in ownerFilter;
  const hasAdditionalFilters = Object.keys(additionalFilters).length > 0;

  let whereClause: Record<string, unknown>;
  if (hasSharedEntities && hasAdditionalFilters) {
    whereClause = { AND: [ownerFilter, additionalFilters] };
  } else if (hasAdditionalFilters) {
    whereClause = { ...ownerFilter, ...additionalFilters };
  } else {
    whereClause = ownerFilter;
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
  const ownerFilter = await getOwnerOrSharedFilter("deal");

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
      stageHistory: {
        include: {
          fromStage: { select: { id: true, name: true } },
          toStage: { select: { id: true, name: true } },
          changedBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: {
          changedAt: "desc",
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
      description: validated.description,
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
  if (!existingDeal || !(await canAccessEntity("deal", id, existingDeal.ownerId))) {
    throw new Error("Negócio não encontrado");
  }

  const validated = dealSchema.parse(data);

  // Check if stage changed
  const stageChanged = validated.stageId && existingDeal.stageId !== validated.stageId;

  // Set closedAt when status changes to won/lost, clear when reopening
  const statusChanged = validated.status !== existingDeal.status;
  let closedAt: Date | null | undefined;
  if (statusChanged) {
    if (validated.status === "won" || validated.status === "lost") {
      closedAt = existingDeal.closedAt || new Date();
    } else {
      closedAt = null;
    }
  }

  const deal = await prisma.deal.update({
    where: { id },
    data: {
      title: validated.title,
      description: validated.description,
      value: validated.value,
      currency: validated.currency,
      status: validated.status,
      stageId: validated.stageId,
      contactId: validated.contactId,
      organizationId: validated.organizationId,
      expectedCloseDate: validated.expectedCloseDate,
      ...(closedAt !== undefined && { closedAt }),
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
  if (!deal || !(await canAccessEntity("deal", id, deal.ownerId))) {
    throw new Error("Negócio não encontrado");
  }

  await prisma.deal.delete({ where: { id } });

  revalidatePath("/deals");
}

export async function updateDealStage(id: string, stageId: string) {
  const session = await getAuthenticatedSession();

  const deal = await prisma.deal.findUnique({ where: { id } });
  if (!deal || !(await canAccessEntity("deal", id, deal.ownerId))) {
    throw new Error("Negócio não encontrado");
  }

  // Only record if stage actually changed
  const stageChanged = deal.stageId !== stageId;

  // Auto-sync status based on stage probability
  const targetStage = await prisma.stage.findUnique({
    where: { id: stageId },
    select: { probability: true },
  });

  let newStatus = deal.status;
  if (targetStage) {
    if (targetStage.probability === 0) {
      newStatus = "lost";
    } else if (targetStage.probability === 100) {
      newStatus = "won";
    } else if (deal.status !== "open") {
      newStatus = "open";
    }
  }

  // Set closedAt when closing, clear when reopening
  const closedAt = (newStatus === "won" || newStatus === "lost")
    ? (deal.closedAt || new Date())  // Keep existing closedAt if already set
    : null;

  const updatedDeal = await prisma.deal.update({
    where: { id },
    data: { stageId, status: newStatus, closedAt },
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

export async function updateStageHistoryDate(historyId: string, newDate: Date) {
  await getAuthenticatedSession();

  const history = await prisma.dealStageHistory.findUnique({
    where: { id: historyId },
    select: { dealId: true },
  });

  if (!history) {
    throw new Error("Registro não encontrado");
  }

  await prisma.dealStageHistory.update({
    where: { id: historyId },
    data: { changedAt: newDate },
  });

  revalidatePath(`/deals/${history.dealId}`);
}
