"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiFetch, BACKEND_URL } from "@/lib/api-client";
import type { ContactSummary, ContactDetail } from "@/types/contact";

// ─── Query keys ──────────────────────────────────────────────────────────────

export const contactKeys = {
  all: ["contacts"] as const,
  list: (filters?: Record<string, string>) => ["contacts", "list", filters] as const,
  detail: (id: string) => ["contacts", "detail", id] as const,
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useContacts(filters?: {
  search?: string;
  status?: string;
  company?: string;
  owner?: string;
}) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";

  const params = new URLSearchParams();
  if (filters?.search) params.set("search", filters.search);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.company) params.set("company", filters.company);
  if (filters?.owner) params.set("owner", filters.owner);
  const query = params.toString();

  return useQuery({
    queryKey: contactKeys.list(filters),
    queryFn: () => apiFetch<ContactSummary[]>(`/contacts${query ? `?${query}` : ""}`, token),
    enabled: !!token,
  });
}

export function useContact(id: string) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";

  return useQuery({
    queryKey: contactKeys.detail(id),
    queryFn: () => apiFetch<ContactDetail>(`/contacts/${id}`, token),
    enabled: !!token && !!id,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateContact() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch<{ id: string }>("/contacts", token, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: contactKeys.all }),
  });
}

export function useUpdateContact(id: string) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch<void>(`/contacts/${id}`, token, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contactKeys.detail(id) });
      qc.invalidateQueries({ queryKey: contactKeys.all });
    },
  });
}

export function useDeleteContact() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/contacts/${id}`, token, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: contactKeys.all }),
  });
}

export function useToggleContactStatus(id: string) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiFetch<void>(`/contacts/${id}/toggle-status`, token, { method: "PATCH" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contactKeys.detail(id) });
      qc.invalidateQueries({ queryKey: contactKeys.all });
    },
  });
}
