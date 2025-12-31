"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { pipelineSchema, PipelineFormData } from "@/lib/validations/pipeline";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getPipelines() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Não autorizado");
  }

  const pipelines = await prisma.pipeline.findMany({
    include: {
      stages: {
        orderBy: {
          order: "asc",
        },
      },
      _count: {
        select: {
          stages: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return pipelines;
}

export async function getPipelineById(id: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Não autorizado");
  }

  const pipeline = await prisma.pipeline.findUnique({
    where: { id },
    include: {
      stages: {
        orderBy: {
          order: "asc",
        },
        include: {
          _count: {
            select: {
              deals: true,
            },
          },
        },
      },
    },
  });

  return pipeline;
}

export async function createPipeline(data: PipelineFormData) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Não autorizado");
  }

  const validated = pipelineSchema.parse(data);

  // Se for marcado como padrão, desmarcar outros pipelines
  if (validated.isDefault) {
    await prisma.pipeline.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });
  }

  const pipeline = await prisma.pipeline.create({
    data: {
      name: validated.name,
      isDefault: validated.isDefault || false,
      stages: {
        create: [
          { name: "Qualificação", order: 1, probability: 10 },
          { name: "Proposta", order: 2, probability: 30 },
          { name: "Negociação", order: 3, probability: 60 },
          { name: "Fechamento", order: 4, probability: 90 },
        ],
      },
    },
    include: {
      stages: true,
    },
  });

  revalidatePath("/pipelines");
  return pipeline;
}

export async function updatePipeline(id: string, data: PipelineFormData) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Não autorizado");
  }

  const validated = pipelineSchema.parse(data);

  // Se for marcado como padrão, desmarcar outros pipelines
  if (validated.isDefault) {
    await prisma.pipeline.updateMany({
      where: {
        id: { not: id },
        isDefault: true,
      },
      data: { isDefault: false },
    });
  }

  const pipeline = await prisma.pipeline.update({
    where: { id },
    data: {
      name: validated.name,
      isDefault: validated.isDefault || false,
    },
  });

  revalidatePath("/pipelines");
  revalidatePath(`/pipelines/${id}`);
  return pipeline;
}

export async function deletePipeline(id: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Não autorizado");
  }

  // Verificar se é o pipeline padrão
  const pipeline = await prisma.pipeline.findUnique({
    where: { id },
  });

  if (pipeline?.isDefault) {
    throw new Error("Não é possível excluir o pipeline padrão");
  }

  await prisma.pipeline.delete({
    where: { id },
  });

  revalidatePath("/pipelines");
}

export async function setDefaultPipeline(id: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Não autorizado");
  }

  // Desmarcar todos como padrão
  await prisma.pipeline.updateMany({
    where: { isDefault: true },
    data: { isDefault: false },
  });

  // Marcar o selecionado como padrão
  await prisma.pipeline.update({
    where: { id },
    data: { isDefault: true },
  });

  revalidatePath("/pipelines");
}
