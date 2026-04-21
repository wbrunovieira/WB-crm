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

export type GmailTemplate = { id: string; name: string; subject: string; body: string; category: string | null; active: boolean; createdAt: Date };
export type GmailTemplateActive = { id: string; name: string; subject: string; body: string; category: string | null };

export async function getGmailTemplates(): Promise<GmailTemplate[]> {
  try {
    return await backendFetch<GmailTemplate[]>("/email/templates");
  } catch {
    return [];
  }
}

export async function getActiveGmailTemplates(): Promise<GmailTemplateActive[]> {
  try {
    return await backendFetch<GmailTemplateActive[]>("/email/templates?onlyActive=true");
  } catch {
    return [];
  }
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
