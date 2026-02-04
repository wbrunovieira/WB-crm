"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  applyLeadCadenceSchema,
  type ApplyLeadCadenceData,
} from "@/lib/validations/cadence";
import {
  getAuthenticatedSession,
  getOwnerFilter,
} from "@/lib/permissions";
import { addDays } from "date-fns";

/**
 * Apply a cadence to a lead - creates all activities automatically
 */
export async function applyCadenceToLead(data: ApplyLeadCadenceData) {
  const session = await getAuthenticatedSession();
  const validated = applyLeadCadenceSchema.parse(data);
  const ownerFilter = await getOwnerFilter();

  // Verify lead access
  const lead = await prisma.lead.findFirst({
    where: {
      id: validated.leadId,
      ...ownerFilter,
    },
    include: {
      leadContacts: {
        where: { isPrimary: true },
        take: 1,
      },
    },
  });

  if (!lead) {
    throw new Error("Lead não encontrado");
  }

  // Verify cadence access and get steps
  const cadence = await prisma.cadence.findFirst({
    where: {
      id: validated.cadenceId,
      ...ownerFilter,
      status: "active",
    },
    include: {
      steps: {
        orderBy: [{ dayNumber: "asc" }, { order: "asc" }],
      },
    },
  });

  if (!cadence) {
    throw new Error("Cadência não encontrada ou inativa");
  }

  if (cadence.steps.length === 0) {
    throw new Error("Cadência não possui etapas definidas");
  }

  // Check if cadence already applied to this lead
  const existingLeadCadence = await prisma.leadCadence.findUnique({
    where: {
      leadId_cadenceId: {
        leadId: validated.leadId,
        cadenceId: validated.cadenceId,
      },
    },
  });

  if (existingLeadCadence) {
    throw new Error("Esta cadência já foi aplicada a este lead");
  }

  const startDate = validated.startDate || new Date();

  // Create LeadCadence and all activities in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create LeadCadence
    const leadCadence = await tx.leadCadence.create({
      data: {
        leadId: validated.leadId,
        cadenceId: validated.cadenceId,
        status: "active",
        startDate,
        notes: validated.notes,
        ownerId: session.user.id,
      },
    });

    // Create activities for each step
    const activitiesData = [];

    for (const step of cadence.steps) {
      const dueDate = addDays(startDate, step.dayNumber - 1); // Day 1 = startDate

      // Create activity with channel as type
      const activity = await tx.activity.create({
        data: {
          type: step.channel,
          subject: step.subject,
          description: step.description,
          dueDate,
          completed: false,
          leadId: validated.leadId,
          ownerId: session.user.id,
        },
      });

      // Create LeadCadenceActivity link
      await tx.leadCadenceActivity.create({
        data: {
          leadCadenceId: leadCadence.id,
          cadenceStepId: step.id,
          activityId: activity.id,
          scheduledDate: dueDate,
        },
      });

      activitiesData.push(activity);
    }

    return { leadCadence, activities: activitiesData };
  });

  revalidatePath(`/leads/${validated.leadId}`);
  revalidatePath("/activities");
  revalidatePath("/activities/calendar");

  return result;
}

/**
 * Get all cadences applied to a lead
 */
export async function getLeadCadences(leadId: string) {
  await getAuthenticatedSession();
  const ownerFilter = await getOwnerFilter();

  // Verify lead access
  const lead = await prisma.lead.findFirst({
    where: {
      id: leadId,
      ...ownerFilter,
    },
  });

  if (!lead) {
    throw new Error("Lead não encontrado");
  }

  const leadCadences = await prisma.leadCadence.findMany({
    where: { leadId },
    include: {
      cadence: {
        select: {
          id: true,
          name: true,
          slug: true,
          durationDays: true,
          icp: {
            select: { id: true, name: true },
          },
          _count: {
            select: { steps: true },
          },
        },
      },
      activities: {
        include: {
          cadenceStep: {
            select: {
              id: true,
              dayNumber: true,
              channel: true,
              subject: true,
            },
          },
          activity: {
            select: {
              id: true,
              type: true,
              subject: true,
              completed: true,
              dueDate: true,
            },
          },
        },
        orderBy: {
          scheduledDate: "asc",
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Calculate progress for each lead cadence
  return leadCadences.map((lc) => {
    const totalSteps = lc.activities.length;
    const completedSteps = lc.activities.filter((a) => a.activity.completed).length;
    const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    return {
      ...lc,
      progress,
      completedSteps,
      totalSteps,
    };
  });
}

/**
 * Pause a lead cadence
 */
export async function pauseLeadCadence(id: string) {
  await getAuthenticatedSession();
  const ownerFilter = await getOwnerFilter();

  const leadCadence = await prisma.leadCadence.findFirst({
    where: {
      id,
      ...ownerFilter,
    },
  });

  if (!leadCadence) {
    throw new Error("Cadência do lead não encontrada");
  }

  if (leadCadence.status !== "active") {
    throw new Error("Apenas cadências ativas podem ser pausadas");
  }

  const updated = await prisma.leadCadence.update({
    where: { id },
    data: {
      status: "paused",
      pausedAt: new Date(),
    },
  });

  revalidatePath(`/leads/${leadCadence.leadId}`);
  return updated;
}

/**
 * Resume a paused lead cadence
 */
export async function resumeLeadCadence(id: string) {
  await getAuthenticatedSession();
  const ownerFilter = await getOwnerFilter();

  const leadCadence = await prisma.leadCadence.findFirst({
    where: {
      id,
      ...ownerFilter,
    },
    include: {
      activities: {
        include: {
          activity: true,
        },
        orderBy: {
          scheduledDate: "asc",
        },
      },
    },
  });

  if (!leadCadence) {
    throw new Error("Cadência do lead não encontrada");
  }

  if (leadCadence.status !== "paused") {
    throw new Error("Apenas cadências pausadas podem ser retomadas");
  }

  // Calculate days paused and adjust remaining activity dates
  const daysPaused = leadCadence.pausedAt
    ? Math.ceil((Date.now() - leadCadence.pausedAt.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Update pending activity due dates
  await prisma.$transaction(
    leadCadence.activities
      .filter((a) => !a.activity.completed)
      .map((a) =>
        prisma.activity.update({
          where: { id: a.activityId },
          data: {
            dueDate: a.activity.dueDate
              ? addDays(a.activity.dueDate, daysPaused)
              : null,
          },
        })
      )
  );

  const updated = await prisma.leadCadence.update({
    where: { id },
    data: {
      status: "active",
      pausedAt: null,
    },
  });

  revalidatePath(`/leads/${leadCadence.leadId}`);
  revalidatePath("/activities");
  return updated;
}

/**
 * Cancel a lead cadence
 */
export async function cancelLeadCadence(id: string) {
  await getAuthenticatedSession();
  const ownerFilter = await getOwnerFilter();

  const leadCadence = await prisma.leadCadence.findFirst({
    where: {
      id,
      ...ownerFilter,
    },
  });

  if (!leadCadence) {
    throw new Error("Cadência do lead não encontrada");
  }

  if (leadCadence.status === "completed" || leadCadence.status === "cancelled") {
    throw new Error("Cadência já finalizada");
  }

  const updated = await prisma.leadCadence.update({
    where: { id },
    data: {
      status: "cancelled",
      cancelledAt: new Date(),
    },
  });

  revalidatePath(`/leads/${leadCadence.leadId}`);
  return updated;
}

/**
 * Mark a lead cadence as completed
 */
export async function completeLeadCadence(id: string) {
  await getAuthenticatedSession();
  const ownerFilter = await getOwnerFilter();

  const leadCadence = await prisma.leadCadence.findFirst({
    where: {
      id,
      ...ownerFilter,
    },
  });

  if (!leadCadence) {
    throw new Error("Cadência do lead não encontrada");
  }

  const updated = await prisma.leadCadence.update({
    where: { id },
    data: {
      status: "completed",
      completedAt: new Date(),
    },
  });

  revalidatePath(`/leads/${leadCadence.leadId}`);
  return updated;
}

/**
 * Get available cadences for a lead (based on linked ICPs)
 */
export async function getAvailableCadencesForLead(leadId: string) {
  await getAuthenticatedSession();
  const ownerFilter = await getOwnerFilter();

  // Get lead with ICPs
  const lead = await prisma.lead.findFirst({
    where: {
      id: leadId,
      ...ownerFilter,
    },
    include: {
      icps: {
        select: { icpId: true },
      },
      leadCadences: {
        select: { cadenceId: true },
      },
    },
  });

  if (!lead) {
    throw new Error("Lead não encontrado");
  }

  const linkedICPIds = lead.icps.map((i) => i.icpId);
  const appliedCadenceIds = lead.leadCadences.map((lc) => lc.cadenceId);

  // Get cadences: generic (no ICP) OR matching linked ICPs, excluding already applied
  const cadences = await prisma.cadence.findMany({
    where: {
      ...ownerFilter,
      status: "active",
      id: { notIn: appliedCadenceIds },
      OR: [
        { icpId: null }, // Generic cadences
        { icpId: { in: linkedICPIds } }, // ICP-specific
      ],
    },
    include: {
      icp: {
        select: { id: true, name: true },
      },
      steps: {
        orderBy: [{ dayNumber: "asc" }, { order: "asc" }],
        select: {
          id: true,
          dayNumber: true,
          channel: true,
          subject: true,
        },
      },
      _count: {
        select: { steps: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return cadences;
}
