"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  businessLineSchema,
  businessLineUpdateSchema,
  type BusinessLineFormData,
  type BusinessLineUpdateData,
} from "@/lib/validations/business-line";

/**
 * Check if a slug already exists
 */
export async function checkBusinessLineSlugExists(slug: string): Promise<boolean> {
  const existing = await prisma.businessLine.findUnique({
    where: { slug },
    select: { id: true },
  });
  return !!existing;
}

/**
 * Generate a unique slug from name
 */
export async function generateUniqueBusinessLineSlug(name: string): Promise<string> {
  const baseSlug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 45);

  let slug = baseSlug;
  let counter = 1;

  while (await checkBusinessLineSlugExists(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
    if (counter > 100) {
      slug = `${baseSlug}-${Date.now()}`;
      break;
    }
  }

  return slug;
}

export async function getBusinessLines() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const businessLines = await prisma.businessLine.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: {
      _count: {
        select: { products: true },
      },
    },
  });

  return businessLines;
}

export async function getActiveBusinessLines() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const businessLines = await prisma.businessLine.findMany({
    where: { isActive: true },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: {
      products: {
        where: { isActive: true },
        orderBy: [{ order: "asc" }, { name: "asc" }],
      },
    },
  });

  return businessLines;
}

export async function getBusinessLineById(id: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const businessLine = await prisma.businessLine.findUnique({
    where: { id },
    include: {
      products: {
        orderBy: [{ order: "asc" }, { name: "asc" }],
      },
    },
  });

  return businessLine;
}

export async function createBusinessLine(data: BusinessLineFormData) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const validated = businessLineSchema.parse(data);

  // Verificar se slug já existe
  const existing = await prisma.businessLine.findUnique({
    where: { slug: validated.slug },
  });

  if (existing) {
    throw new Error("Já existe uma linha de negócio com este slug");
  }

  const businessLine = await prisma.businessLine.create({
    data: validated,
  });

  revalidatePath("/admin/business-lines");
  return businessLine;
}

export async function updateBusinessLine(data: BusinessLineUpdateData) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const validated = businessLineUpdateSchema.parse(data);
  const { id, ...updateData } = validated;

  // Se slug foi alterado, verificar se já existe
  if (updateData.slug) {
    const existing = await prisma.businessLine.findFirst({
      where: {
        slug: updateData.slug,
        NOT: { id },
      },
    });

    if (existing) {
      throw new Error("Já existe uma linha de negócio com este slug");
    }
  }

  const businessLine = await prisma.businessLine.update({
    where: { id },
    data: updateData,
  });

  revalidatePath("/admin/business-lines");
  return businessLine;
}

export async function deleteBusinessLine(id: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  // Verificar se tem produtos vinculados
  const businessLine = await prisma.businessLine.findUnique({
    where: { id },
    include: {
      _count: {
        select: { products: true },
      },
    },
  });

  if (!businessLine) {
    throw new Error("Linha de negócio não encontrada");
  }

  if (businessLine._count.products > 0) {
    throw new Error(
      "Não é possível excluir uma linha de negócio com produtos vinculados"
    );
  }

  await prisma.businessLine.delete({
    where: { id },
  });

  revalidatePath("/admin/business-lines");
}

export async function toggleBusinessLineActive(id: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const businessLine = await prisma.businessLine.findUnique({
    where: { id },
  });

  if (!businessLine) {
    throw new Error("Linha de negócio não encontrada");
  }

  const updated = await prisma.businessLine.update({
    where: { id },
    data: { isActive: !businessLine.isActive },
  });

  revalidatePath("/admin/business-lines");
  return updated;
}

// Retorna as ordens já utilizadas pelas linhas de negócio
export async function getUsedBusinessLineOrders(): Promise<number[]> {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");

  const businessLines = await prisma.businessLine.findMany({
    select: { order: true },
    orderBy: { order: "asc" },
  });

  return businessLines.map((bl) => bl.order);
}
