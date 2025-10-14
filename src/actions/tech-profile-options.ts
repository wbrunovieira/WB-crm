"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  techProfileLanguageSchema,
  techProfileLanguageUpdateSchema,
  techProfileFrameworkSchema,
  techProfileFrameworkUpdateSchema,
  techProfileHostingSchema,
  techProfileHostingUpdateSchema,
  techProfileDatabaseSchema,
  techProfileDatabaseUpdateSchema,
  techProfileERPSchema,
  techProfileERPUpdateSchema,
  techProfileCRMSchema,
  techProfileCRMUpdateSchema,
  techProfileEcommerceSchema,
  techProfileEcommerceUpdateSchema,
  type TechProfileLanguageFormData,
  type TechProfileLanguageUpdateData,
  type TechProfileFrameworkFormData,
  type TechProfileFrameworkUpdateData,
  type TechProfileHostingFormData,
  type TechProfileHostingUpdateData,
  type TechProfileDatabaseFormData,
  type TechProfileDatabaseUpdateData,
  type TechProfileERPFormData,
  type TechProfileERPUpdateData,
  type TechProfileCRMFormData,
  type TechProfileCRMUpdateData,
  type TechProfileEcommerceFormData,
  type TechProfileEcommerceUpdateData,
} from "@/lib/validations/tech-profile";

// ========== LANGUAGES ==========

export async function getTechProfileLanguages() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");

  return await prisma.techProfileLanguage.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: { _count: { select: { leadLanguages: true, organizationLanguages: true } } },
  });
}

export async function getActiveTechProfileLanguages() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");

  return await prisma.techProfileLanguage.findMany({
    where: { isActive: true },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });
}

export async function createTechProfileLanguage(data: TechProfileLanguageFormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");

  const validated = techProfileLanguageSchema.parse(data);

  const existing = await prisma.techProfileLanguage.findUnique({ where: { slug: validated.slug } });
  if (existing) throw new Error("Já existe uma linguagem com este slug");

  const language = await prisma.techProfileLanguage.create({ data: validated });
  revalidatePath("/admin/tech-profile");
  return language;
}

export async function updateTechProfileLanguage(data: TechProfileLanguageUpdateData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");

  const validated = techProfileLanguageUpdateSchema.parse(data);
  const { id, ...updateData } = validated;

  if (updateData.slug) {
    const existing = await prisma.techProfileLanguage.findFirst({
      where: { slug: updateData.slug, NOT: { id } },
    });
    if (existing) throw new Error("Já existe uma linguagem com este slug");
  }

  const language = await prisma.techProfileLanguage.update({ where: { id }, data: updateData });
  revalidatePath("/admin/tech-profile");
  return language;
}

export async function deleteTechProfileLanguage(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");

  const language = await prisma.techProfileLanguage.findUnique({
    where: { id },
    include: { _count: { select: { leadLanguages: true, organizationLanguages: true } } },
  });

  if (!language) throw new Error("Linguagem não encontrada");

  const totalCount = language._count.leadLanguages + language._count.organizationLanguages;
  if (totalCount > 0) {
    throw new Error("Não é possível excluir uma linguagem com leads/organizações vinculados");
  }

  await prisma.techProfileLanguage.delete({ where: { id } });
  revalidatePath("/admin/tech-profile");
}

export async function toggleTechProfileLanguageActive(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");

  const language = await prisma.techProfileLanguage.findUnique({ where: { id } });
  if (!language) throw new Error("Linguagem não encontrada");

  const updated = await prisma.techProfileLanguage.update({
    where: { id },
    data: { isActive: !language.isActive },
  });

  revalidatePath("/admin/tech-profile");
  return updated;
}

// ========== FRAMEWORKS ==========

export async function getTechProfileFrameworks() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");

  return await prisma.techProfileFramework.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: { _count: { select: { leadFrameworks: true, organizationFrameworks: true } } },
  });
}

export async function getActiveTechProfileFrameworks() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");

  return await prisma.techProfileFramework.findMany({
    where: { isActive: true },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });
}

export async function createTechProfileFramework(data: TechProfileFrameworkFormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");

  const validated = techProfileFrameworkSchema.parse(data);

  const existing = await prisma.techProfileFramework.findUnique({ where: { slug: validated.slug } });
  if (existing) throw new Error("Já existe um framework com este slug");

  const framework = await prisma.techProfileFramework.create({ data: validated });
  revalidatePath("/admin/tech-profile");
  return framework;
}

export async function updateTechProfileFramework(data: TechProfileFrameworkUpdateData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");

  const validated = techProfileFrameworkUpdateSchema.parse(data);
  const { id, ...updateData } = validated;

  if (updateData.slug) {
    const existing = await prisma.techProfileFramework.findFirst({
      where: { slug: updateData.slug, NOT: { id } },
    });
    if (existing) throw new Error("Já existe um framework com este slug");
  }

  const framework = await prisma.techProfileFramework.update({ where: { id }, data: updateData });
  revalidatePath("/admin/tech-profile");
  return framework;
}

export async function deleteTechProfileFramework(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");

  const framework = await prisma.techProfileFramework.findUnique({
    where: { id },
    include: { _count: { select: { leadFrameworks: true, organizationFrameworks: true } } },
  });

  if (!framework) throw new Error("Framework não encontrado");

  const totalCount = framework._count.leadFrameworks + framework._count.organizationFrameworks;
  if (totalCount > 0) {
    throw new Error("Não é possível excluir um framework com leads/organizações vinculados");
  }

  await prisma.techProfileFramework.delete({ where: { id } });
  revalidatePath("/admin/tech-profile");
}

export async function toggleTechProfileFrameworkActive(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");

  const framework = await prisma.techProfileFramework.findUnique({ where: { id } });
  if (!framework) throw new Error("Framework não encontrado");

  const updated = await prisma.techProfileFramework.update({
    where: { id },
    data: { isActive: !framework.isActive },
  });

  revalidatePath("/admin/tech-profile");
  return updated;
}

// ========== HOSTING ==========

export async function getTechProfileHosting() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");

  return await prisma.techProfileHosting.findMany({
    orderBy: [{ type: "asc" }, { order: "asc" }, { name: "asc" }],
    include: { _count: { select: { leadHosting: true, organizationHosting: true } } },
  });
}

export async function getActiveTechProfileHosting() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");

  return await prisma.techProfileHosting.findMany({
    where: { isActive: true },
    orderBy: [{ type: "asc" }, { order: "asc" }, { name: "asc" }],
  });
}

export async function createTechProfileHosting(data: TechProfileHostingFormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");

  const validated = techProfileHostingSchema.parse(data);

  const existing = await prisma.techProfileHosting.findUnique({ where: { slug: validated.slug } });
  if (existing) throw new Error("Já existe um serviço de hospedagem com este slug");

  const hosting = await prisma.techProfileHosting.create({ data: validated });
  revalidatePath("/admin/tech-profile");
  return hosting;
}

export async function updateTechProfileHosting(data: TechProfileHostingUpdateData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");

  const validated = techProfileHostingUpdateSchema.parse(data);
  const { id, ...updateData } = validated;

  if (updateData.slug) {
    const existing = await prisma.techProfileHosting.findFirst({
      where: { slug: updateData.slug, NOT: { id } },
    });
    if (existing) throw new Error("Já existe um serviço de hospedagem com este slug");
  }

  const hosting = await prisma.techProfileHosting.update({ where: { id }, data: updateData });
  revalidatePath("/admin/tech-profile");
  return hosting;
}

export async function deleteTechProfileHosting(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");

  const hosting = await prisma.techProfileHosting.findUnique({
    where: { id },
    include: { _count: { select: { leadHosting: true, organizationHosting: true } } },
  });

  if (!hosting) throw new Error("Serviço de hospedagem não encontrado");

  const totalCount = hosting._count.leadHosting + hosting._count.organizationHosting;
  if (totalCount > 0) {
    throw new Error("Não é possível excluir um serviço com leads/organizações vinculados");
  }

  await prisma.techProfileHosting.delete({ where: { id } });
  revalidatePath("/admin/tech-profile");
}

export async function toggleTechProfileHostingActive(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");

  const hosting = await prisma.techProfileHosting.findUnique({ where: { id } });
  if (!hosting) throw new Error("Serviço de hospedagem não encontrado");

  const updated = await prisma.techProfileHosting.update({
    where: { id },
    data: { isActive: !hosting.isActive },
  });

  revalidatePath("/admin/tech-profile");
  return updated;
}

// ========== DATABASES ==========

export async function getTechProfileDatabases() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");
  return await prisma.techProfileDatabase.findMany({
    orderBy: [{ type: "asc" }, { order: "asc" }, { name: "asc" }],
    include: { _count: { select: { leadDatabases: true, organizationDatabases: true } } },
  });
}

export async function getActiveTechProfileDatabases() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");
  return await prisma.techProfileDatabase.findMany({
    where: { isActive: true },
    orderBy: [{ type: "asc" }, { order: "asc" }, { name: "asc" }],
  });
}

export async function createTechProfileDatabase(data: TechProfileDatabaseFormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");
  const validated = techProfileDatabaseSchema.parse(data);
  const existing = await prisma.techProfileDatabase.findUnique({ where: { slug: validated.slug } });
  if (existing) throw new Error("Já existe um banco de dados com este slug");
  const database = await prisma.techProfileDatabase.create({ data: validated });
  revalidatePath("/admin/tech-profile");
  return database;
}

export async function updateTechProfileDatabase(data: TechProfileDatabaseUpdateData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");
  const validated = techProfileDatabaseUpdateSchema.parse(data);
  const { id, ...updateData } = validated;
  if (updateData.slug) {
    const existing = await prisma.techProfileDatabase.findFirst({
      where: { slug: updateData.slug, NOT: { id } },
    });
    if (existing) throw new Error("Já existe um banco de dados com este slug");
  }
  const database = await prisma.techProfileDatabase.update({ where: { id }, data: updateData });
  revalidatePath("/admin/tech-profile");
  return database;
}

export async function deleteTechProfileDatabase(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");
  const database = await prisma.techProfileDatabase.findUnique({
    where: { id },
    include: { _count: { select: { leadDatabases: true, organizationDatabases: true } } },
  });
  if (!database) throw new Error("Banco de dados não encontrado");
  const totalCount = database._count.leadDatabases + database._count.organizationDatabases;
  if (totalCount > 0) throw new Error("Não é possível excluir um banco com leads/organizações vinculados");
  await prisma.techProfileDatabase.delete({ where: { id } });
  revalidatePath("/admin/tech-profile");
}

export async function toggleTechProfileDatabaseActive(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");
  const database = await prisma.techProfileDatabase.findUnique({ where: { id } });
  if (!database) throw new Error("Banco de dados não encontrado");
  const updated = await prisma.techProfileDatabase.update({
    where: { id },
    data: { isActive: !database.isActive },
  });
  revalidatePath("/admin/tech-profile");
  return updated;
}

// ========== ERPs ==========

export async function getTechProfileERPs() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");
  return await prisma.techProfileERP.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: { _count: { select: { leadERPs: true, organizationERPs: true } } },
  });
}

export async function getActiveTechProfileERPs() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");
  return await prisma.techProfileERP.findMany({
    where: { isActive: true },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });
}

export async function createTechProfileERP(data: TechProfileERPFormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");
  const validated = techProfileERPSchema.parse(data);
  const existing = await prisma.techProfileERP.findUnique({ where: { slug: validated.slug } });
  if (existing) throw new Error("Já existe um ERP com este slug");
  const erp = await prisma.techProfileERP.create({ data: validated });
  revalidatePath("/admin/tech-profile");
  return erp;
}

export async function updateTechProfileERP(data: TechProfileERPUpdateData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");
  const validated = techProfileERPUpdateSchema.parse(data);
  const { id, ...updateData } = validated;
  if (updateData.slug) {
    const existing = await prisma.techProfileERP.findFirst({
      where: { slug: updateData.slug, NOT: { id } },
    });
    if (existing) throw new Error("Já existe um ERP com este slug");
  }
  const erp = await prisma.techProfileERP.update({ where: { id }, data: updateData });
  revalidatePath("/admin/tech-profile");
  return erp;
}

export async function deleteTechProfileERP(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");
  const erp = await prisma.techProfileERP.findUnique({
    where: { id },
    include: { _count: { select: { leadERPs: true, organizationERPs: true } } },
  });
  if (!erp) throw new Error("ERP não encontrado");
  const totalCount = erp._count.leadERPs + erp._count.organizationERPs;
  if (totalCount > 0) throw new Error("Não é possível excluir um ERP com leads/organizações vinculados");
  await prisma.techProfileERP.delete({ where: { id } });
  revalidatePath("/admin/tech-profile");
}

export async function toggleTechProfileERPActive(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");
  const erp = await prisma.techProfileERP.findUnique({ where: { id } });
  if (!erp) throw new Error("ERP não encontrado");
  const updated = await prisma.techProfileERP.update({
    where: { id },
    data: { isActive: !erp.isActive },
  });
  revalidatePath("/admin/tech-profile");
  return updated;
}

// ========== CRMs ==========

export async function getTechProfileCRMs() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");
  return await prisma.techProfileCRM.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: { _count: { select: { leadCRMs: true, organizationCRMs: true } } },
  });
}

export async function getActiveTechProfileCRMs() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");
  return await prisma.techProfileCRM.findMany({
    where: { isActive: true },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });
}

export async function createTechProfileCRM(data: TechProfileCRMFormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");
  const validated = techProfileCRMSchema.parse(data);
  const existing = await prisma.techProfileCRM.findUnique({ where: { slug: validated.slug } });
  if (existing) throw new Error("Já existe um CRM com este slug");
  const crm = await prisma.techProfileCRM.create({ data: validated });
  revalidatePath("/admin/tech-profile");
  return crm;
}

export async function updateTechProfileCRM(data: TechProfileCRMUpdateData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");
  const validated = techProfileCRMUpdateSchema.parse(data);
  const { id, ...updateData } = validated;
  if (updateData.slug) {
    const existing = await prisma.techProfileCRM.findFirst({
      where: { slug: updateData.slug, NOT: { id } },
    });
    if (existing) throw new Error("Já existe um CRM com este slug");
  }
  const crm = await prisma.techProfileCRM.update({ where: { id }, data: updateData });
  revalidatePath("/admin/tech-profile");
  return crm;
}

export async function deleteTechProfileCRM(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");
  const crm = await prisma.techProfileCRM.findUnique({
    where: { id },
    include: { _count: { select: { leadCRMs: true, organizationCRMs: true } } },
  });
  if (!crm) throw new Error("CRM não encontrado");
  const totalCount = crm._count.leadCRMs + crm._count.organizationCRMs;
  if (totalCount > 0) throw new Error("Não é possível excluir um CRM com leads/organizações vinculados");
  await prisma.techProfileCRM.delete({ where: { id } });
  revalidatePath("/admin/tech-profile");
}

export async function toggleTechProfileCRMActive(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");
  const crm = await prisma.techProfileCRM.findUnique({ where: { id } });
  if (!crm) throw new Error("CRM não encontrado");
  const updated = await prisma.techProfileCRM.update({
    where: { id },
    data: { isActive: !crm.isActive },
  });
  revalidatePath("/admin/tech-profile");
  return updated;
}

// ========== E-COMMERCE ==========

export async function getTechProfileEcommerces() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");
  return await prisma.techProfileEcommerce.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: { _count: { select: { leadEcommerces: true, organizationEcommerces: true } } },
  });
}

export async function getActiveTechProfileEcommerces() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");
  return await prisma.techProfileEcommerce.findMany({
    where: { isActive: true },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });
}

export async function createTechProfileEcommerce(data: TechProfileEcommerceFormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");
  const validated = techProfileEcommerceSchema.parse(data);
  const existing = await prisma.techProfileEcommerce.findUnique({ where: { slug: validated.slug } });
  if (existing) throw new Error("Já existe uma plataforma de e-commerce com este slug");
  const ecommerce = await prisma.techProfileEcommerce.create({ data: validated });
  revalidatePath("/admin/tech-profile");
  return ecommerce;
}

export async function updateTechProfileEcommerce(data: TechProfileEcommerceUpdateData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");
  const validated = techProfileEcommerceUpdateSchema.parse(data);
  const { id, ...updateData } = validated;
  if (updateData.slug) {
    const existing = await prisma.techProfileEcommerce.findFirst({
      where: { slug: updateData.slug, NOT: { id } },
    });
    if (existing) throw new Error("Já existe uma plataforma de e-commerce com este slug");
  }
  const ecommerce = await prisma.techProfileEcommerce.update({ where: { id }, data: updateData });
  revalidatePath("/admin/tech-profile");
  return ecommerce;
}

export async function deleteTechProfileEcommerce(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");
  const ecommerce = await prisma.techProfileEcommerce.findUnique({
    where: { id },
    include: { _count: { select: { leadEcommerces: true, organizationEcommerces: true } } },
  });
  if (!ecommerce) throw new Error("Plataforma de e-commerce não encontrada");
  const totalCount = ecommerce._count.leadEcommerces + ecommerce._count.organizationEcommerces;
  if (totalCount > 0) throw new Error("Não é possível excluir uma plataforma com leads/organizações vinculados");
  await prisma.techProfileEcommerce.delete({ where: { id } });
  revalidatePath("/admin/tech-profile");
}

export async function toggleTechProfileEcommerceActive(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Não autorizado");
  const ecommerce = await prisma.techProfileEcommerce.findUnique({ where: { id } });
  if (!ecommerce) throw new Error("Plataforma de e-commerce não encontrada");
  const updated = await prisma.techProfileEcommerce.update({
    where: { id },
    data: { isActive: !ecommerce.isActive },
  });
  revalidatePath("/admin/tech-profile");
  return updated;
}
