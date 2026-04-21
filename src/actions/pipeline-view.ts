"use server";

import { backendFetch } from "@/lib/backend/client";

export interface PipelineViewDeal {
  id: string;
  title: string;
  value: number | null;
  currency: string;
  probability: number | null;
  contactName: string | null;
  organizationName: string | null;
}

export interface PipelineViewStage {
  id: string;
  name: string;
  order: number;
  probability: number;
  deals: PipelineViewDeal[];
}

export interface PipelineView {
  id: string;
  name: string;
  isDefault: boolean;
  stages: PipelineViewStage[];
}

export async function getPipelineView(pipelineId?: string): Promise<PipelineView | null> {
  try {
    const query = pipelineId ? `?pipelineId=${pipelineId}` : "";
    return await backendFetch<PipelineView>(`/pipelines/view${query}`);
  } catch {
    return null;
  }
}
