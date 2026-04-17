"use server";

import { backendFetch } from "@/lib/backend/client";
import { revalidatePath } from "next/cache";

/* ── Types ── */

export type CampaignStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "FINISHED";
export type StepType = "TEXT" | "MEDIA" | "AUDIO" | "DELAY" | "TYPING";
export type SendStatus = "PENDING" | "RUNNING" | "DONE" | "FAILED" | "OPTED_OUT";

export interface Campaign {
  id: string;
  ownerId: string;
  name: string;
  instanceName: string;
  description?: string;
  status: CampaignStatus;
  antiBlockConfig?: string;
  stepsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignStep {
  id: string;
  campaignId: string;
  order: number;
  type: StepType;
  text?: string;
  mediaUrl?: string;
  mediaCaption?: string;
  mediaType?: string;
  delaySeconds?: number;
  typingSeconds?: number;
}

export interface CampaignSend {
  id: string;
  phone: string;
  leadId?: string;
  status: SendStatus;
  currentStep: number;
  scheduledAt?: string;
  startedAt?: string;
  finishedAt?: string;
  errorMessage?: string;
}

export interface CampaignDetail extends Campaign {
  sends: CampaignSend[];
}

export interface CampaignStats {
  stats: {
    total: number;
    byStatus: Record<SendStatus, number>;
  };
}

/* ── Queries ── */

export async function getCampaigns(): Promise<Campaign[]> {
  try {
    return await backendFetch<Campaign[]>("/campaigns");
  } catch {
    return [];
  }
}

export async function getCampaign(id: string): Promise<CampaignDetail | null> {
  try {
    return await backendFetch<CampaignDetail>(`/campaigns/${id}`);
  } catch {
    return null;
  }
}

export async function getCampaignStats(id: string): Promise<CampaignStats["stats"] | null> {
  try {
    const result = await backendFetch<CampaignStats>(`/campaigns/${id}/stats`);
    return result.stats;
  } catch {
    return null;
  }
}

/* ── Mutations ── */

export async function createCampaign(data: {
  name: string;
  instanceName: string;
  description?: string;
  antiBlockConfig?: string;
}): Promise<{ success: boolean; campaign?: Campaign; error?: string }> {
  try {
    const campaign = await backendFetch<Campaign>("/campaigns", {
      method: "POST",
      body: JSON.stringify(data),
    });
    revalidatePath("/campaigns");
    return { success: true, campaign };
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message };
  }
}

export async function deleteCampaign(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await backendFetch<void>(`/campaigns/${id}`, { method: "DELETE" });
    revalidatePath("/campaigns");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message };
  }
}

export async function startCampaign(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await backendFetch<void>(`/campaigns/${id}/start`, { method: "POST" });
    revalidatePath(`/campaigns/${id}`);
    revalidatePath("/campaigns");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message };
  }
}

export async function pauseCampaign(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await backendFetch<void>(`/campaigns/${id}/pause`, { method: "POST" });
    revalidatePath(`/campaigns/${id}`);
    revalidatePath("/campaigns");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message };
  }
}

export async function resumeCampaign(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await backendFetch<void>(`/campaigns/${id}/resume`, { method: "POST" });
    revalidatePath(`/campaigns/${id}`);
    revalidatePath("/campaigns");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message };
  }
}

export async function addCampaignStep(
  id: string,
  data: {
    type: StepType;
    text?: string;
    mediaUrl?: string;
    mediaCaption?: string;
    mediaType?: string;
    delaySeconds?: number;
    typingSeconds?: number;
  },
): Promise<{ success: boolean; step?: CampaignStep; error?: string }> {
  try {
    const step = await backendFetch<CampaignStep>(`/campaigns/${id}/steps`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    revalidatePath(`/campaigns/${id}`);
    return { success: true, step };
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message };
  }
}

export async function addRecipients(
  id: string,
  phones: string[],
): Promise<{ success: boolean; added?: number; invalid?: string[]; error?: string }> {
  try {
    const result = await backendFetch<{ added: number; invalid: string[] }>(
      `/campaigns/${id}/recipients`,
      {
        method: "POST",
        body: JSON.stringify({ recipients: phones.map((phone) => ({ phone })) }),
      },
    );
    revalidatePath(`/campaigns/${id}`);
    return { success: true, ...result };
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message };
  }
}
