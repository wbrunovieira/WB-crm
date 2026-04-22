"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ICP {
  id: string;
  name: string;
  slug: string;
  status: string;
  content?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ICPVersion {
  id: string;
  versionNumber: number;
  name: string;
  content: string;
  status: string;
  changeReason: string | null;
  createdAt: string;
  user?: { id: string; name: string | null };
}

export interface ICPLinkData {
  matchScore?: number | null;
  notes?: string | null;
  icpFitStatus?: string | null;
  realDecisionMaker?: string | null;
  realDecisionMakerOther?: string | null;
  perceivedUrgency?: string[] | string | null;
  businessMoment?: string[] | string | null;
  currentPlatforms?: string[] | string | null;
  fragmentationLevel?: number | string | null;
  mainDeclaredPain?: string | null;
  strategicDesire?: string | null;
  perceivedTechnicalComplexity?: number | string | null;
  purchaseTrigger?: string | null;
  nonClosingReason?: string | null;
  estimatedDecisionTime?: string | null;
  expansionPotential?: number | string | null;
}

export interface ICPLeadLink extends ICPLinkData {
  icpId: string;
  leadId: string;
  icp: { id: string; name: string; slug: string; status: string };
}

export interface ICPOrgLink extends ICPLinkData {
  icpId: string;
  organizationId: string;
  icp: { id: string; name: string; slug: string; status: string };
}

// ─── Query keys ──────────────────────────────────────────────────────────────

export const icpKeys = {
  all: ["icps"] as const,
  list: (status?: string) => ["icps", "list", status] as const,
  detail: (id: string) => ["icps", "detail", id] as const,
  versions: (id: string) => ["icps", "versions", id] as const,
  leadICPs: (leadId: string) => ["icps", "lead", leadId] as const,
  orgICPs: (orgId: string) => ["icps", "org", orgId] as const,
};

// ─── Queries ─────────────────────────────────────────────────────────────────

export function useICPs(status?: string) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const query = status ? `?status=${status}` : "";
  return useQuery({
    queryKey: icpKeys.list(status),
    queryFn: () => apiFetch<ICP[]>(`/icps${query}`, token),
    enabled: !!token,
  });
}

export function useICPById(id: string) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  return useQuery({
    queryKey: icpKeys.detail(id),
    queryFn: () => apiFetch<ICP>(`/icps/${id}`, token),
    enabled: !!token && !!id,
  });
}

export function useICPVersions(icpId: string) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  return useQuery({
    queryKey: icpKeys.versions(icpId),
    queryFn: () => apiFetch<ICPVersion[]>(`/icps/${icpId}/versions`, token),
    enabled: !!token && !!icpId,
  });
}

export function useLeadICPs(leadId: string) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  return useQuery({
    queryKey: icpKeys.leadICPs(leadId),
    queryFn: () => apiFetch<ICPLeadLink[]>(`/icps/leads/${leadId}`, token),
    enabled: !!token && !!leadId,
  });
}

export function useOrgICPs(orgId: string) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  return useQuery({
    queryKey: icpKeys.orgICPs(orgId),
    queryFn: () => apiFetch<ICPOrgLink[]>(`/icps/organizations/${orgId}`, token),
    enabled: !!token && !!orgId,
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export function useCreateICP() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; slug?: string; content: string; status?: string }) =>
      apiFetch<ICP>("/icps", token, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: icpKeys.all }),
  });
}

export function useUpdateICP() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; slug?: string; content?: string; status?: string; changeReason?: string }) =>
      apiFetch<ICP>(`/icps/${id}`, token, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: icpKeys.all }),
  });
}

export function useDeleteICP() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/icps/${id}`, token, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: icpKeys.all }),
  });
}

export function useRestoreICPVersion() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ icpId, versionId }: { icpId: string; versionId: string }) =>
      apiFetch<ICP>(`/icps/${icpId}/versions/restore`, token, { method: "POST", body: JSON.stringify({ versionId }) }),
    onSuccess: (_d, { icpId }) => qc.invalidateQueries({ queryKey: icpKeys.versions(icpId) }),
  });
}

export function useLinkLeadToICP() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, icpId, ...data }: { leadId: string; icpId: string } & ICPLinkData) =>
      apiFetch<void>(`/icps/leads/${leadId}/${icpId}`, token, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (_d, { leadId }) => qc.invalidateQueries({ queryKey: icpKeys.leadICPs(leadId) }),
  });
}

export function useUpdateLeadICP() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, icpId, ...data }: { leadId: string; icpId: string } & ICPLinkData) =>
      apiFetch<void>(`/icps/leads/${leadId}/${icpId}`, token, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: (_d, { leadId }) => qc.invalidateQueries({ queryKey: icpKeys.leadICPs(leadId) }),
  });
}

export function useUnlinkLeadFromICP() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, icpId }: { leadId: string; icpId: string }) =>
      apiFetch<void>(`/icps/leads/${leadId}/${icpId}`, token, { method: "DELETE" }),
    onSuccess: (_d, { leadId }) => qc.invalidateQueries({ queryKey: icpKeys.leadICPs(leadId) }),
  });
}

export function useLinkOrgToICP() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, icpId, ...data }: { orgId: string; icpId: string } & ICPLinkData) =>
      apiFetch<void>(`/icps/organizations/${orgId}/${icpId}`, token, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (_d, { orgId }) => qc.invalidateQueries({ queryKey: icpKeys.orgICPs(orgId) }),
  });
}

export function useUpdateOrgICP() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, icpId, ...data }: { orgId: string; icpId: string } & ICPLinkData) =>
      apiFetch<void>(`/icps/organizations/${orgId}/${icpId}`, token, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: (_d, { orgId }) => qc.invalidateQueries({ queryKey: icpKeys.orgICPs(orgId) }),
  });
}

export function useUnlinkOrgFromICP() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, icpId }: { orgId: string; icpId: string }) =>
      apiFetch<void>(`/icps/organizations/${orgId}/${icpId}`, token, { method: "DELETE" }),
    onSuccess: (_d, { orgId }) => qc.invalidateQueries({ queryKey: icpKeys.orgICPs(orgId) }),
  });
}
