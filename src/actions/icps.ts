"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  icpSchema,
  icpUpdateSchema,
  type ICPFormData,
  type ICPUpdateData,
} from "@/lib/validations/icp";
import {
  getAuthenticatedSession,
  getOwnerFilter,
} from "@/lib/permissions";

/**
 * Check if a slug already exists
 */
export async function checkICPSlugExists(slug: string): Promise<boolean> {
  const existing = await prisma.iCP.findUnique({
    where: { slug },
    select: { id: true },
  });
  return !!existing;
}

/**
 * Generate a unique slug from a name
 */
export async function generateUniqueICPSlug(name: string): Promise<string> {
  // Generate base slug from name
  const baseSlug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
    .substring(0, 45); // Limit length to leave room for suffix

  // Check if base slug exists
  let slug = baseSlug;
  let counter = 1;

  while (await checkICPSlugExists(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;

    // Safety limit
    if (counter > 100) {
      slug = `${baseSlug}-${Date.now()}`;
      break;
    }
  }

  return slug;
}

/**
 * Create a new ICP
 */
export async function createICP(data: ICPFormData) {
  const session = await getAuthenticatedSession();
  const validated = icpSchema.parse(data);

  // Check if slug already exists
  const existingSlug = await prisma.iCP.findUnique({
    where: { slug: validated.slug },
  });

  if (existingSlug) {
    throw new Error("Slug já existe");
  }

  // Create ICP
  const icp = await prisma.iCP.create({
    data: {
      name: validated.name,
      slug: validated.slug,
      content: validated.content,
      status: validated.status,
      ownerId: session.user.id,
    },
  });

  // Create initial version (v1)
  await prisma.iCPVersion.create({
    data: {
      icpId: icp.id,
      versionNumber: 1,
      name: icp.name,
      content: icp.content,
      status: icp.status,
      changedBy: session.user.id,
      changeReason: "Criação inicial",
    },
  });

  revalidatePath("/admin/icps");
  return icp;
}

/**
 * Get all ICPs with optional filters
 */
export async function getICPs(filters?: { status?: string; search?: string }) {
  await getAuthenticatedSession();
  const ownerFilter = await getOwnerFilter();

  const icps = await prisma.iCP.findMany({
    where: {
      ...ownerFilter,
      ...(filters?.status && { status: filters.status }),
      ...(filters?.search && {
        OR: [
          { name: { contains: filters.search } },
          { content: { contains: filters.search } },
        ],
      }),
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          leads: true,
          organizations: true,
          versions: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return icps;
}

/**
 * Get ICP by ID
 */
export async function getICPById(id: string) {
  await getAuthenticatedSession();
  const ownerFilter = await getOwnerFilter();

  const icp = await prisma.iCP.findFirst({
    where: {
      id,
      ...ownerFilter,
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          leads: true,
          organizations: true,
          versions: true,
        },
      },
    },
  });

  return icp;
}

/**
 * Update an ICP and create a new version
 */
export async function updateICP(id: string, data: ICPUpdateData) {
  const session = await getAuthenticatedSession();
  const validated = icpUpdateSchema.parse(data);

  // Check ownership
  const existing = await prisma.iCP.findUnique({ where: { id } });
  if (!existing || existing.ownerId !== session.user.id) {
    // Admin can also update
    if (session.user.role !== "admin" || !existing) {
      throw new Error("ICP não encontrado");
    }
  }

  // Check slug uniqueness if changing slug
  if (validated.slug && validated.slug !== existing.slug) {
    const existingSlug = await prisma.iCP.findUnique({
      where: { slug: validated.slug },
    });
    if (existingSlug) {
      throw new Error("Slug já existe");
    }
  }

  // Get last version number
  const lastVersion = await prisma.iCPVersion.findFirst({
    where: { icpId: id },
    orderBy: { versionNumber: "desc" },
  });

  const newVersionNumber = (lastVersion?.versionNumber ?? 0) + 1;

  // Update ICP
  const updatedICP = await prisma.iCP.update({
    where: { id },
    data: {
      ...(validated.name && { name: validated.name }),
      ...(validated.slug && { slug: validated.slug }),
      ...(validated.content && { content: validated.content }),
      ...(validated.status && { status: validated.status }),
    },
  });

  // Create new version snapshot
  await prisma.iCPVersion.create({
    data: {
      icpId: id,
      versionNumber: newVersionNumber,
      name: updatedICP.name,
      content: updatedICP.content,
      status: updatedICP.status,
      changedBy: session.user.id,
      changeReason: validated.changeReason || null,
    },
  });

  revalidatePath("/admin/icps");
  revalidatePath(`/admin/icps/${id}`);
  return updatedICP;
}

/**
 * Delete an ICP
 */
export async function deleteICP(id: string) {
  const session = await getAuthenticatedSession();

  // Check ownership
  const existing = await prisma.iCP.findUnique({ where: { id } });
  if (!existing || existing.ownerId !== session.user.id) {
    // Admin can also delete
    if (session.user.role !== "admin" || !existing) {
      throw new Error("ICP não encontrado");
    }
  }

  await prisma.iCP.delete({ where: { id } });

  revalidatePath("/admin/icps");
}

/**
 * Get ICP version history
 */
export async function getICPVersions(icpId: string) {
  await getAuthenticatedSession();
  const ownerFilter = await getOwnerFilter();

  // Check access to ICP
  const icp = await prisma.iCP.findFirst({
    where: {
      id: icpId,
      ...ownerFilter,
    },
  });

  if (!icp) {
    throw new Error("ICP não encontrado");
  }

  const versions = await prisma.iCPVersion.findMany({
    where: { icpId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { versionNumber: "desc" },
  });

  return versions;
}

/**
 * Restore ICP to a previous version
 */
export async function restoreICPVersion(icpId: string, versionNumber: number) {
  const session = await getAuthenticatedSession();
  const ownerFilter = await getOwnerFilter();

  // Check access to ICP
  const icp = await prisma.iCP.findFirst({
    where: {
      id: icpId,
      ...ownerFilter,
    },
  });

  if (!icp) {
    throw new Error("ICP não encontrado");
  }

  // Get the version to restore
  const versionToRestore = await prisma.iCPVersion.findUnique({
    where: {
      icpId_versionNumber: {
        icpId,
        versionNumber,
      },
    },
  });

  if (!versionToRestore) {
    throw new Error("Versão não encontrada");
  }

  // Get current version number
  const lastVersion = await prisma.iCPVersion.findFirst({
    where: { icpId },
    orderBy: { versionNumber: "desc" },
  });

  const newVersionNumber = (lastVersion?.versionNumber ?? 0) + 1;

  // Update ICP with restored data
  const updatedICP = await prisma.iCP.update({
    where: { id: icpId },
    data: {
      name: versionToRestore.name,
      content: versionToRestore.content,
      status: versionToRestore.status,
    },
  });

  // Create new version with restoration note
  await prisma.iCPVersion.create({
    data: {
      icpId,
      versionNumber: newVersionNumber,
      name: versionToRestore.name,
      content: versionToRestore.content,
      status: versionToRestore.status,
      changedBy: session.user.id,
      changeReason: `Restaurado da versão ${versionNumber}`,
    },
  });

  revalidatePath("/admin/icps");
  revalidatePath(`/admin/icps/${icpId}`);
  return updatedICP;
}
