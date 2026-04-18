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

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LeadContactInput {
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  linkedin?: string;
  instagram?: string;
  role?: string;
  isPrimary?: boolean;
  languages?: string;
}

export interface CreateLeadPayload {
  businessName: string;
  registeredName?: string;
  foundationDate?: string;
  companyRegistrationID?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  vicinity?: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  email?: string;
  instagram?: string;
  linkedin?: string;
  facebook?: string;
  twitter?: string;
  tiktok?: string;
  companyOwner?: string;
  companySize?: string;
  revenue?: number;
  employeesCount?: number;
  description?: string;
  businessStatus?: string;
  languages?: string;
  quality?: string;
  socialMedia?: string;
  metaAds?: string;
  googleAds?: string;
  starRating?: number;
  status?: string;
  isArchived?: boolean;
  isProspect?: boolean;
  source?: string;
  primaryCNAEId?: string;
  internationalActivity?: string;
  referredByPartnerId?: string;
  driveFolderId?: string;
  // Relations
  labelIds?: string[];
  icpId?: string;
  contacts?: LeadContactInput[];
}

export type UpdateLeadPayload = Partial<Omit<CreateLeadPayload, "contacts" | "icpId">> & {
  icpId?: string | null; // null = remove ICP
};

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateLead() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateLeadPayload) =>
      apiFetch<{ id: string }>("/leads", token, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: leadKeys.all }),
  });
}

export function useUpdateLead() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateLeadPayload & { id: string }) =>
      apiFetch<{ id: string }>(`/leads/${id}`, token, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: leadKeys.detail(id) });
      qc.invalidateQueries({ queryKey: leadKeys.all });
    },
  });
}

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
