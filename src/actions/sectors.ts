"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { sectorSchema, sectorUpdateSchema } from "@/lib/validations/sector";
import type { SectorFormData, SectorUpdateData } from "@/lib/validations/sector";
import { getAuthenticatedSession, getOwnerFilter } from "@/lib/permissions";

// ============ SECTOR CRUD ============

export async function createSector(data: SectorFormData) {
  const session = await getAuthenticatedSession();

  const validated = sectorSchema.parse(data);

  const sector = await prisma.sector.create({
    data: {
      ...validated,
      description: validated.description ?? null,
      marketSize: validated.marketSize ?? null,
      marketSizeNotes: validated.marketSizeNotes ?? null,
      averageTicket: validated.averageTicket ?? null,
      budgetSeason: validated.budgetSeason ?? null,
      salesCycleDays: validated.salesCycleDays ?? null,
      salesCycleNotes: validated.salesCycleNotes ?? null,
      decisionMakers: validated.decisionMakers ?? null,
      buyingProcess: validated.buyingProcess ?? null,
      mainObjections: validated.mainObjections ?? null,
      mainPains: validated.mainPains ?? null,
      referenceCompanies: validated.referenceCompanies ?? null,
      competitorsLandscape: validated.competitorsLandscape ?? null,
      jargons: validated.jargons ?? null,
      regulatoryNotes: validated.regulatoryNotes ?? null,
      ownerId: session.user.id,
    },
  });

  revalidatePath("/admin/sectors");
  return sector;
}

export async function getSectors(filters?: {
  search?: string;
  isActive?: boolean;
}) {
  const ownerFilter = await getOwnerFilter();

  const sectors = await prisma.sector.findMany({
    where: {
      ...ownerFilter,
      ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
      ...(filters?.search && {
        name: { contains: filters.search, mode: "insensitive" as const },
      }),
    },
    include: {
      _count: {
        select: { leads: true, organizations: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return sectors;
}

export async function getSectorsForSelect() {
  const ownerFilter = await getOwnerFilter();

  return prisma.sector.findMany({
    where: { ...ownerFilter, isActive: true },
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });
}

export async function getSectorById(id: string) {
  const ownerFilter = await getOwnerFilter();

  return prisma.sector.findFirst({
    where: { id, ...ownerFilter },
    include: {
      _count: {
        select: { leads: true, organizations: true },
      },
    },
  });
}

export async function updateSector(id: string, data: SectorUpdateData) {
  const session = await getAuthenticatedSession();

  const existing = await prisma.sector.findFirst({ where: { id } });
  if (!existing) throw new Error("Setor não encontrado");

  const isAdmin = session.user.role === "admin";
  if (!isAdmin && existing.ownerId !== session.user.id) {
    throw new Error("Sem permissão");
  }

  const validated = sectorUpdateSchema.parse(data);

  const sector = await prisma.sector.update({
    where: { id },
    data: validated,
  });

  revalidatePath("/admin/sectors");
  revalidatePath(`/admin/sectors/${id}`);
  return sector;
}

export async function deleteSector(id: string) {
  const session = await getAuthenticatedSession();

  const existing = await prisma.sector.findFirst({ where: { id } });
  if (!existing) throw new Error("Setor não encontrado");

  const isAdmin = session.user.role === "admin";
  if (!isAdmin && existing.ownerId !== session.user.id) {
    throw new Error("Sem permissão");
  }

  const leadCount = await prisma.leadSector.count({ where: { sectorId: id } });
  if (leadCount > 0) throw new Error("Setor possui leads vinculados");

  const orgCount = await prisma.organizationSector.count({ where: { sectorId: id } });
  if (orgCount > 0) throw new Error("Setor possui organizações vinculadas");

  await prisma.sector.delete({ where: { id } });

  revalidatePath("/admin/sectors");
}

// ============ LEAD ↔ SECTOR LINKS ============

export async function linkLeadToSector(leadId: string, sectorId: string) {
  const ownerFilter = await getOwnerFilter();

  const lead = await prisma.lead.findFirst({ where: { id: leadId, ...ownerFilter } });
  if (!lead) throw new Error("Lead não encontrado");

  const sector = await prisma.sector.findFirst({ where: { id: sectorId } });
  if (!sector) throw new Error("Setor não encontrado");

  const existing = await prisma.leadSector.findUnique({
    where: { leadId_sectorId: { leadId, sectorId } },
  });
  if (existing) throw new Error("Lead já está vinculado a este setor");

  const link = await prisma.leadSector.create({
    data: { leadId, sectorId },
  });

  revalidatePath(`/leads/${leadId}`);
  return link;
}

export async function unlinkLeadFromSector(leadId: string, sectorId: string) {
  await getAuthenticatedSession();

  const existing = await prisma.leadSector.findUnique({
    where: { leadId_sectorId: { leadId, sectorId } },
  });
  if (!existing) throw new Error("Vínculo não encontrado");

  await prisma.leadSector.delete({
    where: { leadId_sectorId: { leadId, sectorId } },
  });

  revalidatePath(`/leads/${leadId}`);
}

export async function getLeadSectors(leadId: string) {
  await getAuthenticatedSession();

  return prisma.leadSector.findMany({
    where: { leadId },
    include: { sector: true },
    orderBy: { sector: { name: "asc" } },
  });
}

// ============ ORGANIZATION ↔ SECTOR LINKS ============

export async function linkOrganizationToSector(organizationId: string, sectorId: string) {
  const ownerFilter = await getOwnerFilter();

  const org = await prisma.organization.findFirst({
    where: { id: organizationId, ...ownerFilter },
  });
  if (!org) throw new Error("Organização não encontrada");

  const sector = await prisma.sector.findFirst({ where: { id: sectorId } });
  if (!sector) throw new Error("Setor não encontrado");

  const existing = await prisma.organizationSector.findUnique({
    where: { organizationId_sectorId: { organizationId, sectorId } },
  });
  if (existing) throw new Error("Organização já está vinculada a este setor");

  const link = await prisma.organizationSector.create({
    data: { organizationId, sectorId },
  });

  revalidatePath(`/organizations/${organizationId}`);
  return link;
}

export async function unlinkOrganizationFromSector(
  organizationId: string,
  sectorId: string
) {
  await getAuthenticatedSession();

  const existing = await prisma.organizationSector.findUnique({
    where: { organizationId_sectorId: { organizationId, sectorId } },
  });
  if (!existing) throw new Error("Vínculo não encontrado");

  await prisma.organizationSector.delete({
    where: { organizationId_sectorId: { organizationId, sectorId } },
  });

  revalidatePath(`/organizations/${organizationId}`);
}

export async function getOrganizationSectors(organizationId: string) {
  await getAuthenticatedSession();

  return prisma.organizationSector.findMany({
    where: { organizationId },
    include: { sector: true },
    orderBy: { sector: { name: "asc" } },
  });
}
