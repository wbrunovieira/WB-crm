"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Cadence {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  objective?: string | null;
  durationDays: number;
  icpId?: string | null;
  status: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CadenceStep {
  id: string;
  cadenceId: string;
  dayNumber: number;
  channel: string;
  activityType?: string;
  subject: string;
  description?: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface LeadCadenceRecord {
  id: string;
  leadId: string;
  cadenceId: string;
  status: string;
  startDate: string;
  currentStep: number;
  notes?: string;
  ownerId: string;
  pausedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
}

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const cadenceKeys = {
  all: ["cadences"] as const,
  list: (icpId?: string) => ["cadences", "list", { icpId }] as const,
  detail: (id: string) => ["cadences", "detail", id] as const,
  steps: (cadenceId: string) => ["cadences", "steps", cadenceId] as const,
  leadCount: (id: string) => ["cadences", "lead-count", id] as const,
  leadCadences: (leadId: string) => ["cadences", "lead", leadId] as const,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function useToken() {
  const { data: session } = useSession();
  return session?.user?.accessToken ?? "";
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export function useCadences(icpId?: string) {
  const token = useToken();
  const params = icpId ? `?icpId=${icpId}` : "";
  return useQuery({
    queryKey: cadenceKeys.list(icpId),
    queryFn: () => apiFetch<Cadence[]>(`/cadences${params}`, token),
    enabled: !!token,
  });
}

export function useCadenceById(id: string) {
  const token = useToken();
  return useQuery({
    queryKey: cadenceKeys.detail(id),
    queryFn: () => apiFetch<Cadence>(`/cadences/${id}`, token),
    enabled: !!token && !!id,
  });
}

export function useCadenceSteps(cadenceId: string) {
  const token = useToken();
  return useQuery({
    queryKey: cadenceKeys.steps(cadenceId),
    queryFn: () => apiFetch<CadenceStep[]>(`/cadences/${cadenceId}/steps`, token),
    enabled: !!token && !!cadenceId,
  });
}

export function useCadenceLeadCount(cadenceId: string) {
  const token = useToken();
  return useQuery({
    queryKey: cadenceKeys.leadCount(cadenceId),
    queryFn: () => apiFetch<{ count: number }>(`/cadences/${cadenceId}/lead-count`, token),
    enabled: !!token && !!cadenceId,
  });
}

export function useBackendLeadCadences(leadId: string) {
  const token = useToken();
  return useQuery({
    queryKey: cadenceKeys.leadCadences(leadId),
    queryFn: () => apiFetch<LeadCadenceRecord[]>(`/cadences/lead/${leadId}`, token),
    enabled: !!token && !!leadId,
  });
}

// ─── Cadence Mutations ───────────────────────────────────────────────────────

export function useCreateCadence() {
  const queryClient = useQueryClient();
  const token = useToken();
  return useMutation({
    mutationFn: (data: {
      name: string;
      slug?: string;
      description?: string | null;
      objective?: string | null;
      durationDays?: number;
      icpId?: string | null;
    }) =>
      apiFetch<Cadence>("/cadences", token, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cadenceKeys.all });
    },
  });
}

export function useUpdateCadence() {
  const queryClient = useQueryClient();
  const token = useToken();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      name?: string;
      slug?: string;
      description?: string | null;
      objective?: string | null;
      durationDays?: number;
      icpId?: string | null;
    }) =>
      apiFetch<Cadence>(`/cadences/${id}`, token, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: cadenceKeys.all });
      queryClient.invalidateQueries({ queryKey: cadenceKeys.detail(vars.id) });
    },
  });
}

export function useDeleteCadence() {
  const queryClient = useQueryClient();
  const token = useToken();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/cadences/${id}`, token, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cadenceKeys.all });
    },
  });
}

export function usePublishCadence() {
  const queryClient = useQueryClient();
  const token = useToken();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/cadences/${id}/publish`, token, { method: "PATCH" }),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: cadenceKeys.all });
      queryClient.invalidateQueries({ queryKey: cadenceKeys.detail(id) });
    },
  });
}

export function useUnpublishCadence() {
  const queryClient = useQueryClient();
  const token = useToken();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/cadences/${id}/unpublish`, token, { method: "PATCH" }),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: cadenceKeys.all });
      queryClient.invalidateQueries({ queryKey: cadenceKeys.detail(id) });
    },
  });
}

// ─── Step Mutations ───────────────────────────────────────────────────────────

export function useCreateCadenceStep() {
  const queryClient = useQueryClient();
  const token = useToken();
  return useMutation({
    mutationFn: (data: {
      cadenceId: string;
      dayNumber: number;
      channel: string;
      subject: string;
      description?: string | null;
      order?: number;
    }) =>
      apiFetch<CadenceStep>(`/cadences/${data.cadenceId}/steps`, token, {
        method: "POST",
        body: JSON.stringify({
          dayNumber: data.dayNumber,
          channel: data.channel,
          subject: data.subject,
          description: data.description,
          order: data.order,
        }),
      }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: cadenceKeys.steps(vars.cadenceId) });
    },
  });
}

export function useUpdateCadenceStep() {
  const queryClient = useQueryClient();
  const token = useToken();
  return useMutation({
    mutationFn: ({
      stepId,
      cadenceId,
      ...data
    }: {
      stepId: string;
      cadenceId: string;
      dayNumber?: number;
      channel?: string;
      subject?: string;
      description?: string | null;
      order?: number;
    }) =>
      apiFetch<CadenceStep>(`/cadences/steps/${stepId}`, token, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: cadenceKeys.steps(vars.cadenceId) });
    },
  });
}

export function useDeleteCadenceStep() {
  const queryClient = useQueryClient();
  const token = useToken();
  return useMutation({
    mutationFn: ({ stepId, cadenceId }: { stepId: string; cadenceId: string }) =>
      apiFetch<void>(`/cadences/steps/${stepId}`, token, { method: "DELETE" }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: cadenceKeys.steps(vars.cadenceId) });
    },
  });
}

// ─── Lead-Cadence Mutations ───────────────────────────────────────────────────

export function useApplyCadence() {
  const queryClient = useQueryClient();
  const token = useToken();
  return useMutation({
    mutationFn: (data: {
      cadenceId: string;
      leadId: string;
      startDate?: Date;
      notes?: string;
    }) =>
      apiFetch<{ leadCadenceId: string }>(`/cadences/${data.cadenceId}/apply`, token, {
        method: "POST",
        body: JSON.stringify({
          leadId: data.leadId,
          startDate: data.startDate?.toISOString(),
          notes: data.notes,
        }),
      }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: cadenceKeys.leadCadences(vars.leadId) });
    },
  });
}

export function useBulkApplyCadence() {
  const queryClient = useQueryClient();
  const token = useToken();
  return useMutation({
    mutationFn: (data: {
      cadenceId: string;
      leadIds: string[];
      startDate?: Date;
      notes?: string;
    }) =>
      apiFetch<{ applied: number; skipped: number; total: number }>(
        "/cadences/bulk-apply",
        token,
        {
          method: "POST",
          body: JSON.stringify({
            cadenceId: data.cadenceId,
            leadIds: data.leadIds,
            startDate: data.startDate?.toISOString(),
            notes: data.notes,
          }),
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cadenceKeys.all });
    },
  });
}

export function usePauseLeadCadence() {
  const queryClient = useQueryClient();
  const token = useToken();
  return useMutation({
    mutationFn: ({ leadCadenceId, leadId }: { leadCadenceId: string; leadId: string }) =>
      apiFetch<void>(`/cadences/lead-cadences/${leadCadenceId}/pause`, token, {
        method: "PATCH",
      }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: cadenceKeys.leadCadences(vars.leadId) });
    },
  });
}

export function useResumeLeadCadence() {
  const queryClient = useQueryClient();
  const token = useToken();
  return useMutation({
    mutationFn: ({ leadCadenceId, leadId }: { leadCadenceId: string; leadId: string }) =>
      apiFetch<void>(`/cadences/lead-cadences/${leadCadenceId}/resume`, token, {
        method: "PATCH",
      }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: cadenceKeys.leadCadences(vars.leadId) });
    },
  });
}

export function useCancelLeadCadence() {
  const queryClient = useQueryClient();
  const token = useToken();
  return useMutation({
    mutationFn: ({ leadCadenceId, leadId }: { leadCadenceId: string; leadId: string }) =>
      apiFetch<void>(`/cadences/lead-cadences/${leadCadenceId}/cancel`, token, {
        method: "PATCH",
      }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: cadenceKeys.leadCadences(vars.leadId) });
    },
  });
}
