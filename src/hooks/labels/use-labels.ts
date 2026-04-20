"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Label {
  id: string;
  name: string;
  color: string;
}

// ─── Query keys ──────────────────────────────────────────────────────────────

export const labelKeys = {
  all: ["labels"] as const,
};

// ─── Queries ─────────────────────────────────────────────────────────────────

export function useLabels() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";

  return useQuery({
    queryKey: labelKeys.all,
    queryFn: () => apiFetch<Label[]>("/labels", token),
    enabled: !!token,
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export function useCreateLabel() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ name, color }: { name: string; color: string }) =>
      apiFetch<Label>("/labels", token, {
        method: "POST",
        body: JSON.stringify({ name, color }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: labelKeys.all }),
  });
}

export function useUpdateLabel() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name, color }: { id: string; name: string; color: string }) =>
      apiFetch<Label>(`/labels/${id}`, token, {
        method: "PATCH",
        body: JSON.stringify({ name, color }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: labelKeys.all }),
  });
}

export function useDeleteLabel() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/labels/${id}`, token, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: labelKeys.all }),
  });
}
