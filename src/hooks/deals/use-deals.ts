"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";

// ─── Query keys ──────────────────────────────────────────────────────────────

export const dealKeys = {
  all: ["deals"] as const,
  list: (filters?: Record<string, string>) => ["deals", "list", filters] as const,
  detail: (id: string) => ["deals", "detail", id] as const,
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DealPayload {
  title: string;
  description?: string | null;
  value?: number;
  currency?: string;
  status?: "open" | "won" | "lost";
  stageId: string;
  contactId?: string | null;
  organizationId?: string | null;
  leadId?: string | null;
  expectedCloseDate?: string | null;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateDeal() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: DealPayload) =>
      apiFetch<{ id: string }>("/deals", token, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: dealKeys.all }),
  });
}

export function useUpdateDeal() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: DealPayload & { id: string }) =>
      apiFetch<{ id: string }>(`/deals/${id}`, token, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: dealKeys.detail(id) });
      qc.invalidateQueries({ queryKey: dealKeys.all });
    },
  });
}

export function useDeleteDeal() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/deals/${id}`, token, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: dealKeys.all }),
  });
}

export function useUpdateDealStage() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, stageId }: { id: string; stageId: string }) =>
      apiFetch<{ id: string; status: string; stageId: string; closedAt: string | null }>(
        `/deals/${id}/stage`,
        token,
        { method: "PATCH", body: JSON.stringify({ stageId }) },
      ),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: dealKeys.detail(id) });
      qc.invalidateQueries({ queryKey: dealKeys.all });
    },
  });
}
