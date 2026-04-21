"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  getAuthenticatedSession,
  getOwnerFilter,
} from "@/lib/permissions";
import { addDays } from "date-fns";

/**
 * Get all cadences applied to a lead (rich data with activities)
 */
export async function getLeadCadences(leadId: string) {
  await getAuthenticatedSession();
  const ownerFilter = await getOwnerFilter();

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, ...ownerFilter },
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
        orderBy: { scheduledDate: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return leadCadences.map((lc) => {
    const totalSteps = lc.activities.length;
    const completedSteps = lc.activities.filter((a) => a.activity.completed).length;
    const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
    return { ...lc, progress, completedSteps, totalSteps };
  });
}

/**
 * Mark a lead cadence as completed
 */
export async function completeLeadCadence(id: string, disqualificationReason?: string) {
  await getAuthenticatedSession();
  const ownerFilter = await getOwnerFilter();

  const leadCadence = await prisma.leadCadence.findFirst({
    where: { id, ...ownerFilter },
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
 * Cancel ALL active/paused lead cadences for a given cadence template.
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
    where: { cadenceId, status: { in: ["active", "paused"] } },
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
            data: { skippedAt: now, skipReason: "Cadência cancelada" },
          });
          skippedActivitiesCount++;
        }
      }
      await tx.leadCadence.update({
        where: { id: lc.id },
        data: { status: "cancelled", cancelledAt: now },
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
 * Get available cadences for a lead (based on linked ICPs)
 */
export async function getAvailableCadencesForLead(leadId: string) {
  await getAuthenticatedSession();
  const ownerFilter = await getOwnerFilter();

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, ...ownerFilter },
    include: {
      icps: { select: { icpId: true } },
      leadCadences: { select: { cadenceId: true } },
    },
  });

  if (!lead) {
    throw new Error("Lead não encontrado");
  }

  const linkedICPIds = lead.icps.map((i) => i.icpId);
  const appliedCadenceIds = lead.leadCadences.map((lc) => lc.cadenceId);

  const cadences = await prisma.cadence.findMany({
    where: {
      ...ownerFilter,
      status: "active",
      id: { notIn: appliedCadenceIds },
      OR: [
        { icpId: null },
        { icpId: { in: linkedICPIds } },
      ],
    },
    include: {
      icp: { select: { id: true, name: true } },
      steps: {
        orderBy: [{ dayNumber: "asc" }, { order: "asc" }],
        select: { id: true, dayNumber: true, channel: true, subject: true },
      },
      _count: { select: { steps: true } },
    },
    orderBy: { name: "asc" },
  });

  return cadences;
}

/**
 * Register that a lead replied (manually).
 */
export async function registerLeadReply(
  leadId: string,
  data: { channel: string; notes?: string }
) {
  const session = await getAuthenticatedSession();
  const ownerFilter = await getOwnerFilter();

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

    const activeCadences = await tx.leadCadence.findMany({
      where: { leadId, status: { in: ["active", "paused"] }, ...ownerFilter },
      include: { activities: { include: { activity: true } } },
    });

    let skippedCount = 0;
    for (const lc of activeCadences) {
      for (const ca of lc.activities) {
        if (!ca.activity.completed && !ca.activity.failedAt && !ca.activity.skippedAt) {
          await tx.activity.update({
            where: { id: ca.activity.id },
            data: { skippedAt: now, skipReason: `Lead respondeu via ${channelLabel}` },
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

    return { replyActivity, cancelledCadences: activeCadences.length, skippedActivities: skippedCount };
  });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/activities");
  return result;
}
