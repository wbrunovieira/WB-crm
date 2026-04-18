"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";

// ─── Query keys ──────────────────────────────────────────────────────────────

export const leadKeys = {
  all: ["leads"] as const,
  list: (filters?: Record<string, string>) => ["leads", "list", filters] as const,
  detail: (id: string) => ["leads", "detail", id] as const,
};

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useDeleteLead() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/leads/${id}`, token, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: leadKeys.all }),
  });
}

export function useArchiveLead() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      apiFetch<void>(`/leads/${id}/archive`, token, {
        method: "PATCH",
        body: JSON.stringify({ reason }),
      }),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: leadKeys.detail(id) });
      qc.invalidateQueries({ queryKey: leadKeys.all });
    },
  });
}

export function useUnarchiveLead() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/leads/${id}/unarchive`, token, { method: "PATCH" }),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: leadKeys.detail(id) });
      qc.invalidateQueries({ queryKey: leadKeys.all });
    },
  });
}
