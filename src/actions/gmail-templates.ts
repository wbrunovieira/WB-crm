"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const templateSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  subject: z.string().min(1, "Assunto obrigatório"),
  body: z.string().min(1, "Corpo obrigatório"),
  category: z.string().optional(),
  active: z.boolean().optional(),
});

export type GmailTemplateInput = z.infer<typeof templateSchema>;

export interface GmailTemplateResult {
  success: boolean;
  error?: string;
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Não autorizado");
  return session;
}

export async function getGmailTemplates() {
  await requireAdmin();
  return prisma.gmailTemplate.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
}

export async function getActiveGmailTemplates() {
  return prisma.gmailTemplate.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, subject: true, body: true, category: true },
  });
}

export async function createGmailTemplate(
  data: GmailTemplateInput
): Promise<GmailTemplateResult> {
  try {
    await requireAdmin();
    const parsed = templateSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
    }
    await prisma.gmailTemplate.create({ data: parsed.data });
    revalidatePath("/admin/gmail-templates");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function updateGmailTemplate(
  id: string,
  data: Partial<GmailTemplateInput>
): Promise<GmailTemplateResult> {
  try {
    await requireAdmin();
    await prisma.gmailTemplate.update({ where: { id }, data });
    revalidatePath("/admin/gmail-templates");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function deleteGmailTemplate(id: string): Promise<GmailTemplateResult> {
  try {
    await requireAdmin();
    await prisma.gmailTemplate.delete({ where: { id } });
    revalidatePath("/admin/gmail-templates");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
