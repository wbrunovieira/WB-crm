"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { activitySchema, type ActivityFormData } from "@/lib/validations/activity";
import {
  getAuthenticatedSession,
  getOwnerFilter,
  canAccessRecord,
} from "@/lib/permissions";

export async function getActivities(filters?: {
  type?: string;
  completed?: boolean;
  dealId?: string;
  contactId?: string;
  leadId?: string;
  sortBy?: string;
}) {
  const ownerFilter = await getOwnerFilter();

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
        orderByClause.push({ completed: "asc" });
        orderByClause.push({ dueDate: { sort: "asc", nulls: "last" } });
        orderByClause.push({ createdAt: "desc" });
    }
  } else {
    // Default ordering
    orderByClause.push({ completed: "asc" });
    orderByClause.push({ dueDate: { sort: "asc", nulls: "last" } });
    orderByClause.push({ createdAt: "desc" });
  }

  const activities = await prisma.activity.findMany({
    where: {
      ...ownerFilter,
      ...(filters?.type && { type: filters.type }),
      ...(filters?.completed !== undefined && { completed: filters.completed }),
      ...(filters?.dealId && { dealId: filters.dealId }),
      ...(filters?.contactId && { contactId: filters.contactId }),
      ...(filters?.leadId && { leadId: filters.leadId }),
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
  let allContacts = [];
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

  const updatedActivity = await prisma.activity.update({
    where: { id },
    data: {
      completed: !activity.completed,
    },
  });

  revalidatePath("/activities");
  if (activity.dealId) {
    revalidatePath(`/deals/${activity.dealId}`);
  }
  if (activity.contactId) {
    revalidatePath(`/contacts/${activity.contactId}`);
  }

  return updatedActivity;
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
