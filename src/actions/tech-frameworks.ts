"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  techFrameworkSchema,
  techFrameworkUpdateSchema,
  type TechFrameworkFormData,
  type TechFrameworkUpdateData,
} from "@/lib/validations/tech-stack";

export async function getTechFrameworks() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const frameworks = await prisma.techFramework.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { dealFrameworks: true },
      },
    },
  });

  return frameworks;
}

export async function getActiveTechFrameworks() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const frameworks = await prisma.techFramework.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return frameworks;
}

export async function getTechFrameworkById(id: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const framework = await prisma.techFramework.findUnique({
    where: { id },
    include: {
      _count: {
        select: { dealFrameworks: true },
      },
    },
  });

  return framework;
}

export async function createTechFramework(data: TechFrameworkFormData) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const validated = techFrameworkSchema.parse(data);

  const existing = await prisma.techFramework.findUnique({
    where: { slug: validated.slug },
  });

  if (existing) {
    throw new Error("Já existe um framework com este slug");
  }

  const framework = await prisma.techFramework.create({
    data: validated,
  });

  revalidatePath("/admin/tech-stack");
  return framework;
}

export async function updateTechFramework(data: TechFrameworkUpdateData) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const validated = techFrameworkUpdateSchema.parse(data);
  const { id, ...updateData } = validated;

  if (updateData.slug) {
    const existing = await prisma.techFramework.findFirst({
      where: {
        slug: updateData.slug,
        NOT: { id },
      },
    });

    if (existing) {
      throw new Error("Já existe um framework com este slug");
    }
  }

  const framework = await prisma.techFramework.update({
    where: { id },
    data: updateData,
  });

  revalidatePath("/admin/tech-stack");
  return framework;
}

export async function deleteTechFramework(id: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const framework = await prisma.techFramework.findUnique({
    where: { id },
    include: {
      _count: {
        select: { dealFrameworks: true },
      },
    },
  });

  if (!framework) {
    throw new Error("Framework não encontrado");
  }

  if (framework._count.dealFrameworks > 0) {
    throw new Error(
      "Não é possível excluir um framework com deals vinculados"
    );
  }

  await prisma.techFramework.delete({
    where: { id },
  });

  revalidatePath("/admin/tech-stack");
}

export async function toggleTechFrameworkActive(id: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const framework = await prisma.techFramework.findUnique({
    where: { id },
  });

  if (!framework) {
    throw new Error("Framework não encontrado");
  }

  const updated = await prisma.techFramework.update({
    where: { id },
    data: { isActive: !framework.isActive },
  });

  revalidatePath("/admin/tech-stack");
  return updated;
}
