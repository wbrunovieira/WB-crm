"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  techCategorySchema,
  techCategoryUpdateSchema,
  type TechCategoryFormData,
  type TechCategoryUpdateData,
} from "@/lib/validations/tech-stack";

export async function getTechCategories() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const categories = await prisma.techCategory.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: {
      _count: {
        select: { dealTechStacks: true },
      },
    },
  });

  return categories;
}

export async function getActiveTechCategories() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const categories = await prisma.techCategory.findMany({
    where: { isActive: true },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });

  return categories;
}

export async function getTechCategoryById(id: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const category = await prisma.techCategory.findUnique({
    where: { id },
    include: {
      _count: {
        select: { dealTechStacks: true },
      },
    },
  });

  return category;
}

export async function createTechCategory(data: TechCategoryFormData) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const validated = techCategorySchema.parse(data);

  const existing = await prisma.techCategory.findUnique({
    where: { slug: validated.slug },
  });

  if (existing) {
    throw new Error("Já existe uma categoria com este slug");
  }

  const category = await prisma.techCategory.create({
    data: validated,
  });

  revalidatePath("/admin/tech-stack");
  return category;
}

export async function updateTechCategory(data: TechCategoryUpdateData) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const validated = techCategoryUpdateSchema.parse(data);
  const { id, ...updateData } = validated;

  if (updateData.slug) {
    const existing = await prisma.techCategory.findFirst({
      where: {
        slug: updateData.slug,
        NOT: { id },
      },
    });

    if (existing) {
      throw new Error("Já existe uma categoria com este slug");
    }
  }

  const category = await prisma.techCategory.update({
    where: { id },
    data: updateData,
  });

  revalidatePath("/admin/tech-stack");
  return category;
}

export async function deleteTechCategory(id: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const category = await prisma.techCategory.findUnique({
    where: { id },
    include: {
      _count: {
        select: { dealTechStacks: true },
      },
    },
  });

  if (!category) {
    throw new Error("Categoria não encontrada");
  }

  if (category._count.dealTechStacks > 0) {
    throw new Error(
      "Não é possível excluir uma categoria com deals vinculados"
    );
  }

  await prisma.techCategory.delete({
    where: { id },
  });

  revalidatePath("/admin/tech-stack");
}

export async function toggleTechCategoryActive(id: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const category = await prisma.techCategory.findUnique({
    where: { id },
  });

  if (!category) {
    throw new Error("Categoria não encontrada");
  }

  const updated = await prisma.techCategory.update({
    where: { id },
    data: { isActive: !category.isActive },
  });

  revalidatePath("/admin/tech-stack");
  return updated;
}
