"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";

export interface ProductLink {
  productId: string;
  name: string;
  slug: string;
  description?: string;
  basePrice?: number;
  currency: string;
  notes?: string;
  interest?: string;
  status?: string;
}

export const productLinkKeys = {
  lead: (leadId: string) => ["product-links", "lead", leadId] as const,
  deal: (dealId: string) => ["product-links", "deal", dealId] as const,
};

export function useLeadProducts(leadId: string) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  return useQuery({
    queryKey: productLinkKeys.lead(leadId),
    queryFn: () => apiFetch<ProductLink[]>(`/leads/${leadId}/products`, token),
    enabled: !!token && !!leadId,
  });
}

export function useAddLeadProduct() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, productId, ...body }: { leadId: string; productId: string; notes?: string; interest?: string }) =>
      apiFetch<ProductLink>(`/leads/${leadId}/products/${productId}`, token, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: (_d, { leadId }) => qc.invalidateQueries({ queryKey: productLinkKeys.lead(leadId) }),
  });
}

export function useRemoveLeadProduct() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, productId }: { leadId: string; productId: string }) =>
      apiFetch<void>(`/leads/${leadId}/products/${productId}`, token, { method: "DELETE" }),
    onSuccess: (_d, { leadId }) => qc.invalidateQueries({ queryKey: productLinkKeys.lead(leadId) }),
  });
}

export function useDealProducts(dealId: string) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  return useQuery({
    queryKey: productLinkKeys.deal(dealId),
    queryFn: () => apiFetch<ProductLink[]>(`/deals/${dealId}/products`, token),
    enabled: !!token && !!dealId,
  });
}

export function useAddDealProduct() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dealId, productId, ...body }: { dealId: string; productId: string; quantity?: number; unitPrice?: number; notes?: string }) =>
      apiFetch<ProductLink>(`/deals/${dealId}/products/${productId}`, token, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: (_d, { dealId }) => qc.invalidateQueries({ queryKey: productLinkKeys.deal(dealId) }),
  });
}

export function useRemoveDealProduct() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dealId, productId }: { dealId: string; productId: string }) =>
      apiFetch<void>(`/deals/${dealId}/products/${productId}`, token, { method: "DELETE" }),
    onSuccess: (_d, { dealId }) => qc.invalidateQueries({ queryKey: productLinkKeys.deal(dealId) }),
  });
}
