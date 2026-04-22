"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";

export interface PartnerSelectItem {
  id: string;
  name: string;
  partnerType: string;
}

export function usePartnersForSelect() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  return useQuery<PartnerSelectItem[]>({
    queryKey: ["partners", "select"],
    queryFn: () => apiFetch<PartnerSelectItem[]>("/partners?pageSize=200", token),
    enabled: !!token,
    staleTime: 60_000,
  });
}

// ─── Query keys ──────────────────────────────────────────────────────────────

export const partnerKeys = {
  all: ["partners"] as const,
  list: (filters?: Record<string, string>) => ["partners", "list", filters] as const,
  detail: (id: string) => ["partners", "detail", id] as const,
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PartnerPayload {
  name: string;
  partnerType: string;
  legalName?: string;
  foundationDate?: string;
  website?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  country?: string;
  state?: string;
  city?: string;
  zipCode?: string;
  streetAddress?: string;
  linkedin?: string;
  instagram?: string;
  facebook?: string;
  twitter?: string;
  industry?: string;
  employeeCount?: number;
  companySize?: string;
  description?: string;
  expertise?: string;
  notes?: string;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreatePartner() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: PartnerPayload) =>
      apiFetch<{ id: string }>("/partners", token, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: partnerKeys.all }),
  });
}

export function useUpdatePartner() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: PartnerPayload & { id: string }) =>
      apiFetch<{ id: string }>(`/partners/${id}`, token, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: partnerKeys.detail(id) });
      qc.invalidateQueries({ queryKey: partnerKeys.all });
    },
  });
}

export function useDeletePartner() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/partners/${id}`, token, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: partnerKeys.all }),
  });
}

export function useUpdatePartnerLastContact() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ id: string }>(`/partners/${id}/last-contact`, token, { method: "PATCH" }),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: partnerKeys.detail(id) });
      qc.invalidateQueries({ queryKey: partnerKeys.all });
    },
  });
}
