
import { backendFetch } from "@/lib/backend/client";

export async function getStagesList() {
  try {
    const pipelines = await backendFetch<{
      id: string;
      name: string;
      isDefault: boolean;
      stages: { id: string; name: string; order: number; probability: number | null }[];
    }[]>("/pipelines");
    return pipelines
      .flatMap((p) =>
        (p.stages ?? []).map((s) => ({
          ...s,
          pipeline: { id: p.id, name: p.name, isDefault: p.isDefault },
        }))
      )
      .sort((a, b) => {
        if (a.pipeline.isDefault !== b.pipeline.isDefault) return a.pipeline.isDefault ? -1 : 1;
        return a.order - b.order;
      });
  } catch {
    return [];
  }
}
