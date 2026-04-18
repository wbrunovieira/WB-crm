"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";

// ─── Query keys ──────────────────────────────────────────────────────────────

export const activityKeys = {
  all: ["activities"] as const,
  list: (filters?: Record<string, string>) => ["activities", "list", filters] as const,
  detail: (id: string) => ["activities", "detail", id] as const,
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActivityPayload {
  type: string;
  subject: string;
  description?: string | null;
  dueDate?: string | null;
  completed?: boolean;
  dealId?: string | null;
  contactIds?: string[] | null;
  leadContactIds?: string[] | null;
  leadId?: string | null;
  partnerId?: string | null;
  callContactType?: string | null;
  meetingNoShow?: boolean;
}

export type UpdateActivityPayload = Partial<ActivityPayload>;

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateActivity() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: ActivityPayload) =>
      apiFetch<{ id: string }>("/activities", token, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: activityKeys.all }),
  });
}

export function useUpdateActivity() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: UpdateActivityPayload & { id: string }) =>
      apiFetch<{ id: string }>(`/activities/${id}`, token, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: activityKeys.detail(id) });
      qc.invalidateQueries({ queryKey: activityKeys.all });
    },
  });
}

export function useDeleteActivity() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/activities/${id}`, token, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: activityKeys.all }),
  });
}

export function useToggleActivityCompleted() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ id: string; completed: boolean }>(`/activities/${id}/toggle-completed`, token, {
        method: "PATCH",
      }),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: activityKeys.detail(id) });
      qc.invalidateQueries({ queryKey: activityKeys.all });
    },
  });
}

export function useMarkActivityFailed() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiFetch<{ id: string }>(`/activities/${id}/fail`, token, {
        method: "PATCH",
        body: JSON.stringify({ reason }),
      }),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: activityKeys.detail(id) });
      qc.invalidateQueries({ queryKey: activityKeys.all });
    },
  });
}

export function useMarkActivitySkipped() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiFetch<{ id: string }>(`/activities/${id}/skip`, token, {
        method: "PATCH",
        body: JSON.stringify({ reason }),
      }),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: activityKeys.detail(id) });
      qc.invalidateQueries({ queryKey: activityKeys.all });
    },
  });
}

export function useRevertActivityOutcome() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ id: string }>(`/activities/${id}/revert`, token, {
        method: "PATCH",
      }),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: activityKeys.detail(id) });
      qc.invalidateQueries({ queryKey: activityKeys.all });
    },
  });
}

export function useLinkActivityToDeal() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ activityId, dealId }: { activityId: string; dealId: string }) =>
      apiFetch<{ id: string }>(`/activities/${activityId}/deals/${dealId}`, token, {
        method: "POST",
      }),
    onSuccess: (_data, { activityId }) => {
      qc.invalidateQueries({ queryKey: activityKeys.detail(activityId) });
      qc.invalidateQueries({ queryKey: activityKeys.all });
    },
  });
}

export function useUnlinkActivityFromDeal() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ activityId, dealId }: { activityId: string; dealId: string }) =>
      apiFetch<{ id: string }>(`/activities/${activityId}/deals/${dealId}`, token, {
        method: "DELETE",
      }),
    onSuccess: (_data, { activityId }) => {
      qc.invalidateQueries({ queryKey: activityKeys.detail(activityId) });
      qc.invalidateQueries({ queryKey: activityKeys.all });
    },
  });
}
