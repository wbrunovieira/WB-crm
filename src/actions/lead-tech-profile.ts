"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// ========== GET LEAD TECH PROFILE ==========

export async function getLeadTechProfile(leadId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");

  const [languages, frameworks, hosting, databases, erps, crms, ecommerces] = await Promise.all([
    prisma.leadLanguage.findMany({
      where: { leadId },
      include: { language: true },
    }),
    prisma.leadFramework.findMany({
      where: { leadId },
      include: { framework: true },
    }),
    prisma.leadHosting.findMany({
      where: { leadId },
      include: { hosting: true },
    }),
    prisma.leadDatabase.findMany({
      where: { leadId },
      include: { database: true },
    }),
    prisma.leadERP.findMany({
      where: { leadId },
      include: { erp: true },
    }),
    prisma.leadCRM.findMany({
      where: { leadId },
      include: { crm: true },
    }),
    prisma.leadEcommerce.findMany({
      where: { leadId },
      include: { ecommerce: true },
    }),
  ]);

  return { languages, frameworks, hosting, databases, erps, crms, ecommerces };
}

// ========== LANGUAGES ==========

export async function addLanguageToLead(leadId: string, languageId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");

  const existing = await prisma.leadLanguage.findUnique({
    where: { leadId_languageId: { leadId, languageId } },
  });

  if (existing) throw new Error("Esta linguagem já está vinculada ao lead");

  const link = await prisma.leadLanguage.create({
    data: { leadId, languageId },
    include: { language: true },
  });

  revalidatePath(`/leads/${leadId}`);
  return link;
}

export async function removeLanguageFromLead(leadId: string, languageId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");

  await prisma.leadLanguage.delete({
    where: { leadId_languageId: { leadId, languageId } },
  });

  revalidatePath(`/leads/${leadId}`);
}

// ========== FRAMEWORKS ==========

export async function addFrameworkToLead(leadId: string, frameworkId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");

  const existing = await prisma.leadFramework.findUnique({
    where: { leadId_frameworkId: { leadId, frameworkId } },
  });

  if (existing) throw new Error("Este framework já está vinculado ao lead");

  const link = await prisma.leadFramework.create({
    data: { leadId, frameworkId },
    include: { framework: true },
  });

  revalidatePath(`/leads/${leadId}`);
  return link;
}

export async function removeFrameworkFromLead(leadId: string, frameworkId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");

  await prisma.leadFramework.delete({
    where: { leadId_frameworkId: { leadId, frameworkId } },
  });

  revalidatePath(`/leads/${leadId}`);
}

// ========== HOSTING ==========

export async function addHostingToLead(leadId: string, hostingId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");

  const existing = await prisma.leadHosting.findUnique({
    where: { leadId_hostingId: { leadId, hostingId } },
  });

  if (existing) throw new Error("Este serviço de hospedagem já está vinculado ao lead");

  const link = await prisma.leadHosting.create({
    data: { leadId, hostingId },
    include: { hosting: true },
  });

  revalidatePath(`/leads/${leadId}`);
  return link;
}

export async function removeHostingFromLead(leadId: string, hostingId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");

  await prisma.leadHosting.delete({
    where: { leadId_hostingId: { leadId, hostingId } },
  });

  revalidatePath(`/leads/${leadId}`);
}

// ========== DATABASES ==========

export async function addDatabaseToLead(leadId: string, databaseId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");

  const existing = await prisma.leadDatabase.findUnique({
    where: { leadId_databaseId: { leadId, databaseId } },
  });

  if (existing) throw new Error("Este banco de dados já está vinculado ao lead");

  const link = await prisma.leadDatabase.create({
    data: { leadId, databaseId },
    include: { database: true },
  });

  revalidatePath(`/leads/${leadId}`);
  return link;
}

export async function removeDatabaseFromLead(leadId: string, databaseId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");

  await prisma.leadDatabase.delete({
    where: { leadId_databaseId: { leadId, databaseId } },
  });

  revalidatePath(`/leads/${leadId}`);
}

// ========== ERPs ==========

export async function addERPToLead(leadId: string, erpId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");

  const existing = await prisma.leadERP.findUnique({
    where: { leadId_erpId: { leadId, erpId } },
  });

  if (existing) throw new Error("Este ERP já está vinculado ao lead");

  const link = await prisma.leadERP.create({
    data: { leadId, erpId },
    include: { erp: true },
  });

  revalidatePath(`/leads/${leadId}`);
  return link;
}

export async function removeERPFromLead(leadId: string, erpId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");

  await prisma.leadERP.delete({
    where: { leadId_erpId: { leadId, erpId } },
  });

  revalidatePath(`/leads/${leadId}`);
}

// ========== CRMs ==========

export async function addCRMToLead(leadId: string, crmId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");

  const existing = await prisma.leadCRM.findUnique({
    where: { leadId_crmId: { leadId, crmId } },
  });

  if (existing) throw new Error("Este CRM já está vinculado ao lead");

  const link = await prisma.leadCRM.create({
    data: { leadId, crmId },
    include: { crm: true },
  });

  revalidatePath(`/leads/${leadId}`);
  return link;
}

export async function removeCRMFromLead(leadId: string, crmId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");

  await prisma.leadCRM.delete({
    where: { leadId_crmId: { leadId, crmId } },
  });

  revalidatePath(`/leads/${leadId}`);
}

// ========== E-COMMERCE ==========

export async function addEcommerceToLead(leadId: string, ecommerceId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");

  const existing = await prisma.leadEcommerce.findUnique({
    where: { leadId_ecommerceId: { leadId, ecommerceId } },
  });

  if (existing) throw new Error("Esta plataforma de e-commerce já está vinculada ao lead");

  const link = await prisma.leadEcommerce.create({
    data: { leadId, ecommerceId },
    include: { ecommerce: true },
  });

  revalidatePath(`/leads/${leadId}`);
  return link;
}

export async function removeEcommerceFromLead(leadId: string, ecommerceId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");

  await prisma.leadEcommerce.delete({
    where: { leadId_ecommerceId: { leadId, ecommerceId } },
  });

  revalidatePath(`/leads/${leadId}`);
}
