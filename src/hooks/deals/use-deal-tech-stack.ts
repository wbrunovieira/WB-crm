"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";

export interface DealTechCategory { id: string; categoryId: string; categoryName: string; }
export interface DealTechLanguage { id: string; languageId: string; languageName: string; isPrimary: boolean; }
export interface DealTechFramework { id: string; frameworkId: string; frameworkName: string; }
export interface DealTechStack { categories: DealTechCategory[]; languages: DealTechLanguage[]; frameworks: DealTechFramework[]; }

export const dealTechKeys = {
  stack: (dealId: string) => ["deals", "tech-stack", dealId] as const,
};

export function useDealTechStack(dealId: string) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  return useQuery({
    queryKey: dealTechKeys.stack(dealId),
    queryFn: () => apiFetch<DealTechStack>(`/deals/${dealId}/tech-stack`, token),
    enabled: !!token && !!dealId,
  });
}

export function useAddCategoryToDeal() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dealId, categoryId }: { dealId: string; categoryId: string }) =>
      apiFetch<void>(`/deals/${dealId}/tech-stack/categories/${categoryId}`, token, { method: "POST" }),
    onSuccess: (_d, { dealId }) => qc.invalidateQueries({ queryKey: dealTechKeys.stack(dealId) }),
  });
}

export function useRemoveCategoryFromDeal() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dealId, categoryId }: { dealId: string; categoryId: string }) =>
      apiFetch<void>(`/deals/${dealId}/tech-stack/categories/${categoryId}`, token, { method: "DELETE" }),
    onSuccess: (_d, { dealId }) => qc.invalidateQueries({ queryKey: dealTechKeys.stack(dealId) }),
  });
}

export function useAddLanguageToDeal() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dealId, languageId, isPrimary }: { dealId: string; languageId: string; isPrimary?: boolean }) =>
      apiFetch<void>(`/deals/${dealId}/tech-stack/languages/${languageId}`, token, { method: "POST", body: JSON.stringify({ isPrimary }) }),
    onSuccess: (_d, { dealId }) => qc.invalidateQueries({ queryKey: dealTechKeys.stack(dealId) }),
  });
}

export function useRemoveLanguageFromDeal() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dealId, languageId }: { dealId: string; languageId: string }) =>
      apiFetch<void>(`/deals/${dealId}/tech-stack/languages/${languageId}`, token, { method: "DELETE" }),
    onSuccess: (_d, { dealId }) => qc.invalidateQueries({ queryKey: dealTechKeys.stack(dealId) }),
  });
}

export function useSetPrimaryLanguage() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dealId, languageId }: { dealId: string; languageId: string }) =>
      apiFetch<void>(`/deals/${dealId}/tech-stack/languages/${languageId}/primary`, token, { method: "PATCH" }),
    onSuccess: (_d, { dealId }) => qc.invalidateQueries({ queryKey: dealTechKeys.stack(dealId) }),
  });
}

export function useAddFrameworkToDeal() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dealId, frameworkId }: { dealId: string; frameworkId: string }) =>
      apiFetch<void>(`/deals/${dealId}/tech-stack/frameworks/${frameworkId}`, token, { method: "POST" }),
    onSuccess: (_d, { dealId }) => qc.invalidateQueries({ queryKey: dealTechKeys.stack(dealId) }),
  });
}

export function useRemoveFrameworkFromDeal() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dealId, frameworkId }: { dealId: string; frameworkId: string }) =>
      apiFetch<void>(`/deals/${dealId}/tech-stack/frameworks/${frameworkId}`, token, { method: "DELETE" }),
    onSuccess: (_d, { dealId }) => qc.invalidateQueries({ queryKey: dealTechKeys.stack(dealId) }),
  });
}
