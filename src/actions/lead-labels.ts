"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/**
 * Add a label to a lead (many-to-many)
 */
export async function addLabelToLead(leadId: string, labelId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  // Check lead access
  const lead = await prisma.lead.findFirst({
    where: {
      id: leadId,
      ownerId: session.user.id,
    },
    include: { labels: true },
  });

  if (!lead) {
    throw new Error("Lead não encontrado");
  }

  // Check label access
  const label = await prisma.label.findFirst({
    where: {
      id: labelId,
      ownerId: session.user.id,
    },
  });

  if (!label) {
    throw new Error("Label não encontrada");
  }

  // Add label to lead
  const updatedLead = await prisma.lead.update({
    where: { id: leadId },
    data: {
      labels: {
        connect: { id: labelId },
      },
    },
    include: { labels: true },
  });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  return updatedLead;
}

/**
 * Remove a label from a lead
 */
export async function removeLabelFromLead(leadId: string, labelId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  // Check lead access
  const lead = await prisma.lead.findFirst({
    where: {
      id: leadId,
      ownerId: session.user.id,
    },
    include: { labels: true },
  });

  if (!lead) {
    throw new Error("Lead não encontrado");
  }

  // Remove label from lead
  const updatedLead = await prisma.lead.update({
    where: { id: leadId },
    data: {
      labels: {
        disconnect: { id: labelId },
      },
    },
    include: { labels: true },
  });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  return updatedLead;
}

/**
 * Get all labels for a lead
 */
export async function getLeadLabels(leadId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  // Check lead access and get labels
  const lead = await prisma.lead.findFirst({
    where: {
      id: leadId,
      ownerId: session.user.id,
    },
    include: { labels: true },
  });

  if (!lead) {
    throw new Error("Lead não encontrado");
  }

  return lead.labels;
}

/**
 * Set all labels for a lead (replace existing)
 */
export async function setLeadLabels(leadId: string, labelIds: string[]) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  // Check lead access
  const lead = await prisma.lead.findFirst({
    where: {
      id: leadId,
      ownerId: session.user.id,
    },
  });

  if (!lead) {
    throw new Error("Lead não encontrado");
  }

  // Filter to only labels owned by user
  const validLabels = await prisma.label.findMany({
    where: {
      id: { in: labelIds },
      ownerId: session.user.id,
    },
  });

  const validLabelIds = validLabels.map((l) => ({ id: l.id }));

  // Set labels (replace all)
  const updatedLead = await prisma.lead.update({
    where: { id: leadId },
    data: {
      labels: {
        set: validLabelIds,
      },
    },
    include: { labels: true },
  });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  return updatedLead;
}
