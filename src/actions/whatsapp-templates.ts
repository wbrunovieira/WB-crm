"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

function requireAdmin(role: string | undefined) {
  if (role?.toLowerCase() !== "admin") {
    throw new Error("Apenas administradores podem gerenciar templates");
  }
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export async function getWhatsAppTemplates(onlyActive = false) {
  return prisma.whatsAppTemplate.findMany({
    where: onlyActive ? { active: true } : undefined,
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createWhatsAppTemplate(data: {
  name: string;
  text: string;
  category?: string;
}) {
  const session = await getServerSession(authOptions);
  requireAdmin(session?.user?.role);

  if (!data.name.trim()) throw new Error("Nome obrigatório");
  if (!data.text.trim()) throw new Error("Texto obrigatório");

  const template = await prisma.whatsAppTemplate.create({
    data: {
      name: data.name.trim(),
      text: data.text.trim(),
      category: data.category?.trim() || null,
    },
  });

  revalidatePath("/admin/whatsapp-templates");
  return template;
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export async function updateWhatsAppTemplate(
  id: string,
  data: { name?: string; text?: string; category?: string; active?: boolean }
) {
  const session = await getServerSession(authOptions);
  requireAdmin(session?.user?.role);

  const template = await prisma.whatsAppTemplate.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.text !== undefined && { text: data.text.trim() }),
      ...(data.category !== undefined && {
        category: data.category.trim() || null,
      }),
      ...(data.active !== undefined && { active: data.active }),
    },
  });

  revalidatePath("/admin/whatsapp-templates");
  return template;
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export async function deleteWhatsAppTemplate(id: string) {
  const session = await getServerSession(authOptions);
  requireAdmin(session?.user?.role);

  await prisma.whatsAppTemplate.delete({ where: { id } });
  revalidatePath("/admin/whatsapp-templates");
}
