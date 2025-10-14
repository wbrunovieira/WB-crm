"use server";

import { prisma } from "@/lib/prisma";

/**
 * Busca CNAEs por código ou descrição
 * @param query - Termo de busca
 * @param limit - Número máximo de resultados (default: 20)
 */
export async function searchCNAEs(query: string, limit: number = 20) {
  if (!query || query.length < 2) {
    return [];
  }

  const cnaes = await prisma.cNAE.findMany({
    where: {
      OR: [
        { code: { contains: query } },
        { description: { contains: query } },
      ],
    },
    orderBy: [
      { code: "asc" },
    ],
    take: limit,
  });

  return cnaes;
}

/**
 * Busca CNAE por ID
 */
export async function getCNAEById(id: string) {
  const cnae = await prisma.cNAE.findUnique({
    where: { id },
  });

  return cnae;
}

/**
 * Busca CNAE por código
 */
export async function getCNAEByCode(code: string) {
  const cnae = await prisma.cNAE.findUnique({
    where: { code },
  });

  return cnae;
}

/**
 * Adiciona CNAE secundário ao Lead
 */
export async function addSecondaryCNAEToLead(leadId: string, cnaeId: string) {
  // Check if already exists
  const existing = await prisma.leadSecondaryCNAE.findUnique({
    where: {
      leadId_cnaeId: { leadId, cnaeId },
    },
  });

  if (existing) {
    throw new Error("Este CNAE já está vinculado ao lead");
  }

  const link = await prisma.leadSecondaryCNAE.create({
    data: { leadId, cnaeId },
    include: { cnae: true },
  });

  return link;
}

/**
 * Remove CNAE secundário do Lead
 */
export async function removeSecondaryCNAEFromLead(leadId: string, cnaeId: string) {
  await prisma.leadSecondaryCNAE.delete({
    where: {
      leadId_cnaeId: { leadId, cnaeId },
    },
  });
}

/**
 * Busca CNAEs secundários de um Lead
 */
export async function getLeadSecondaryCNAEs(leadId: string) {
  const links = await prisma.leadSecondaryCNAE.findMany({
    where: { leadId },
    include: { cnae: true },
    orderBy: { cnae: { code: "asc" } },
  });

  return links.map(link => link.cnae);
}

/**
 * Adiciona CNAE secundário à Organization
 */
export async function addSecondaryCNAEToOrganization(organizationId: string, cnaeId: string) {
  const existing = await prisma.organizationSecondaryCNAE.findUnique({
    where: {
      organizationId_cnaeId: { organizationId, cnaeId },
    },
  });

  if (existing) {
    throw new Error("Este CNAE já está vinculado à organização");
  }

  const link = await prisma.organizationSecondaryCNAE.create({
    data: { organizationId, cnaeId },
    include: { cnae: true },
  });

  return link;
}

/**
 * Remove CNAE secundário da Organization
 */
export async function removeSecondaryCNAEFromOrganization(organizationId: string, cnaeId: string) {
  await prisma.organizationSecondaryCNAE.delete({
    where: {
      organizationId_cnaeId: { organizationId, cnaeId },
    },
  });
}

/**
 * Busca CNAEs secundários de uma Organization
 */
export async function getOrganizationSecondaryCNAEs(organizationId: string) {
  const links = await prisma.organizationSecondaryCNAE.findMany({
    where: { organizationId },
    include: { cnae: true },
    orderBy: { cnae: { code: "asc" } },
  });

  return links.map(link => link.cnae);
}
