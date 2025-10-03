"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type Label = {
  id: string;
  name: string;
  color: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
};

export async function getLabels() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const labels = await prisma.label.findMany({
    where: {
      ownerId: session.user.id,
    },
    orderBy: {
      name: "asc",
    },
  });

  return labels;
}

export async function createLabel(name: string, color: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  // Check if label with same name already exists
  const existing = await prisma.label.findUnique({
    where: {
      name_ownerId: {
        name,
        ownerId: session.user.id,
      },
    },
  });

  if (existing) {
    return existing; // Return existing label instead of creating duplicate
  }

  const label = await prisma.label.create({
    data: {
      name,
      color,
      ownerId: session.user.id,
    },
  });

  revalidatePath("/leads");
  revalidatePath("/organizations");
  return label;
}

export async function updateLabel(id: string, name: string, color: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const label = await prisma.label.update({
    where: {
      id,
      ownerId: session.user.id,
    },
    data: {
      name,
      color,
    },
  });

  revalidatePath("/leads");
  revalidatePath("/organizations");
  return label;
}

export async function deleteLabel(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  await prisma.label.delete({
    where: {
      id,
      ownerId: session.user.id,
    },
  });

  revalidatePath("/leads");
  revalidatePath("/organizations");
}
