"use server";

import { backendFetch } from "@/lib/backend/client";

// Tipos re-exportados para compatibilidade com imports existentes
export type { ContactSummary, ContactDetail } from "@/types/contact";

// ─── Server-side read (para server components que precisam de lista de contatos) ──

export async function getContacts(filters?: {
  search?: string;
  status?: string;
  company?: string;
  owner?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.search) params.set("search", filters.search);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.company) params.set("company", filters.company);
  if (filters?.owner) params.set("owner", filters.owner);
  const query = params.toString();
  return backendFetch<import("@/types/contact").ContactSummary[]>(`/contacts${query ? `?${query}` : ""}`);
}
