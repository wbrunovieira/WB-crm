"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  registeredName?: string | null;
  foundationDate?: string | null;
  companyRegistrationID?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  zipCode?: string | null;
  vicinity?: string | null;
  phone?: string | null;
  phone2?: string | null;
  whatsapp?: string | null;
  website?: string | null;
  email?: string | null;
  instagram?: string | null;
  linkedin?: string | null;
  facebook?: string | null;
  twitter?: string | null;
  tiktok?: string | null;
  companyOwner?: string | null;
  companySize?: string | null;
  revenue?: number;
  employeesCount?: number;
  description?: string | null;
  businessStatus?: string | null;
  languages?: string | null;
  quality?: string | null;
  socialMedia?: string | null;
  metaAds?: string | null;
  googleAds?: string | null;
  starRating?: number;
  status?: string;
  isArchived?: boolean;
  isProspect?: boolean;
  source?: string | null;
  segment?: string | null;
  legalNature?: string | null;
  branchType?: string | null;
  simplesNacional?: boolean;
  isMei?: boolean;
  revenueRange?: string | null;
  sourceGroup?: string | null;
  primaryCNAEId?: string | null;
  internationalActivity?: string | null;
  commLanguage?: string | null;
  referredByPartnerId?: string | null;
  driveFolderId?: string | null;
  parentLeadId?: string | null;
  notes?: string | null;
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

export interface LeadSelectItem {
  id: string;
  businessName: string;
  city: string | null;
  state: string | null;
}

export function useLeadsForSelect() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";

  return useQuery({
    queryKey: ["leads", "for-select"],
    queryFn: () => apiFetch<LeadSelectItem[]>("/leads/for-select", token),
    enabled: !!token,
    staleTime: 60_000,
  });
}
