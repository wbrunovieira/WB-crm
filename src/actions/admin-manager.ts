"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  dateRangeSchema,
  getDateRangeFromPeriod,
  getPreviousPeriodRange,
  type DateRangeInput,
} from "@/lib/validations/manager";

// ==================== Types ====================

export interface UserMetrics {
  userId: string;
  userName: string;
  userEmail: string;
  leads: {
    created: number;
    converted: number;
    conversionRate: number;
  };
  organizations: {
    created: number;
  };
  deals: {
    created: number;
    won: number;
    lost: number;
    open: number;
    totalValue: number;
    avgValue: number;
  };
  contacts: {
    created: number;
  };
  partners: {
    created: number;
  };
  activities: {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
    byType: Record<string, number>;
  };
  stageChanges: number;
}

export interface TotalMetrics {
  leads: {
    total: number;
    converted: number;
    conversionRate: number;
  };
  organizations: {
    total: number;
  };
  deals: {
    total: number;
    won: number;
    lost: number;
    open: number;
    totalValue: number;
    avgValue: number;
    byStage: { stageId: string; stageName: string; count: number; value: number }[];
  };
  contacts: {
    total: number;
  };
  partners: {
    total: number;
    byType: Record<string, number>;
  };
  activities: {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
    byType: Record<string, number>;
  };
  stageChanges: {
    total: number;
    byStage: { fromStage: string; toStage: string; count: number }[];
  };
}

export interface ManagerStats {
  period: {
    startDate: string;
    endDate: string;
  };
  byUser: UserMetrics[];
  totals: TotalMetrics;
  comparison?: {
    leads: number; // percentage change
    organizations: number;
    deals: number;
    dealsValue: number;
    contacts: number;
    partners: number;
    activities: number;
  };
}

// ==================== Helper Functions ====================

function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return Math.round(((current - previous) / previous) * 100);
}

// ==================== Main Functions ====================

/**
 * Get all manager statistics for the admin dashboard
 */
export async function getManagerStats(input: DateRangeInput): Promise<ManagerStats> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  // Only admin can access
  if (session.user.role?.toLowerCase() !== "admin") {
    throw new Error("Acesso restrito a administradores");
  }

  // Validate and parse input
  const validated = dateRangeSchema.parse(input);

  // Get date range
  let startDate: Date;
  let endDate: Date;

  if (validated.period === "custom" && validated.startDate && validated.endDate) {
    startDate = validated.startDate;
    endDate = validated.endDate;
  } else {
    const range = getDateRangeFromPeriod(validated.period);
    startDate = range.startDate;
    endDate = range.endDate;
  }

  // Get all users
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  // Fetch all data in parallel
  const [
    leads,
    organizations,
    deals,
    contacts,
    partners,
    activities,
    stageChanges,
    stages,
  ] = await Promise.all([
    // Leads
    prisma.lead.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        ownerId: true,
        status: true,
        convertedAt: true,
      },
    }),
    // Organizations
    prisma.organization.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        ownerId: true,
      },
    }),
    // Deals
    prisma.deal.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        ownerId: true,
        status: true,
        value: true,
        stageId: true,
        stage: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    // Contacts
    prisma.contact.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        ownerId: true,
      },
    }),
    // Partners
    prisma.partner.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        ownerId: true,
        partnerType: true,
      },
    }),
    // Activities
    prisma.activity.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        ownerId: true,
        type: true,
        completed: true,
        dueDate: true,
      },
    }),
    // Stage changes
    prisma.dealStageHistory.findMany({
      where: {
        changedAt: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        changedById: true,
        fromStage: {
          select: { name: true },
        },
        toStage: {
          select: { name: true },
        },
      },
    }),
    // All stages for reference
    prisma.stage.findMany({
      select: {
        id: true,
        name: true,
      },
    }),
  ]);

  const now = new Date();

  // Calculate metrics by user
  const byUser: UserMetrics[] = users.map((user) => {
    const userLeads = leads.filter((l) => l.ownerId === user.id);
    const userOrgs = organizations.filter((o) => o.ownerId === user.id);
    const userDeals = deals.filter((d) => d.ownerId === user.id);
    const userContacts = contacts.filter((c) => c.ownerId === user.id);
    const userPartners = partners.filter((p) => p.ownerId === user.id);
    const userActivities = activities.filter((a) => a.ownerId === user.id);
    const userStageChanges = stageChanges.filter((s) => s.changedById === user.id);

    const convertedLeads = userLeads.filter((l) => l.convertedAt !== null).length;
    const wonDeals = userDeals.filter((d) => d.status === "won");
    const lostDeals = userDeals.filter((d) => d.status === "lost");
    const openDeals = userDeals.filter((d) => d.status === "open");

    const totalValue = userDeals.reduce((sum, d) => sum + (d.value || 0), 0);
    const completedActivities = userActivities.filter((a) => a.completed);
    const pendingActivities = userActivities.filter((a) => !a.completed);
    const overdueActivities = userActivities.filter(
      (a) => !a.completed && a.dueDate && new Date(a.dueDate) < now
    );

    // Activities by type
    const activityByType: Record<string, number> = {};
    userActivities.forEach((a) => {
      activityByType[a.type] = (activityByType[a.type] || 0) + 1;
    });

    return {
      userId: user.id,
      userName: user.name || "Sem nome",
      userEmail: user.email,
      leads: {
        created: userLeads.length,
        converted: convertedLeads,
        conversionRate: userLeads.length > 0 ? Math.round((convertedLeads / userLeads.length) * 100) : 0,
      },
      organizations: {
        created: userOrgs.length,
      },
      deals: {
        created: userDeals.length,
        won: wonDeals.length,
        lost: lostDeals.length,
        open: openDeals.length,
        totalValue,
        avgValue: userDeals.length > 0 ? totalValue / userDeals.length : 0,
      },
      contacts: {
        created: userContacts.length,
      },
      partners: {
        created: userPartners.length,
      },
      activities: {
        total: userActivities.length,
        completed: completedActivities.length,
        pending: pendingActivities.length,
        overdue: overdueActivities.length,
        byType: activityByType,
      },
      stageChanges: userStageChanges.length,
    };
  });

  // Filter out users with no activity
  const activeUsers = byUser.filter(
    (u) =>
      u.leads.created > 0 ||
      u.organizations.created > 0 ||
      u.deals.created > 0 ||
      u.contacts.created > 0 ||
      u.partners.created > 0 ||
      u.activities.total > 0 ||
      u.stageChanges > 0
  );

  // Calculate totals
  const convertedLeadsTotal = leads.filter((l) => l.convertedAt !== null).length;
  const wonDealsTotal = deals.filter((d) => d.status === "won");
  const lostDealsTotal = deals.filter((d) => d.status === "lost");
  const openDealsTotal = deals.filter((d) => d.status === "open");
  const totalValueAll = deals.reduce((sum, d) => sum + (d.value || 0), 0);

  // Deals by stage
  const dealsByStage = stages.map((stage) => {
    const stageDeals = deals.filter((d) => d.stageId === stage.id);
    return {
      stageId: stage.id,
      stageName: stage.name,
      count: stageDeals.length,
      value: stageDeals.reduce((sum, d) => sum + (d.value || 0), 0),
    };
  }).filter((s) => s.count > 0);

  // Partners by type
  const partnersByType: Record<string, number> = {};
  partners.forEach((p) => {
    if (p.partnerType) {
      partnersByType[p.partnerType] = (partnersByType[p.partnerType] || 0) + 1;
    }
  });

  // Activities by type
  const activitiesByType: Record<string, number> = {};
  activities.forEach((a) => {
    activitiesByType[a.type] = (activitiesByType[a.type] || 0) + 1;
  });

  const completedActivitiesTotal = activities.filter((a) => a.completed);
  const pendingActivitiesTotal = activities.filter((a) => !a.completed);
  const overdueActivitiesTotal = activities.filter(
    (a) => !a.completed && a.dueDate && new Date(a.dueDate) < now
  );

  // Stage changes summary
  const stageChangesSummary: { fromStage: string; toStage: string; count: number }[] = [];
  const stageChangeMap = new Map<string, number>();

  stageChanges.forEach((sc) => {
    const key = `${sc.fromStage?.name || "Início"} → ${sc.toStage.name}`;
    stageChangeMap.set(key, (stageChangeMap.get(key) || 0) + 1);
  });

  stageChangeMap.forEach((count, key) => {
    const [fromStage, toStage] = key.split(" → ");
    stageChangesSummary.push({ fromStage, toStage, count });
  });

  const totals: TotalMetrics = {
    leads: {
      total: leads.length,
      converted: convertedLeadsTotal,
      conversionRate: leads.length > 0 ? Math.round((convertedLeadsTotal / leads.length) * 100) : 0,
    },
    organizations: {
      total: organizations.length,
    },
    deals: {
      total: deals.length,
      won: wonDealsTotal.length,
      lost: lostDealsTotal.length,
      open: openDealsTotal.length,
      totalValue: totalValueAll,
      avgValue: deals.length > 0 ? totalValueAll / deals.length : 0,
      byStage: dealsByStage,
    },
    contacts: {
      total: contacts.length,
    },
    partners: {
      total: partners.length,
      byType: partnersByType,
    },
    activities: {
      total: activities.length,
      completed: completedActivitiesTotal.length,
      pending: pendingActivitiesTotal.length,
      overdue: overdueActivitiesTotal.length,
      byType: activitiesByType,
    },
    stageChanges: {
      total: stageChanges.length,
      byStage: stageChangesSummary,
    },
  };

  // Calculate comparison with previous period
  const previousPeriod = getPreviousPeriodRange(startDate, endDate);

  const [
    prevLeads,
    prevOrganizations,
    prevDeals,
    prevContacts,
    prevPartners,
    prevActivities,
  ] = await Promise.all([
    prisma.lead.count({
      where: {
        createdAt: { gte: previousPeriod.startDate, lte: previousPeriod.endDate },
      },
    }),
    prisma.organization.count({
      where: {
        createdAt: { gte: previousPeriod.startDate, lte: previousPeriod.endDate },
      },
    }),
    prisma.deal.aggregate({
      where: {
        createdAt: { gte: previousPeriod.startDate, lte: previousPeriod.endDate },
      },
      _count: true,
      _sum: { value: true },
    }),
    prisma.contact.count({
      where: {
        createdAt: { gte: previousPeriod.startDate, lte: previousPeriod.endDate },
      },
    }),
    prisma.partner.count({
      where: {
        createdAt: { gte: previousPeriod.startDate, lte: previousPeriod.endDate },
      },
    }),
    prisma.activity.count({
      where: {
        createdAt: { gte: previousPeriod.startDate, lte: previousPeriod.endDate },
      },
    }),
  ]);

  const comparison = {
    leads: calculatePercentageChange(leads.length, prevLeads),
    organizations: calculatePercentageChange(organizations.length, prevOrganizations),
    deals: calculatePercentageChange(deals.length, prevDeals._count),
    dealsValue: calculatePercentageChange(
      totalValueAll,
      prevDeals._sum.value || 0
    ),
    contacts: calculatePercentageChange(contacts.length, prevContacts),
    partners: calculatePercentageChange(partners.length, prevPartners),
    activities: calculatePercentageChange(activities.length, prevActivities),
  };

  return {
    period: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
    byUser: activeUsers,
    totals,
    comparison,
  };
}

/**
 * Record a stage change in deal history
 */
export async function recordDealStageChange(
  dealId: string,
  fromStageId: string | null,
  toStageId: string
): Promise<void> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  await prisma.dealStageHistory.create({
    data: {
      dealId,
      fromStageId,
      toStageId,
      changedById: session.user.id,
    },
  });
}

/**
 * Get timeline data for charts (leads/deals over time)
 */
export async function getTimelineData(input: DateRangeInput) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  if (session.user.role?.toLowerCase() !== "admin") {
    throw new Error("Acesso restrito a administradores");
  }

  const validated = dateRangeSchema.parse(input);

  let startDate: Date;
  let endDate: Date;

  if (validated.period === "custom" && validated.startDate && validated.endDate) {
    startDate = validated.startDate;
    endDate = validated.endDate;
  } else {
    const range = getDateRangeFromPeriod(validated.period);
    startDate = range.startDate;
    endDate = range.endDate;
  }

  // Get leads and deals with dates
  const [leads, deals] = await Promise.all([
    prisma.lead.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        createdAt: true,
        convertedAt: true,
      },
    }),
    prisma.deal.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        createdAt: true,
        status: true,
        value: true,
      },
    }),
  ]);

  // Group by day
  const dayMap = new Map<string, { leads: number; converted: number; deals: number; dealsValue: number }>();

  leads.forEach((lead) => {
    const day = lead.createdAt.toISOString().split("T")[0];
    const existing = dayMap.get(day) || { leads: 0, converted: 0, deals: 0, dealsValue: 0 };
    existing.leads++;
    if (lead.convertedAt) {
      existing.converted++;
    }
    dayMap.set(day, existing);
  });

  deals.forEach((deal) => {
    const day = deal.createdAt.toISOString().split("T")[0];
    const existing = dayMap.get(day) || { leads: 0, converted: 0, deals: 0, dealsValue: 0 };
    existing.deals++;
    existing.dealsValue += deal.value || 0;
    dayMap.set(day, existing);
  });

  // Convert to array and sort
  const timeline = Array.from(dayMap.entries())
    .map(([date, data]) => ({
      date,
      ...data,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return timeline;
}
