"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  cadenceStepSchema,
  cadenceStepUpdateSchema,
  type CadenceStepFormData,
  type CadenceStepUpdateData,
} from "@/lib/validations/cadence";
import {
  getAuthenticatedSession,
  getOwnerFilter,
} from "@/lib/permissions";

/**
 * Create a new Cadence Step
 */
export async function createCadenceStep(data: CadenceStepFormData) {
  await getAuthenticatedSession();
  const validated = cadenceStepSchema.parse(data);
  const ownerFilter = await getOwnerFilter();

  // Verify cadence access
  const cadence = await prisma.cadence.findFirst({
    where: {
      id: validated.cadenceId,
      ...ownerFilter,
    },
  });

  if (!cadence) {
    throw new Error("Cadência não encontrada");
  }

  // Get max order for this day
  const maxOrder = await prisma.cadenceStep.aggregate({
    where: {
      cadenceId: validated.cadenceId,
      dayNumber: validated.dayNumber,
    },
    _max: { order: true },
  });

  const step = await prisma.cadenceStep.create({
    data: {
      cadenceId: validated.cadenceId,
      dayNumber: validated.dayNumber,
      channel: validated.channel,
      subject: validated.subject,
      description: validated.description,
      order: validated.order ?? (maxOrder._max.order ?? -1) + 1,
    },
  });

  revalidatePath(`/admin/cadences/${validated.cadenceId}`);
  return step;
}

/**
 * Update a Cadence Step
 */
export async function updateCadenceStep(id: string, data: CadenceStepUpdateData) {
  await getAuthenticatedSession();
  const validated = cadenceStepUpdateSchema.parse(data);
  const ownerFilter = await getOwnerFilter();

  const existing = await prisma.cadenceStep.findUnique({
    where: { id },
    include: { cadence: true },
  });

  if (!existing) {
    throw new Error("Etapa não encontrada");
  }

  // Verify cadence access
  const cadence = await prisma.cadence.findFirst({
    where: {
      id: existing.cadenceId,
      ...ownerFilter,
    },
  });

  if (!cadence) {
    throw new Error("Cadência não encontrada");
  }

  const step = await prisma.cadenceStep.update({
    where: { id },
    data: {
      ...(validated.dayNumber !== undefined && { dayNumber: validated.dayNumber }),
      ...(validated.channel && { channel: validated.channel }),
      ...(validated.subject && { subject: validated.subject }),
      ...(validated.description !== undefined && { description: validated.description }),
      ...(validated.order !== undefined && { order: validated.order }),
    },
  });

  revalidatePath(`/admin/cadences/${existing.cadenceId}`);
  return step;
}

/**
 * Delete a Cadence Step
 */
export async function deleteCadenceStep(id: string) {
  await getAuthenticatedSession();
  const ownerFilter = await getOwnerFilter();

  const existing = await prisma.cadenceStep.findUnique({
    where: { id },
    include: { cadence: true },
  });

  if (!existing) {
    throw new Error("Etapa não encontrada");
  }

  // Verify cadence access
  const cadence = await prisma.cadence.findFirst({
    where: {
      id: existing.cadenceId,
      ...ownerFilter,
    },
  });

  if (!cadence) {
    throw new Error("Cadência não encontrada");
  }

  await prisma.cadenceStep.delete({ where: { id } });

  revalidatePath(`/admin/cadences/${existing.cadenceId}`);
}

/**
 * Reorder steps within a cadence
 */
export async function reorderCadenceSteps(
  cadenceId: string,
  stepOrders: { id: string; dayNumber: number; order: number }[]
) {
  await getAuthenticatedSession();
  const ownerFilter = await getOwnerFilter();

  const cadence = await prisma.cadence.findFirst({
    where: {
      id: cadenceId,
      ...ownerFilter,
    },
  });

  if (!cadence) {
    throw new Error("Cadência não encontrada");
  }

  await prisma.$transaction(
    stepOrders.map(({ id, dayNumber, order }) =>
      prisma.cadenceStep.update({
        where: { id },
        data: { dayNumber, order },
      })
    )
  );

  revalidatePath(`/admin/cadences/${cadenceId}`);
}
