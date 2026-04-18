"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";
import type { OrganizationFormData } from "@/lib/validations/organization";

// ─── Query keys ──────────────────────────────────────────────────────────────

export const organizationKeys = {
  all: ["organizations"] as const,
  list: (filters?: Record<string, string>) => ["organizations", "list", filters] as const,
  detail: (id: string) => ["organizations", "detail", id] as const,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildPayload(data: OrganizationFormData) {
  return {
    ...data,
    // Serialize languages array → JSON string for the backend
    languages: data.languages && data.languages.length > 0
      ? JSON.stringify(data.languages)
      : undefined,
    // labelIds sent directly to the backend (saveWithLabels in use case handles atomically)
  };
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateOrganization() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: OrganizationFormData) =>
      apiFetch<{ id: string }>("/organizations", token, {
        method: "POST",
        body: JSON.stringify(buildPayload(data)),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: organizationKeys.all }),
  });
}

export function useUpdateOrganization() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: OrganizationFormData & { id: string }) =>
      apiFetch<{ id: string }>(`/organizations/${id}`, token, {
        method: "PATCH",
        body: JSON.stringify(buildPayload(data)),
      }),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: organizationKeys.detail(id) });
      qc.invalidateQueries({ queryKey: organizationKeys.all });
    },
  });
}

export function useDeleteOrganization() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/organizations/${id}`, token, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: organizationKeys.all }),
  });
}
