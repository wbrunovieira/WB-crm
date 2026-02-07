"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/**
 * Add a label to an organization (many-to-many)
 */
export async function addLabelToOrganization(organizationId: string, labelId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  // Check organization access
  const organization = await prisma.organization.findFirst({
    where: {
      id: organizationId,
      ownerId: session.user.id,
    },
    include: { labels: true },
  });

  if (!organization) {
    throw new Error("Organização não encontrada");
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

  // Add label to organization
  const updatedOrganization = await prisma.organization.update({
    where: { id: organizationId },
    data: {
      labels: {
        connect: { id: labelId },
      },
    },
    include: { labels: true },
  });

  revalidatePath(`/organizations/${organizationId}`);
  revalidatePath("/organizations");
  return updatedOrganization;
}

/**
 * Remove a label from an organization
 */
export async function removeLabelFromOrganization(organizationId: string, labelId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  // Check organization access
  const organization = await prisma.organization.findFirst({
    where: {
      id: organizationId,
      ownerId: session.user.id,
    },
    include: { labels: true },
  });

  if (!organization) {
    throw new Error("Organização não encontrada");
  }

  // Remove label from organization
  const updatedOrganization = await prisma.organization.update({
    where: { id: organizationId },
    data: {
      labels: {
        disconnect: { id: labelId },
      },
    },
    include: { labels: true },
  });

  revalidatePath(`/organizations/${organizationId}`);
  revalidatePath("/organizations");
  return updatedOrganization;
}

/**
 * Get all labels for an organization
 */
export async function getOrganizationLabels(organizationId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  // Check organization access and get labels
  const organization = await prisma.organization.findFirst({
    where: {
      id: organizationId,
      ownerId: session.user.id,
    },
    include: { labels: true },
  });

  if (!organization) {
    throw new Error("Organização não encontrada");
  }

  return organization.labels;
}

/**
 * Set all labels for an organization (replace existing)
 */
export async function setOrganizationLabels(organizationId: string, labelIds: string[]) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  // Check organization access
  const organization = await prisma.organization.findFirst({
    where: {
      id: organizationId,
      ownerId: session.user.id,
    },
  });

  if (!organization) {
    throw new Error("Organização não encontrada");
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
  const updatedOrganization = await prisma.organization.update({
    where: { id: organizationId },
    data: {
      labels: {
        set: validLabelIds,
      },
    },
    include: { labels: true },
  });

  revalidatePath(`/organizations/${organizationId}`);
  revalidatePath("/organizations");
  return updatedOrganization;
}
