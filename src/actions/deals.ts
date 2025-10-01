"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { dealSchema, type DealFormData } from "@/lib/validations/deal";

export async function getDeals(search?: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const deals = await prisma.deal.findMany({
    where: {
      ownerId: session.user.id,
      ...(search && {
        OR: [
          { title: { contains: search } },
          { contact: { name: { contains: search } } },
          { organization: { name: { contains: search } } },
        ],
      }),
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
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return deals;
}

export async function getDealById(id: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const deal = await prisma.deal.findUnique({
    where: {
      id,
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
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

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
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const existingDeal = await prisma.deal.findUnique({
    where: { id },
  });

  if (!existingDeal || existingDeal.ownerId !== session.user.id) {
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
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const deal = await prisma.deal.findUnique({
    where: { id },
  });

  if (!deal || deal.ownerId !== session.user.id) {
    throw new Error("Negócio não encontrado");
  }

  await prisma.deal.delete({
    where: { id },
  });

  revalidatePath("/deals");
}

export async function updateDealStage(id: string, stageId: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const deal = await prisma.deal.findUnique({
    where: { id },
  });

  if (!deal || deal.ownerId !== session.user.id) {
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
