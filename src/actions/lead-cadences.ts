"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  applyLeadCadenceSchema,
  applyBulkLeadCadenceSchema,
  type ApplyLeadCadenceData,
  type ApplyBulkLeadCadenceData,
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
 * Apply a cadence to multiple leads at once
 */
export async function applyCadenceToBulkLeads(data: ApplyBulkLeadCadenceData) {
  const session = await getAuthenticatedSession();
  const validated = applyBulkLeadCadenceSchema.parse(data);
  const ownerFilter = await getOwnerFilter();

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

  // Verify all leads belong to user
  const leads = await prisma.lead.findMany({
    where: {
      id: { in: validated.leadIds },
      ...ownerFilter,
    },
    select: { id: true },
  });

  const accessibleLeadIds = new Set(leads.map((l) => l.id));

  // Check which leads already have this cadence
  const existingLeadCadences = await prisma.leadCadence.findMany({
    where: {
      leadId: { in: validated.leadIds },
      cadenceId: validated.cadenceId,
    },
    select: { leadId: true },
  });

  const alreadyAppliedIds = new Set(existingLeadCadences.map((lc) => lc.leadId));

  // Filter to eligible leads only
  const eligibleLeadIds = validated.leadIds.filter(
    (id) => accessibleLeadIds.has(id) && !alreadyAppliedIds.has(id)
  );

  if (eligibleLeadIds.length === 0) {
    return {
      applied: 0,
      skipped: validated.leadIds.length,
      total: validated.leadIds.length,
    };
  }

  const startDate = validated.startDate || new Date();

  // Create all in a single transaction
  await prisma.$transaction(async (tx) => {
    for (const leadId of eligibleLeadIds) {
      const leadCadence = await tx.leadCadence.create({
        data: {
          leadId,
          cadenceId: validated.cadenceId,
          status: "active",
          startDate,
          notes: validated.notes,
          ownerId: session.user.id,
        },
      });

      for (const step of cadence.steps) {
        const dueDate = addDays(startDate, step.dayNumber - 1);

        const activity = await tx.activity.create({
          data: {
            type: step.channel,
            subject: step.subject,
            description: step.description,
            dueDate,
            completed: false,
            leadId,
            ownerId: session.user.id,
          },
        });

        await tx.leadCadenceActivity.create({
          data: {
            leadCadenceId: leadCadence.id,
            cadenceStepId: step.id,
            activityId: activity.id,
            scheduledDate: dueDate,
          },
        });
      }
    }
  });

  revalidatePath("/leads");
  revalidatePath("/activities");
  revalidatePath("/activities/calendar");

  return {
    applied: eligibleLeadIds.length,
    skipped: validated.leadIds.length - eligibleLeadIds.length,
    total: validated.leadIds.length,
  };
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

  // Cancel cadence and skip all pending activities
  const updated = await prisma.$transaction(async (tx) => {
    // Get all pending activities from this cadence
    const cadenceActivities = await tx.leadCadenceActivity.findMany({
      where: { leadCadenceId: id },
      include: { activity: true },
    });

    // Skip all pending (not completed, not failed, not skipped) activities
    const now = new Date();
    for (const ca of cadenceActivities) {
      if (!ca.activity.completed && !ca.activity.failedAt && !ca.activity.skippedAt) {
        await tx.activity.update({
          where: { id: ca.activity.id },
          data: {
            skippedAt: now,
            skipReason: "Cadência cancelada",
          },
        });
      }
    }

    return tx.leadCadence.update({
      where: { id },
      data: {
        status: "cancelled",
        cancelledAt: now,
      },
    });
  });

  revalidatePath(`/leads/${leadCadence.leadId}`);
  revalidatePath("/activities");
  return updated;
}

/**
 * Cancel ALL active/paused lead cadences for a given cadence template.
 * Skips only pending activities (preserves completed/failed/skipped).
 */
export async function cancelAllActiveCadences(cadenceId: string) {
  await getAuthenticatedSession();
  const ownerFilter = await getOwnerFilter();

  const cadence = await prisma.cadence.findFirst({
    where: { id: cadenceId, ...ownerFilter },
  });

  if (!cadence) {
    throw new Error("Cadência não encontrada");
  }

  const activeLeadCadences = await prisma.leadCadence.findMany({
    where: {
      cadenceId,
      status: { in: ["active", "paused"] },
    },
  });

  if (activeLeadCadences.length === 0) {
    throw new Error("Nenhuma cadência ativa para cancelar");
  }

  let skippedActivitiesCount = 0;

  await prisma.$transaction(async (tx) => {
    const now = new Date();

    for (const lc of activeLeadCadences) {
      const cadenceActivities = await tx.leadCadenceActivity.findMany({
        where: { leadCadenceId: lc.id },
        include: { activity: true },
      });

      for (const ca of cadenceActivities) {
        if (!ca.activity.completed && !ca.activity.failedAt && !ca.activity.skippedAt) {
          await tx.activity.update({
            where: { id: ca.activity.id },
            data: {
              skippedAt: now,
              skipReason: "Cadência cancelada",
            },
          });
          skippedActivitiesCount++;
        }
      }

      await tx.leadCadence.update({
        where: { id: lc.id },
        data: {
          status: "cancelled",
          cancelledAt: now,
        },
      });
    }
  });

  const leadIds = Array.from(new Set(activeLeadCadences.map((lc) => lc.leadId)));
  for (const leadId of leadIds) {
    revalidatePath(`/leads/${leadId}`);
  }
  revalidatePath("/activities");
  revalidatePath("/activities/calendar");
  revalidatePath(`/admin/cadences/${cadenceId}`);
  revalidatePath("/admin/cadences");

  return {
    cancelledCount: activeLeadCadences.length,
    skippedActivitiesCount,
  };
}

/**
 * Mark a lead cadence as completed
 */
export async function completeLeadCadence(id: string, disqualificationReason?: string) {
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
      ...(disqualificationReason ? { disqualificationReason } : {}),
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

/**
 * Register that a lead replied (manually).
 * Creates a "reply received" activity and cancels all active cadences + pending activities.
 */
export async function registerLeadReply(
  leadId: string,
  data: { channel: string; notes?: string }
) {
  const session = await getAuthenticatedSession();
  const ownerFilter = await getOwnerFilter();

  // Verify lead access
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, ...ownerFilter },
  });

  if (!lead) {
    throw new Error("Lead não encontrado");
  }

  const channelLabels: Record<string, string> = {
    email: "E-mail",
    whatsapp: "WhatsApp",
    linkedin: "LinkedIn",
    call: "Ligação",
    instagram: "Instagram",
    meeting: "Reunião",
    other: "Outro canal",
  };

  const channelLabel = channelLabels[data.channel] || data.channel;
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    // 1. Create a completed activity registering the reply
    const replyActivity = await tx.activity.create({
      data: {
        type: data.channel === "other" ? "task" : data.channel,
        subject: `Resposta recebida via ${channelLabel}`,
        description: data.notes || null,
        completed: true,
        leadId,
        ownerId: session.user.id,
        dueDate: now,
      },
    });

    // 2. Find all active/paused cadences for this lead
    const activeCadences = await tx.leadCadence.findMany({
      where: {
        leadId,
        status: { in: ["active", "paused"] },
        ...ownerFilter,
      },
      include: {
        activities: {
          include: { activity: true },
        },
      },
    });

    let skippedCount = 0;

    // 3. Cancel each cadence and skip pending activities
    for (const lc of activeCadences) {
      for (const ca of lc.activities) {
        if (!ca.activity.completed && !ca.activity.failedAt && !ca.activity.skippedAt) {
          await tx.activity.update({
            where: { id: ca.activity.id },
            data: {
              skippedAt: now,
              skipReason: `Lead respondeu via ${channelLabel}`,
            },
          });
          skippedCount++;
        }
      }

      await tx.leadCadence.update({
        where: { id: lc.id },
        data: {
          status: "cancelled",
          cancelledAt: now,
          notes: `Cancelada automaticamente - lead respondeu via ${channelLabel}`,
        },
      });
    }

    return {
      replyActivity,
      cancelledCadences: activeCadences.length,
      skippedActivities: skippedCount,
    };
  });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/activities");
  return result;
}
