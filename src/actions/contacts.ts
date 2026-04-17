"use server";

import { revalidatePath } from "next/cache";
import { contactSchema, type ContactFormData } from "@/lib/validations/contact";
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

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createContact(data: ContactFormData) {
  const v = contactSchema.parse(data);
  const contact = await backendFetch<{ id: string }>("/contacts", {
    method: "POST",
    body: JSON.stringify({
      name: v.name,
      email: v.email || undefined,
      phone: v.phone || undefined,
      whatsapp: v.whatsapp || undefined,
      role: v.role || undefined,
      department: v.department || undefined,
      leadId: v.companyType === "lead" ? v.companyId : undefined,
      organizationId: v.companyType === "organization" ? v.companyId : undefined,
      partnerId: v.companyType === "partner" ? v.companyId : undefined,
      linkedin: v.linkedin || undefined,
      status: v.status || "active",
      isPrimary: v.isPrimary || false,
      birthDate: v.birthDate || undefined,
      notes: v.notes || undefined,
      preferredLanguage: v.preferredLanguage || "pt-BR",
      languages: v.languages ?? [],
      source: v.source || undefined,
    }),
  });
  revalidatePath("/contacts");
  return contact;
}

export async function updateContact(id: string, data: ContactFormData) {
  const v = contactSchema.parse(data);
  const contact = await backendFetch<{ id: string }>(`/contacts/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      name: v.name,
      email: v.email || undefined,
      phone: v.phone || undefined,
      whatsapp: v.whatsapp || undefined,
      role: v.role || undefined,
      department: v.department || undefined,
      leadId: v.companyType === "lead" ? v.companyId : undefined,
      organizationId: v.companyType === "organization" ? v.companyId : undefined,
      partnerId: v.companyType === "partner" ? v.companyId : undefined,
      linkedin: v.linkedin || undefined,
      status: v.status,
      isPrimary: v.isPrimary,
      birthDate: v.birthDate || undefined,
      notes: v.notes || undefined,
      preferredLanguage: v.preferredLanguage,
      languages: v.languages ?? [],
      source: v.source || undefined,
    }),
  });
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
  return contact;
}

export async function deleteContact(id: string) {
  await backendFetch<void>(`/contacts/${id}`, { method: "DELETE" });
  revalidatePath("/contacts");
}

export async function toggleContactStatus(id: string) {
  const updated = await backendFetch<{ id: string; status: string; organizationId?: string; leadId?: string; partnerId?: string }>(
    `/contacts/${id}/status`,
    { method: "PATCH" },
  );
  revalidatePath("/contacts");
  if (updated.organizationId) revalidatePath(`/organizations/${updated.organizationId}`);
  if (updated.leadId) revalidatePath(`/leads/${updated.leadId}`);
  if (updated.partnerId) revalidatePath(`/partners/${updated.partnerId}`);
  return updated;
}
