"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { stageSchema, StageFormData } from "@/lib/validations/pipeline";

export async function getStages() {
  const stages = await prisma.stage.findMany({
    orderBy: { order: "asc" },
    include: {
      pipeline: {
        select: {
          id: true,
          name: true,
          isDefault: true,
        },
      },
    },
  });

  return stages;
}

export async function getStagesByPipeline(pipelineId: string) {
  const stages = await prisma.stage.findMany({
    where: { pipelineId },
    orderBy: { order: "asc" },
    include: {
      _count: {
        select: {
          deals: true,
        },
      },
    },
  });

  return stages;
}

export async function createStage(data: StageFormData) {
  const validated = stageSchema.parse(data);

  const stage = await prisma.stage.create({
    data: {
      name: validated.name,
      order: validated.order,
      probability: validated.probability,
      pipelineId: validated.pipelineId,
    },
  });

  revalidatePath("/pipelines");
  revalidatePath(`/pipelines/${validated.pipelineId}`);
  return stage;
}

export async function updateStage(id: string, data: StageFormData) {
  const validated = stageSchema.parse(data);

  const stage = await prisma.stage.update({
    where: { id },
    data: {
      name: validated.name,
      order: validated.order,
      probability: validated.probability,
    },
  });

  revalidatePath("/pipelines");
  revalidatePath(`/pipelines/${validated.pipelineId}`);
  return stage;
}

export async function deleteStage(id: string) {
  const stage = await prisma.stage.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          deals: true,
        },
      },
    },
  });

  if (!stage) {
    throw new Error("Estágio não encontrado");
  }

  if (stage._count.deals > 0) {
    throw new Error(
      `Não é possível excluir este estágio pois existem ${stage._count.deals} negócio(s) vinculado(s)`
    );
  }

  await prisma.stage.delete({
    where: { id },
  });

  revalidatePath("/pipelines");
  revalidatePath(`/pipelines/${stage.pipelineId}`);
}

export async function reorderStages(
  pipelineId: string,
  stageIds: string[]
) {
  // Atualizar a ordem de cada estágio
  await Promise.all(
    stageIds.map((stageId, index) =>
      prisma.stage.update({
        where: { id: stageId },
        data: { order: index + 1 },
      })
    )
  );

  revalidatePath("/pipelines");
  revalidatePath(`/pipelines/${pipelineId}`);
}
