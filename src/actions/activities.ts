"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { activitySchema, type ActivityFormData } from "@/lib/validations/activity";
import {
  getAuthenticatedSession,
  getOwnerFilter,
  canAccessRecord,
} from "@/lib/permissions";
import { addDays } from "date-fns";

export async function getActivities(filters?: {
  type?: string;
  completed?: boolean;
  dealId?: string;
  contactId?: string;
  leadId?: string;
  sortBy?: string;
  owner?: string;
  dateFrom?: string;
  dateTo?: string;
  includeArchivedLeads?: boolean;
  outcome?: string;
}) {
  const ownerFilter = await getOwnerFilter(filters?.owner);

  // Build order by clause based on sortBy parameter
  const orderByClause: Array<{ [key: string]: string | { sort: string; nulls?: string } }> = [];

  if (filters?.sortBy) {
    switch (filters.sortBy) {
      case "dueDate-asc":
        orderByClause.push({ dueDate: { sort: "asc", nulls: "last" } });
        break;
      case "dueDate-desc":
        orderByClause.push({ dueDate: { sort: "desc", nulls: "last" } });
        break;
      case "created-asc":
        orderByClause.push({ createdAt: "asc" });
        break;
      case "created-desc":
        orderByClause.push({ createdAt: "desc" });
        break;
      case "subject":
        orderByClause.push({ subject: "asc" });
        break;
      default:
        orderByClause.push({ failedAt: { sort: "asc", nulls: "first" } });
        orderByClause.push({ skippedAt: { sort: "asc", nulls: "first" } });
        orderByClause.push({ completed: "asc" });
        orderByClause.push({ dueDate: { sort: "asc", nulls: "last" } });
        orderByClause.push({ createdAt: "desc" });
    }
  } else {
    // Default ordering: pending first, then completed, then failed/skipped at bottom
    orderByClause.push({ failedAt: { sort: "asc", nulls: "first" } });
    orderByClause.push({ skippedAt: { sort: "asc", nulls: "first" } });
    orderByClause.push({ completed: "asc" });
    orderByClause.push({ dueDate: { sort: "asc", nulls: "last" } });
    orderByClause.push({ createdAt: "desc" });
  }

  // By default, exclude activities linked to archived leads
  const archivedLeadFilter = filters?.includeArchivedLeads
    ? {}
    : {
        NOT: {
          lead: { isArchived: true },
        },
      };

  const activities = await prisma.activity.findMany({
    where: {
      ...ownerFilter,
      ...archivedLeadFilter,
      ...(filters?.type && { type: filters.type }),
      ...(filters?.completed !== undefined && { completed: filters.completed }),
      ...(filters?.dealId && { dealId: filters.dealId }),
      ...(filters?.contactId && { contactId: filters.contactId }),
      ...(filters?.leadId && { leadId: filters.leadId }),
      ...(filters?.outcome === "failed" && { failedAt: { not: null } }),
      ...(filters?.outcome === "skipped" && { skippedAt: { not: null } }),
      ...((filters?.dateFrom || filters?.dateTo) && {
        dueDate: {
          ...(filters?.dateFrom && { gte: new Date(filters.dateFrom) }),
          ...(filters?.dateTo && { lte: new Date(`${filters.dateTo}T23:59:59.999Z`) }),
        },
      }),
    },
    include: {
      deal: {
        select: {
          id: true,
          title: true,
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      contact: {
        select: {
          id: true,
          name: true,
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
          partner: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      lead: {
        select: {
          id: true,
          businessName: true,
          isArchived: true,
        },
      },
      partner: {
        select: {
          id: true,
          name: true,
        },
      },
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      cadenceActivity: {
        select: {
          id: true,
          leadCadence: {
            select: {
              cadence: {
                select: {
                  id: true,
                  name: true,
                  icp: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: orderByClause,
  });

  return activities;
}

export async function getActivityById(id: string) {
  const ownerFilter = await getOwnerFilter();

  const activity = await prisma.activity.findFirst({
    where: {
      id,
      ...ownerFilter,
    },
    include: {
      deal: {
        select: {
          id: true,
          title: true,
          value: true,
          currency: true,
        },
      },
      contact: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      lead: {
        select: {
          id: true,
          businessName: true,
          status: true,
          quality: true,
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

  if (!activity) {
    return null;
  }

  // Fetch all contacts if contactIds exists
  let allContacts: Array<{ id: string; name: string; email: string | null; phone: string | null }> = [];
  if (activity.contactIds) {
    try {
      const contactIds = JSON.parse(activity.contactIds);
      if (contactIds && contactIds.length > 0) {
        allContacts = await prisma.contact.findMany({
          where: {
            id: { in: contactIds },
            ...ownerFilter,
          },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        });
      }
    } catch (e) {
      console.error("Error parsing contactIds:", e);
    }
  }

  return {
    ...activity,
    contacts: allContacts,
  };
}

export async function createActivity(data: ActivityFormData) {
  const session = await getAuthenticatedSession();
  const validated = activitySchema.parse(data);

  // Convert contactIds array to JSON string and set first contact as primary
  const contactIdsJson = validated.contactIds && validated.contactIds.length > 0
    ? JSON.stringify(validated.contactIds)
    : null;
  const primaryContactId = validated.contactIds && validated.contactIds.length > 0
    ? validated.contactIds[0]
    : null;

  // Convert leadContactIds array to JSON string
  const leadContactIdsJson = validated.leadContactIds && validated.leadContactIds.length > 0
    ? JSON.stringify(validated.leadContactIds)
    : null;

  const activity = await prisma.activity.create({
    data: {
      type: validated.type,
      subject: validated.subject,
      description: validated.description,
      dueDate: validated.dueDate,
      completed: validated.completed,
      dealId: validated.dealId,
      contactId: primaryContactId,
      contactIds: contactIdsJson,
      leadContactIds: leadContactIdsJson,
      leadId: validated.leadId,
      partnerId: validated.partnerId,
      ownerId: session.user.id,
    },
    include: {
      deal: {
        select: {
          id: true,
          title: true,
        },
      },
      contact: {
        select: {
          id: true,
          name: true,
        },
      },
      lead: {
        select: {
          id: true,
          businessName: true,
        },
      },
    },
  });

  revalidatePath("/activities");
  if (validated.dealId) {
    revalidatePath(`/deals/${validated.dealId}`);
  }
  if (validated.contactId) {
    revalidatePath(`/contacts/${validated.contactId}`);
  }
  if (validated.leadId) {
    revalidatePath(`/leads/${validated.leadId}`);
  }

  return activity;
}

export async function updateActivity(id: string, data: ActivityFormData) {
  await getAuthenticatedSession();

  const existingActivity = await prisma.activity.findUnique({ where: { id } });
  if (!existingActivity || !(await canAccessRecord(existingActivity.ownerId))) {
    throw new Error("Atividade não encontrada");
  }

  const validated = activitySchema.parse(data);

  // Convert contactIds array to JSON string and set first contact as primary
  const contactIdsJson = validated.contactIds && validated.contactIds.length > 0
    ? JSON.stringify(validated.contactIds)
    : null;
  const primaryContactId = validated.contactIds && validated.contactIds.length > 0
    ? validated.contactIds[0]
    : null;

  // Convert leadContactIds array to JSON string
  const leadContactIdsJson = validated.leadContactIds && validated.leadContactIds.length > 0
    ? JSON.stringify(validated.leadContactIds)
    : null;

  const activity = await prisma.activity.update({
    where: { id },
    data: {
      type: validated.type,
      subject: validated.subject,
      description: validated.description,
      dueDate: validated.dueDate,
      completed: validated.completed,
      dealId: validated.dealId,
      contactId: primaryContactId,
      contactIds: contactIdsJson,
      leadContactIds: leadContactIdsJson,
      leadId: validated.leadId,
      partnerId: validated.partnerId,
    },
    include: {
      deal: {
        select: {
          id: true,
          title: true,
        },
      },
      contact: {
        select: {
          id: true,
          name: true,
        },
      },
      lead: {
        select: {
          id: true,
          businessName: true,
        },
      },
    },
  });

  revalidatePath("/activities");
  revalidatePath(`/activities/${id}`);
  if (validated.dealId) {
    revalidatePath(`/deals/${validated.dealId}`);
  }
  if (validated.contactId) {
    revalidatePath(`/contacts/${validated.contactId}`);
  }
  if (validated.leadId) {
    revalidatePath(`/leads/${validated.leadId}`);
  }

  return activity;
}

export async function deleteActivity(id: string) {
  await getAuthenticatedSession();

  const activity = await prisma.activity.findUnique({ where: { id } });
  if (!activity || !(await canAccessRecord(activity.ownerId))) {
    throw new Error("Atividade não encontrada");
  }

  await prisma.activity.delete({ where: { id } });

  revalidatePath("/activities");
  if (activity.dealId) {
    revalidatePath(`/deals/${activity.dealId}`);
  }
  if (activity.contactId) {
    revalidatePath(`/contacts/${activity.contactId}`);
  }
}

export async function toggleActivityCompleted(id: string) {
  await getAuthenticatedSession();

  const activity = await prisma.activity.findUnique({ where: { id } });
  if (!activity || !(await canAccessRecord(activity.ownerId))) {
    throw new Error("Atividade não encontrada");
  }

  const isCompleting = !activity.completed;

  const updatedActivity = await prisma.activity.update({
    where: { id },
    data: {
      completed: isCompleting,
      completedAt: isCompleting ? new Date() : null,
    },
  });

  // When completing a cadence activity late, recalculate subsequent activity dates
  if (isCompleting && activity.dueDate) {
    const now = new Date();
    const dueDate = new Date(activity.dueDate);
    // Compare dates only (ignore time) using UTC to avoid timezone issues
    const nowDayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const dueDayUTC = Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate());
    const isLate = nowDayUTC > dueDayUTC;

    if (isLate) {
      // Check if this activity belongs to a cadence
      const cadenceLink = await prisma.leadCadenceActivity.findFirst({
        where: { activityId: id },
        include: { cadenceStep: { select: { id: true, dayNumber: true } } },
      });

      if (cadenceLink) {
        const completedDayNumber = cadenceLink.cadenceStep.dayNumber;

        // Get all subsequent activities in this cadence
        const subsequentActivities = await prisma.leadCadenceActivity.findMany({
          where: {
            leadCadenceId: cadenceLink.leadCadenceId,
            cadenceStep: { dayNumber: { gt: completedDayNumber } },
          },
          include: {
            cadenceStep: { select: { id: true, dayNumber: true } },
            activity: {
              select: { id: true, completed: true, failedAt: true, skippedAt: true, dueDate: true },
            },
          },
          orderBy: { scheduledDate: "asc" },
        });

        // Recalculate only pending activities
        for (const sa of subsequentActivities) {
          if (!sa.activity.completed && !sa.activity.failedAt && !sa.activity.skippedAt) {
            const daysDiff = sa.cadenceStep.dayNumber - completedDayNumber;
            const newDueDate = addDays(now, daysDiff);
            await prisma.activity.update({
              where: { id: sa.activity.id },
              data: { dueDate: newDueDate },
            });
          }
        }
      }
    }
  }

  revalidatePath("/activities");
  revalidatePath("/activities/calendar");
  if (activity.dealId) {
    revalidatePath(`/deals/${activity.dealId}`);
  }
  if (activity.contactId) {
    revalidatePath(`/contacts/${activity.contactId}`);
  }
  if (activity.leadId) {
    revalidatePath(`/leads/${activity.leadId}`);
  }
  if (activity.partnerId) {
    revalidatePath(`/partners/${activity.partnerId}`);
  }

  return updatedActivity;
}

// ============ ACTIVITY LEAD CONTACTS ============

export async function assignLeadContactsToActivity(
  activityId: string,
  leadContactIds: string[]
) {
  await getAuthenticatedSession();

  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
  });

  if (!activity || !(await canAccessRecord(activity.ownerId))) {
    throw new Error("Atividade não encontrada");
  }

  if (!activity.leadId) {
    throw new Error("Atividade não está vinculada a um lead");
  }

  // Verify all lead contacts belong to this lead
  const validContacts = await prisma.leadContact.findMany({
    where: {
      id: { in: leadContactIds },
      leadId: activity.leadId,
    },
  });

  if (validContacts.length !== leadContactIds.length) {
    throw new Error("Contatos inválidos para este lead");
  }

  const updated = await prisma.activity.update({
    where: { id: activityId },
    data: { leadContactIds: JSON.stringify(leadContactIds) },
  });

  revalidatePath(`/leads/${activity.leadId}`);
  revalidatePath("/activities");
  return updated;
}

export async function removeLeadContactsFromActivity(activityId: string) {
  await getAuthenticatedSession();

  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
  });

  if (!activity || !(await canAccessRecord(activity.ownerId))) {
    throw new Error("Atividade não encontrada");
  }

  const updated = await prisma.activity.update({
    where: { id: activityId },
    data: { leadContactIds: null },
  });

  if (activity.leadId) {
    revalidatePath(`/leads/${activity.leadId}`);
  }
  revalidatePath("/activities");
  return updated;
}

export async function updateActivityDueDate(id: string, newDate: Date) {
  await getAuthenticatedSession();

  const activity = await prisma.activity.findUnique({ where: { id } });
  if (!activity || !(await canAccessRecord(activity.ownerId))) {
    throw new Error("Atividade não encontrada");
  }

  const updatedActivity = await prisma.activity.update({
    where: { id },
    data: {
      dueDate: newDate,
    },
  });

  revalidatePath("/activities");
  revalidatePath("/activities/calendar");
  if (activity.dealId) {
    revalidatePath(`/deals/${activity.dealId}`);
  }

  return updatedActivity;
}

// ============ ACTIVITY OUTCOMES (Failed / Skipped) ============

export async function markActivityFailed(id: string, reason: string) {
  await getAuthenticatedSession();

  if (!reason?.trim()) {
    throw new Error("Informe o motivo da falha");
  }

  const activity = await prisma.activity.findUnique({ where: { id } });
  if (!activity || !(await canAccessRecord(activity.ownerId))) {
    throw new Error("Atividade não encontrada");
  }

  if (activity.completed) {
    throw new Error("Atividade já está concluída");
  }
  if (activity.skippedAt) {
    throw new Error("Atividade já foi pulada");
  }
  if (activity.failedAt) {
    throw new Error("Atividade já foi marcada como falha");
  }

  const updated = await prisma.activity.update({
    where: { id },
    data: {
      failedAt: new Date(),
      failReason: reason.trim(),
    },
  });

  revalidatePath("/activities");
  if (activity.leadId) revalidatePath(`/leads/${activity.leadId}`);
  if (activity.dealId) revalidatePath(`/deals/${activity.dealId}`);
  if (activity.contactId) revalidatePath(`/contacts/${activity.contactId}`);
  if (activity.partnerId) revalidatePath(`/partners/${activity.partnerId}`);

  return updated;
}

export async function markActivitySkipped(id: string, reason: string) {
  await getAuthenticatedSession();

  if (!reason?.trim()) {
    throw new Error("Informe o motivo para pular a atividade");
  }

  const activity = await prisma.activity.findUnique({ where: { id } });
  if (!activity || !(await canAccessRecord(activity.ownerId))) {
    throw new Error("Atividade não encontrada");
  }

  if (activity.completed) {
    throw new Error("Atividade já está concluída");
  }
  if (activity.skippedAt) {
    throw new Error("Atividade já foi pulada");
  }

  const updated = await prisma.activity.update({
    where: { id },
    data: {
      skippedAt: new Date(),
      skipReason: reason.trim(),
    },
  });

  revalidatePath("/activities");
  if (activity.leadId) revalidatePath(`/leads/${activity.leadId}`);
  if (activity.dealId) revalidatePath(`/deals/${activity.dealId}`);
  if (activity.contactId) revalidatePath(`/contacts/${activity.contactId}`);
  if (activity.partnerId) revalidatePath(`/partners/${activity.partnerId}`);

  return updated;
}

export async function revertActivityOutcome(id: string) {
  await getAuthenticatedSession();

  const activity = await prisma.activity.findUnique({ where: { id } });
  if (!activity || !(await canAccessRecord(activity.ownerId))) {
    throw new Error("Atividade não encontrada");
  }

  if (!activity.failedAt && !activity.skippedAt) {
    throw new Error("Atividade não está marcada como falha ou pulada");
  }

  const updated = await prisma.activity.update({
    where: { id },
    data: {
      failedAt: null,
      failReason: null,
      skippedAt: null,
      skipReason: null,
    },
  });

  revalidatePath("/activities");
  if (activity.leadId) revalidatePath(`/leads/${activity.leadId}`);
  if (activity.dealId) revalidatePath(`/deals/${activity.dealId}`);
  if (activity.contactId) revalidatePath(`/contacts/${activity.contactId}`);
  if (activity.partnerId) revalidatePath(`/partners/${activity.partnerId}`);

  return updated;
}
