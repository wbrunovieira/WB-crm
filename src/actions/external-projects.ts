"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function linkProjectToOrganization(
  organizationId: string,
  projectId: string
) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const organization = await prisma.organization.findUnique({
    where: {
      id: organizationId,
      ownerId: session.user.id,
    },
  });

  if (!organization) {
    throw new Error("Organização não encontrada");
  }

  // Parse existing project IDs
  const existingIds = organization.externalProjectIds
    ? JSON.parse(organization.externalProjectIds)
    : [];

  // Add new project ID if not already present
  if (!existingIds.includes(projectId)) {
    existingIds.push(projectId);
  }

  // Update organization with new project IDs
  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      externalProjectIds: JSON.stringify(existingIds),
    },
  });

  revalidatePath(`/organizations/${organizationId}`);
  revalidatePath("/projects");
}

export async function unlinkProjectFromOrganization(
  organizationId: string,
  projectId: string
) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const organization = await prisma.organization.findUnique({
    where: {
      id: organizationId,
      ownerId: session.user.id,
    },
  });

  if (!organization) {
    throw new Error("Organização não encontrada");
  }

  // Parse existing project IDs
  const existingIds = organization.externalProjectIds
    ? JSON.parse(organization.externalProjectIds)
    : [];

  // Remove project ID
  const updatedIds = existingIds.filter((id: string) => id !== projectId);

  // Update organization
  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      externalProjectIds: JSON.stringify(updatedIds),
    },
  });

  revalidatePath(`/organizations/${organizationId}`);
  revalidatePath("/projects");
}

export async function getOrganizationProjects(organizationId: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autorizado");
  }

  const organization = await prisma.organization.findUnique({
    where: {
      id: organizationId,
      ownerId: session.user.id,
    },
    select: {
      externalProjectIds: true,
    },
  });

  if (!organization) {
    throw new Error("Organização não encontrada");
  }

  return organization.externalProjectIds
    ? JSON.parse(organization.externalProjectIds)
    : [];
}
