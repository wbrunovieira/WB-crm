"use server";

import { backendFetch } from "@/lib/backend/client";
import { revalidatePath } from "next/cache";

export interface GmailTemplateInput {
  name: string;
  subject: string;
  body: string;
  category?: string;
  active?: boolean;
}

export interface GmailTemplateResult {
  success: boolean;
  error?: string;
}

export async function getGmailTemplates() {
  return backendFetch<Array<{ id: string; name: string; subject: string; body: string; category: string | null; active: boolean; createdAt: Date }>>("/email/templates");
}

export async function getActiveGmailTemplates() {
  return backendFetch<Array<{ id: string; name: string; subject: string; body: string; category: string | null }>>("/email/templates?onlyActive=true");
}

export async function createGmailTemplate(data: GmailTemplateInput): Promise<GmailTemplateResult> {
  try {
    await backendFetch("/email/templates", { method: "POST", body: JSON.stringify(data) });
    revalidatePath("/admin/gmail-templates");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function updateGmailTemplate(id: string, data: Partial<GmailTemplateInput>): Promise<GmailTemplateResult> {
  try {
    await backendFetch(`/email/templates/${id}`, { method: "PATCH", body: JSON.stringify(data) });
    revalidatePath("/admin/gmail-templates");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function deleteGmailTemplate(id: string): Promise<GmailTemplateResult> {
  try {
    await backendFetch(`/email/templates/${id}`, { method: "DELETE" });
    revalidatePath("/admin/gmail-templates");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
