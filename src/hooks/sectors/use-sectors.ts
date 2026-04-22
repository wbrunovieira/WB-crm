"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Sector {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  marketSize?: string | null;
  marketSizeNotes?: string | null;
  averageTicket?: string | null;
  budgetSeason?: string | null;
  salesCycleDays?: number | null;
  salesCycleNotes?: string | null;
  decisionMakers?: string | null;
  buyingProcess?: string | null;
  mainObjections?: string | null;
  mainPains?: string | null;
  referenceCompanies?: string | null;
  competitorsLandscape?: string | null;
  jargons?: string | null;
  regulatoryNotes?: string | null;
  isActive: boolean;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SectorSelect {
  id: string;
  name: string;
  slug: string;
}

// ─── Query keys ──────────────────────────────────────────────────────────────

export const sectorKeys = {
  all: ["sectors"] as const,
  list: () => ["sectors", "list"] as const,
  leadSectors: (leadId: string) => ["sectors", "lead", leadId] as const,
  orgSectors: (orgId: string) => ["sectors", "org", orgId] as const,
};

// ─── Queries ─────────────────────────────────────────────────────────────────

export function useSectors() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  return useQuery({
    queryKey: sectorKeys.list(),
    queryFn: () => apiFetch<Sector[]>("/sectors", token),
    enabled: !!token,
  });
}

export function useLeadSectors(leadId: string) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  return useQuery({
    queryKey: sectorKeys.leadSectors(leadId),
    queryFn: () => apiFetch<{ sector: Sector }[]>(`/sectors/leads/${leadId}`, token),
    enabled: !!token && !!leadId,
  });
}

export function useOrgSectors(orgId: string) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  return useQuery({
    queryKey: sectorKeys.orgSectors(orgId),
    queryFn: () => apiFetch<{ sector: Sector }[]>(`/sectors/organizations/${orgId}`, token),
    enabled: !!token && !!orgId,
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export function useCreateSector() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Sector, "id" | "ownerId" | "createdAt" | "updatedAt">) =>
      apiFetch<Sector>("/sectors", token, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: sectorKeys.all }),
  });
}

export function useUpdateSector() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Sector> & { id: string }) =>
      apiFetch<Sector>(`/sectors/${id}`, token, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: sectorKeys.all }),
  });
}

export function useDeleteSector() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/sectors/${id}`, token, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: sectorKeys.all }),
  });
}

export function useLinkLeadToSector() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, sectorId }: { leadId: string; sectorId: string }) =>
      apiFetch<void>(`/sectors/leads/${leadId}/${sectorId}`, token, { method: "POST" }),
    onSuccess: (_d, { leadId }) => qc.invalidateQueries({ queryKey: sectorKeys.leadSectors(leadId) }),
  });
}

export function useUnlinkLeadFromSector() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, sectorId }: { leadId: string; sectorId: string }) =>
      apiFetch<void>(`/sectors/leads/${leadId}/${sectorId}`, token, { method: "DELETE" }),
    onSuccess: (_d, { leadId }) => qc.invalidateQueries({ queryKey: sectorKeys.leadSectors(leadId) }),
  });
}

export function useLinkOrgToSector() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, sectorId }: { orgId: string; sectorId: string }) =>
      apiFetch<void>(`/sectors/organizations/${orgId}/${sectorId}`, token, { method: "POST" }),
    onSuccess: (_d, { orgId }) => qc.invalidateQueries({ queryKey: sectorKeys.orgSectors(orgId) }),
  });
}

export function useUnlinkOrgFromSector() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, sectorId }: { orgId: string; sectorId: string }) =>
      apiFetch<void>(`/sectors/organizations/${orgId}/${sectorId}`, token, { method: "DELETE" }),
    onSuccess: (_d, { orgId }) => qc.invalidateQueries({ queryKey: sectorKeys.orgSectors(orgId) }),
  });
}
