"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  cadenceSchema,
  cadenceUpdateSchema,
  type CadenceFormData,
  type CadenceUpdateData,
} from "@/lib/validations/cadence";
import {
  getAuthenticatedSession,
  getOwnerFilter,
} from "@/lib/permissions";

/**
 * Check if a slug already exists
 */
export async function checkCadenceSlugExists(slug: string): Promise<boolean> {
  const existing = await prisma.cadence.findUnique({
    where: { slug },
    select: { id: true },
  });
  return !!existing;
}

/**
 * Generate a unique slug from a name
 */
export async function generateUniqueCadenceSlug(name: string): Promise<string> {
  const baseSlug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 45);

  let slug = baseSlug;
  let counter = 1;

  while (await checkCadenceSlugExists(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
    if (counter > 100) {
      slug = `${baseSlug}-${Date.now()}`;
      break;
    }
  }

  return slug;
}

/**
 * Create a new Cadence
 */
export async function createCadence(data: CadenceFormData) {
  const session = await getAuthenticatedSession();
  const validated = cadenceSchema.parse(data);

  const existingSlug = await prisma.cadence.findUnique({
    where: { slug: validated.slug },
  });

  if (existingSlug) {
    throw new Error("Slug já existe");
  }

  const cadence = await prisma.cadence.create({
    data: {
      name: validated.name,
      slug: validated.slug,
      description: validated.description,
      objective: validated.objective,
      durationDays: validated.durationDays,
      icpId: validated.icpId,
      status: validated.status,
      ownerId: session.user.id,
    },
  });

  revalidatePath("/admin/cadences");
  return cadence;
}

/**
 * Get all Cadences with optional filters
 */
export async function getCadences(filters?: {
  status?: string;
  search?: string;
  icpId?: string;
}) {
  await getAuthenticatedSession();
  const ownerFilter = await getOwnerFilter();

  const cadences = await prisma.cadence.findMany({
    where: {
      ...ownerFilter,
      ...(filters?.status && { status: filters.status }),
      ...(filters?.icpId && { icpId: filters.icpId }),
      ...(filters?.search && {
        OR: [
          { name: { contains: filters.search } },
          { description: { contains: filters.search } },
        ],
      }),
    },
    include: {
      owner: {
        select: { id: true, name: true },
      },
      icp: {
        select: { id: true, name: true, slug: true },
      },
      _count: {
        select: {
          steps: true,
          leadCadences: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return cadences;
}

/**
 * Get Cadence by ID with steps
 */
export async function getCadenceById(id: string) {
  await getAuthenticatedSession();
  const ownerFilter = await getOwnerFilter();

  const cadence = await prisma.cadence.findFirst({
    where: {
      id,
      ...ownerFilter,
    },
    include: {
      owner: {
        select: { id: true, name: true, email: true },
      },
      icp: {
        select: { id: true, name: true, slug: true, status: true },
      },
      steps: {
        orderBy: [{ dayNumber: "asc" }, { order: "asc" }],
      },
      _count: {
        select: {
          leadCadences: true,
        },
      },
    },
  });

  return cadence;
}

/**
 * Update a Cadence
 */
export async function updateCadence(id: string, data: CadenceUpdateData) {
  await getAuthenticatedSession();
  const validated = cadenceUpdateSchema.parse(data);
  const ownerFilter = await getOwnerFilter();

  const existing = await prisma.cadence.findFirst({
    where: { id, ...ownerFilter },
  });

  if (!existing) {
    throw new Error("Cadência não encontrada");
  }

  if (validated.slug && validated.slug !== existing.slug) {
    const existingSlug = await prisma.cadence.findUnique({
      where: { slug: validated.slug },
    });
    if (existingSlug) {
      throw new Error("Slug já existe");
    }
  }

  const updatedCadence = await prisma.cadence.update({
    where: { id },
    data: {
      ...(validated.name && { name: validated.name }),
      ...(validated.slug && { slug: validated.slug }),
      ...(validated.description !== undefined && { description: validated.description }),
      ...(validated.objective !== undefined && { objective: validated.objective }),
      ...(validated.durationDays && { durationDays: validated.durationDays }),
      ...(validated.icpId !== undefined && { icpId: validated.icpId }),
      ...(validated.status && { status: validated.status }),
    },
  });

  revalidatePath("/admin/cadences");
  revalidatePath(`/admin/cadences/${id}`);
  return updatedCadence;
}

/**
 * Delete a Cadence
 */
export async function deleteCadence(id: string) {
  await getAuthenticatedSession();
  const ownerFilter = await getOwnerFilter();

  const existing = await prisma.cadence.findFirst({
    where: { id, ...ownerFilter },
    include: { _count: { select: { leadCadences: true } } }
  });

  if (!existing) {
    throw new Error("Cadência não encontrada");
  }

  // Check for active lead cadences
  const activeLeadCadences = await prisma.leadCadence.count({
    where: { cadenceId: id, status: "active" }
  });

  if (activeLeadCadences > 0) {
    throw new Error(`Não é possível excluir: ${activeLeadCadences} lead(s) com cadência ativa`);
  }

  await prisma.cadence.delete({ where: { id } });

  revalidatePath("/admin/cadences");
}

/**
 * Get cadences available for an ICP (or generic cadences)
 */
export async function getCadencesForICP(icpId?: string) {
  await getAuthenticatedSession();
  const ownerFilter = await getOwnerFilter();

  const cadences = await prisma.cadence.findMany({
    where: {
      ...ownerFilter,
      status: "active",
      OR: [
        { icpId: null }, // Generic cadences
        ...(icpId ? [{ icpId }] : []), // ICP-specific if provided
      ],
    },
    include: {
      icp: {
        select: { id: true, name: true },
      },
      _count: {
        select: { steps: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return cadences;
}
