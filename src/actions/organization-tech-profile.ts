"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// ========== GET LEAD TECH PROFILE ==========

export async function getOrganizationTechProfile(organizationId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");

  const [languages, frameworks, hosting, databases, erps, crms, ecommerces] = await Promise.all([
    prisma.organizationLanguage.findMany({
      where: { organizationId },
      include: { language: true },
    }),
    prisma.organizationFramework.findMany({
      where: { organizationId },
      include: { framework: true },
    }),
    prisma.organizationHosting.findMany({
      where: { organizationId },
      include: { hosting: true },
    }),
    prisma.organizationDatabase.findMany({
      where: { organizationId },
      include: { database: true },
    }),
    prisma.organizationERP.findMany({
      where: { organizationId },
      include: { erp: true },
    }),
    prisma.organizationCRM.findMany({
      where: { organizationId },
      include: { crm: true },
    }),
    prisma.organizationEcommerce.findMany({
      where: { organizationId },
      include: { ecommerce: true },
    }),
  ]);

  return { languages, frameworks, hosting, databases, erps, crms, ecommerces };
}

// ========== LANGUAGES ==========

export async function addLanguageToOrganization(organizationId: string, languageId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");

  const existing = await prisma.organizationLanguage.findUnique({
    where: { organizationId_languageId: { organizationId, languageId } },
  });

  if (existing) throw new Error("Esta linguagem já está vinculada ao organization");

  const link = await prisma.organizationLanguage.create({
    data: { organizationId, languageId },
    include: { language: true },
  });

  revalidatePath(`/organizations/${organizationId}`);
  return link;
}

export async function removeLanguageFromOrganization(organizationId: string, languageId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");

  await prisma.organizationLanguage.delete({
    where: { organizationId_languageId: { organizationId, languageId } },
  });

  revalidatePath(`/organizations/${organizationId}`);
}

// ========== FRAMEWORKS ==========

export async function addFrameworkToOrganization(organizationId: string, frameworkId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");

  const existing = await prisma.organizationFramework.findUnique({
    where: { organizationId_frameworkId: { organizationId, frameworkId } },
  });

  if (existing) throw new Error("Este framework já está vinculado ao organization");

  const link = await prisma.organizationFramework.create({
    data: { organizationId, frameworkId },
    include: { framework: true },
  });

  revalidatePath(`/organizations/${organizationId}`);
  return link;
}

export async function removeFrameworkFromOrganization(organizationId: string, frameworkId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");

  await prisma.organizationFramework.delete({
    where: { organizationId_frameworkId: { organizationId, frameworkId } },
  });

  revalidatePath(`/organizations/${organizationId}`);
}

// ========== HOSTING ==========

export async function addHostingToOrganization(organizationId: string, hostingId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");

  const existing = await prisma.organizationHosting.findUnique({
    where: { organizationId_hostingId: { organizationId, hostingId } },
  });

  if (existing) throw new Error("Este serviço de hospedagem já está vinculado ao organization");

  const link = await prisma.organizationHosting.create({
    data: { organizationId, hostingId },
    include: { hosting: true },
  });

  revalidatePath(`/organizations/${organizationId}`);
  return link;
}

export async function removeHostingFromOrganization(organizationId: string, hostingId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");

  await prisma.organizationHosting.delete({
    where: { organizationId_hostingId: { organizationId, hostingId } },
  });

  revalidatePath(`/organizations/${organizationId}`);
}

// ========== DATABASES ==========

export async function addDatabaseToOrganization(organizationId: string, databaseId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");

  const existing = await prisma.organizationDatabase.findUnique({
    where: { organizationId_databaseId: { organizationId, databaseId } },
  });

  if (existing) throw new Error("Este banco de dados já está vinculado ao organization");

  const link = await prisma.organizationDatabase.create({
    data: { organizationId, databaseId },
    include: { database: true },
  });

  revalidatePath(`/organizations/${organizationId}`);
  return link;
}

export async function removeDatabaseFromOrganization(organizationId: string, databaseId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");

  await prisma.organizationDatabase.delete({
    where: { organizationId_databaseId: { organizationId, databaseId } },
  });

  revalidatePath(`/organizations/${organizationId}`);
}

// ========== ERPs ==========

export async function addERPToOrganization(organizationId: string, erpId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");

  const existing = await prisma.organizationERP.findUnique({
    where: { organizationId_erpId: { organizationId, erpId } },
  });

  if (existing) throw new Error("Este ERP já está vinculado ao organization");

  const link = await prisma.organizationERP.create({
    data: { organizationId, erpId },
    include: { erp: true },
  });

  revalidatePath(`/organizations/${organizationId}`);
  return link;
}

export async function removeERPFromOrganization(organizationId: string, erpId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");

  await prisma.organizationERP.delete({
    where: { organizationId_erpId: { organizationId, erpId } },
  });

  revalidatePath(`/organizations/${organizationId}`);
}

// ========== CRMs ==========

export async function addCRMToOrganization(organizationId: string, crmId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");

  const existing = await prisma.organizationCRM.findUnique({
    where: { organizationId_crmId: { organizationId, crmId } },
  });

  if (existing) throw new Error("Este CRM já está vinculado ao organization");

  const link = await prisma.organizationCRM.create({
    data: { organizationId, crmId },
    include: { crm: true },
  });

  revalidatePath(`/organizations/${organizationId}`);
  return link;
}

export async function removeCRMFromOrganization(organizationId: string, crmId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");

  await prisma.organizationCRM.delete({
    where: { organizationId_crmId: { organizationId, crmId } },
  });

  revalidatePath(`/organizations/${organizationId}`);
}

// ========== E-COMMERCE ==========

export async function addEcommerceToOrganization(organizationId: string, ecommerceId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");

  const existing = await prisma.organizationEcommerce.findUnique({
    where: { organizationId_ecommerceId: { organizationId, ecommerceId } },
  });

  if (existing) throw new Error("Esta plataforma de e-commerce já está vinculada ao organization");

  const link = await prisma.organizationEcommerce.create({
    data: { organizationId, ecommerceId },
    include: { ecommerce: true },
  });

  revalidatePath(`/organizations/${organizationId}`);
  return link;
}

export async function removeEcommerceFromOrganization(organizationId: string, ecommerceId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");

  await prisma.organizationEcommerce.delete({
    where: { organizationId_ecommerceId: { organizationId, ecommerceId } },
  });

  revalidatePath(`/organizations/${organizationId}`);
}
