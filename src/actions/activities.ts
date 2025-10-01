"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { activitySchema, type ActivityFormData } from "@/lib/validations/activity";

export async function getActivities(filters?: {
  type?: string;
  completed?: boolean;
  dealId?: string;
  contactId?: string;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const activities = await prisma.activity.findMany({
    where: {
      ownerId: session.user.id,
      ...(filters?.type && { type: filters.type }),
      ...(filters?.completed !== undefined && { completed: filters.completed }),
      ...(filters?.dealId && { dealId: filters.dealId }),
      ...(filters?.contactId && { contactId: filters.contactId }),
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
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: [
      { completed: "asc" },
      { dueDate: "asc" },
      { createdAt: "desc" },
    ],
  });

  return activities;
}

export async function getActivityById(id: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const activity = await prisma.activity.findUnique({
    where: {
      id,
      ownerId: session.user.id,
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
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return activity;
}

export async function createActivity(data: ActivityFormData) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const validated = activitySchema.parse(data);

  const activity = await prisma.activity.create({
    data: {
      type: validated.type,
      subject: validated.subject,
      description: validated.description,
      dueDate: validated.dueDate,
      completed: validated.completed,
      dealId: validated.dealId,
      contactId: validated.contactId,
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
    },
  });

  revalidatePath("/activities");
  if (validated.dealId) {
    revalidatePath(`/deals/${validated.dealId}`);
  }
  if (validated.contactId) {
    revalidatePath(`/contacts/${validated.contactId}`);
  }

  return activity;
}

export async function updateActivity(id: string, data: ActivityFormData) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const existingActivity = await prisma.activity.findUnique({
    where: { id },
  });

  if (!existingActivity || existingActivity.ownerId !== session.user.id) {
    throw new Error("Atividade não encontrada");
  }

  const validated = activitySchema.parse(data);

  const activity = await prisma.activity.update({
    where: { id },
    data: {
      type: validated.type,
      subject: validated.subject,
      description: validated.description,
      dueDate: validated.dueDate,
      completed: validated.completed,
      dealId: validated.dealId,
      contactId: validated.contactId,
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

  return activity;
}

export async function deleteActivity(id: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const activity = await prisma.activity.findUnique({
    where: { id },
  });

  if (!activity || activity.ownerId !== session.user.id) {
    throw new Error("Atividade não encontrada");
  }

  await prisma.activity.delete({
    where: { id },
  });

  revalidatePath("/activities");
  if (activity.dealId) {
    revalidatePath(`/deals/${activity.dealId}`);
  }
  if (activity.contactId) {
    revalidatePath(`/contacts/${activity.contactId}`);
  }
}

export async function toggleActivityCompleted(id: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const activity = await prisma.activity.findUnique({
    where: { id },
  });

  if (!activity || activity.ownerId !== session.user.id) {
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
