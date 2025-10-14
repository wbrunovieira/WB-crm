"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  techLanguageSchema,
  techLanguageUpdateSchema,
  type TechLanguageFormData,
  type TechLanguageUpdateData,
} from "@/lib/validations/tech-stack";

export async function getTechLanguages() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const languages = await prisma.techLanguage.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { dealLanguages: true },
      },
    },
  });

  return languages;
}

export async function getActiveTechLanguages() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const languages = await prisma.techLanguage.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return languages;
}

export async function getTechLanguageById(id: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const language = await prisma.techLanguage.findUnique({
    where: { id },
    include: {
      _count: {
        select: { dealLanguages: true },
      },
    },
  });

  return language;
}

export async function createTechLanguage(data: TechLanguageFormData) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const validated = techLanguageSchema.parse(data);

  const existing = await prisma.techLanguage.findUnique({
    where: { slug: validated.slug },
  });

  if (existing) {
    throw new Error("Já existe uma linguagem com este slug");
  }

  const language = await prisma.techLanguage.create({
    data: validated,
  });

  revalidatePath("/admin/tech-stack");
  return language;
}

export async function updateTechLanguage(data: TechLanguageUpdateData) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const validated = techLanguageUpdateSchema.parse(data);
  const { id, ...updateData } = validated;

  if (updateData.slug) {
    const existing = await prisma.techLanguage.findFirst({
      where: {
        slug: updateData.slug,
        NOT: { id },
      },
    });

    if (existing) {
      throw new Error("Já existe uma linguagem com este slug");
    }
  }

  const language = await prisma.techLanguage.update({
    where: { id },
    data: updateData,
  });

  revalidatePath("/admin/tech-stack");
  return language;
}

export async function deleteTechLanguage(id: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const language = await prisma.techLanguage.findUnique({
    where: { id },
    include: {
      _count: {
        select: { dealLanguages: true },
      },
    },
  });

  if (!language) {
    throw new Error("Linguagem não encontrada");
  }

  if (language._count.dealLanguages > 0) {
    throw new Error(
      "Não é possível excluir uma linguagem com deals vinculados"
    );
  }

  await prisma.techLanguage.delete({
    where: { id },
  });

  revalidatePath("/admin/tech-stack");
}

export async function toggleTechLanguageActive(id: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const language = await prisma.techLanguage.findUnique({
    where: { id },
  });

  if (!language) {
    throw new Error("Linguagem não encontrada");
  }

  const updated = await prisma.techLanguage.update({
    where: { id },
    data: { isActive: !language.isActive },
  });

  revalidatePath("/admin/tech-stack");
  return updated;
}
