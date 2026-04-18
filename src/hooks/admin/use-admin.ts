"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TechOptionType =
  | "tech-category"
  | "tech-language"
  | "tech-framework"
  | "profile-language"
  | "profile-framework"
  | "profile-hosting"
  | "profile-database"
  | "profile-erp"
  | "profile-crm"
  | "profile-ecommerce";

export interface BusinessLineSummary {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  icon?: string;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductSummary {
  id: string;
  name: string;
  slug: string;
  description?: string;
  businessLineId: string;
  basePrice?: number;
  currency: string;
  pricingType?: string;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface TechOptionSummary {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  icon?: string;
  order?: number;
  isActive: boolean;
  languageSlug?: string;
  subType?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBusinessLinePayload {
  name: string;
  slug: string;
  description?: string;
  color?: string;
  icon?: string;
  isActive?: boolean;
  order?: number;
}

export interface UpdateBusinessLinePayload extends Partial<CreateBusinessLinePayload> {
  id: string;
}

export interface CreateProductPayload {
  name: string;
  slug: string;
  businessLineId: string;
  description?: string;
  basePrice?: number;
  currency?: string;
  pricingType?: string;
  isActive?: boolean;
  order?: number;
}

export interface UpdateProductPayload extends Partial<Omit<CreateProductPayload, "businessLineId">> {
  id: string;
  businessLineId?: string;
}

export interface CreateTechOptionPayload {
  name: string;
  slug: string;
  description?: string;
  color?: string;
  icon?: string;
  order?: number;
  isActive?: boolean;
  languageSlug?: string;
  subType?: string;
}

export interface UpdateTechOptionPayload extends Partial<CreateTechOptionPayload> {
  id: string;
}

// ─── Query keys ───────────────────────────────────────────────────────────────

export const adminKeys = {
  all: ["admin"] as const,
  businessLines: () => ["admin", "business-lines"] as const,
  products: (businessLineId?: string) => ["admin", "products", businessLineId ?? "all"] as const,
  techOptions: (type: TechOptionType) => ["admin", "tech-options", type] as const,
};

// ─── BusinessLine Hooks ───────────────────────────────────────────────────────

export function useBusinessLines() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";

  return useQuery({
    queryKey: adminKeys.businessLines(),
    queryFn: () => apiFetch<BusinessLineSummary[]>("/admin/business-lines", token),
    enabled: !!token,
  });
}

export function useCreateBusinessLine() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateBusinessLinePayload) =>
      apiFetch<BusinessLineSummary>("/admin/business-lines", token, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.businessLines() }),
  });
}

export function useUpdateBusinessLine() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateBusinessLinePayload) =>
      apiFetch<BusinessLineSummary>(`/admin/business-lines/${id}`, token, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.businessLines() }),
  });
}

export function useDeleteBusinessLine() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/admin/business-lines/${id}`, token, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.businessLines() }),
  });
}

export function useToggleBusinessLine() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<BusinessLineSummary>(`/admin/business-lines/${id}/toggle`, token, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.businessLines() }),
  });
}

// ─── Product Hooks ────────────────────────────────────────────────────────────

export function useProducts(businessLineId?: string) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const url = businessLineId ? `/admin/products?businessLineId=${businessLineId}` : "/admin/products";

  return useQuery({
    queryKey: adminKeys.products(businessLineId),
    queryFn: () => apiFetch<ProductSummary[]>(url, token),
    enabled: !!token,
  });
}

export function useCreateProduct() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateProductPayload) =>
      apiFetch<ProductSummary>("/admin/products", token, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (_data, { businessLineId }) => {
      qc.invalidateQueries({ queryKey: adminKeys.products() });
      qc.invalidateQueries({ queryKey: adminKeys.products(businessLineId) });
    },
  });
}

export function useUpdateProduct() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateProductPayload) =>
      apiFetch<ProductSummary>(`/admin/products/${id}`, token, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.products() }),
  });
}

export function useDeleteProduct() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/admin/products/${id}`, token, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.products() }),
  });
}

export function useToggleProduct() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<ProductSummary>(`/admin/products/${id}/toggle`, token, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.products() }),
  });
}

// ─── TechOption Hooks ─────────────────────────────────────────────────────────

export function useTechOptions(type: TechOptionType) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";

  return useQuery({
    queryKey: adminKeys.techOptions(type),
    queryFn: () => apiFetch<TechOptionSummary[]>(`/admin/tech-options/${type}`, token),
    enabled: !!token,
  });
}

export function useCreateTechOption(type: TechOptionType) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateTechOptionPayload) =>
      apiFetch<TechOptionSummary>(`/admin/tech-options/${type}`, token, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.techOptions(type) }),
  });
}

export function useUpdateTechOption(type: TechOptionType) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateTechOptionPayload) =>
      apiFetch<TechOptionSummary>(`/admin/tech-options/${type}/${id}`, token, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.techOptions(type) }),
  });
}

export function useDeleteTechOption(type: TechOptionType) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/admin/tech-options/${type}/${id}`, token, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.techOptions(type) }),
  });
}

export function useToggleTechOption(type: TechOptionType) {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<TechOptionSummary>(`/admin/tech-options/${type}/${id}/toggle`, token, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.techOptions(type) }),
  });
}
