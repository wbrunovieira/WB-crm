"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StageSummary {
  id: string;
  name: string;
  order: number;
  probability: number;
  pipelineId: string;
  createdAt: string;
  updatedAt: string;
  _count: { deals: number };
}

export interface PipelineSummary {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  stages: StageSummary[];
}

export interface CreatePipelinePayload {
  name: string;
  isDefault?: boolean;
}

export interface UpdatePipelinePayload {
  name?: string;
  isDefault?: boolean;
}

export interface CreateStagePayload {
  name: string;
  order: number;
  probability: number;
  pipelineId: string;
}

export interface UpdateStagePayload {
  name?: string;
  order?: number;
  probability?: number;
}

// ─── Query keys ───────────────────────────────────────────────────────────────

export const pipelineKeys = {
  all: ["pipelines"] as const,
  list: () => ["pipelines", "list"] as const,
  detail: (id: string) => ["pipelines", "detail", id] as const,
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export function usePipelines() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";

  return useQuery({
    queryKey: pipelineKeys.list(),
    queryFn: () => apiFetch<PipelineSummary[]>("/pipelines", token),
    enabled: !!token,
  });
}

export function usePipeline(id: string) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";

  return useQuery({
    queryKey: pipelineKeys.detail(id),
    queryFn: () => apiFetch<PipelineSummary>(`/pipelines/${id}`, token),
    enabled: !!token && !!id,
  });
}

// ─── Pipeline Mutations ───────────────────────────────────────────────────────

export function useCreatePipeline() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatePipelinePayload) =>
      apiFetch<{ id: string }>("/pipelines", token, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: pipelineKeys.all }),
  });
}

export function useUpdatePipeline() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...payload }: UpdatePipelinePayload & { id: string }) =>
      apiFetch<{ id: string }>(`/pipelines/${id}`, token, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: pipelineKeys.detail(id) });
      qc.invalidateQueries({ queryKey: pipelineKeys.all });
    },
  });
}

export function useDeletePipeline() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/pipelines/${id}`, token, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: pipelineKeys.all }),
  });
}

export function useSetDefaultPipeline() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ id: string; isDefault: boolean }>(`/pipelines/${id}/set-default`, token, {
        method: "PATCH",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: pipelineKeys.all }),
  });
}

// ─── Stage Mutations ──────────────────────────────────────────────────────────

export function useCreateStage() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateStagePayload) =>
      apiFetch<{ id: string }>("/pipelines/stages", token, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (_data, { pipelineId }) => {
      qc.invalidateQueries({ queryKey: pipelineKeys.detail(pipelineId) });
      qc.invalidateQueries({ queryKey: pipelineKeys.all });
    },
  });
}

export function useUpdateStage() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, pipelineId, ...payload }: UpdateStagePayload & { id: string; pipelineId: string }) =>
      apiFetch<{ id: string }>(`/pipelines/stages/${id}`, token, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: (_data, { pipelineId }) => {
      qc.invalidateQueries({ queryKey: pipelineKeys.detail(pipelineId) });
      qc.invalidateQueries({ queryKey: pipelineKeys.all });
    },
  });
}

export function useDeleteStage() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string; pipelineId: string }) =>
      apiFetch<void>(`/pipelines/stages/${id}`, token, { method: "DELETE" }),
    onSuccess: (_data, { pipelineId }) => {
      qc.invalidateQueries({ queryKey: pipelineKeys.detail(pipelineId) });
      qc.invalidateQueries({ queryKey: pipelineKeys.all });
    },
  });
}

export function useReorderStages() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ pipelineId, stageIds }: { pipelineId: string; stageIds: string[] }) =>
      apiFetch<{ ok: boolean }>(`/pipelines/${pipelineId}/stages/reorder`, token, {
        method: "PATCH",
        body: JSON.stringify({ stageIds }),
      }),
    onSuccess: (_data, { pipelineId }) => {
      qc.invalidateQueries({ queryKey: pipelineKeys.detail(pipelineId) });
      qc.invalidateQueries({ queryKey: pipelineKeys.all });
    },
  });
}
