"use server";

import { backendFetch } from "@/lib/backend/client";

export async function getPipelineView(pipelineId?: string) {
  const query = pipelineId ? `?pipelineId=${pipelineId}` : "";
  return backendFetch(`/pipelines/view${query}`);
}
