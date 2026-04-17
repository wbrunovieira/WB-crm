"use server";

import { revalidatePath } from "next/cache";
import { contactSchema, ContactFormData } from "@/lib/validations/contact";
import { backendFetch } from "@/lib/backend/client";

// ─── Read models matching the backend response ────────────────────────────────

export interface ContactSummary {
  id: string;
  ownerId: string;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  role: string | null;
  department: string | null;
  isPrimary: boolean;
  status: string;
  organization: { id: string; name: string } | null;
  lead: { id: string; businessName: string } | null;
  partner: { id: string; name: string } | null;
  owner: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContactDetail extends ContactSummary {
  whatsappVerified: boolean;
  whatsappVerifiedAt: string | null;
  whatsappVerifiedNumber: string | null;
  linkedin: string | null;
  instagram: string | null;
  birthDate: string | null;
  notes: string | null;
  preferredLanguage: string | null;
  /** Serialized as JSON string from the backend (stored as JSON in DB) */
  languages: string | null;
  source: string | null;
  leadId: string | null;
  organizationId: string | null;
  partnerId: string | null;
  sourceLeadContactId: string | null;
  deals: Array<{ id: string; title: string; stage: { name: string } }>;
  activities: Array<{
    id: string;
    type: string;
    /** Backend field: title maps to subject in ActivityTimeline */
    title: string | null;
    subject: string;
    description: string | null;
    dueDate: string | null;
    completedAt: string | null;
    completed: boolean;
    createdAt: string;
    outcome: string | null;
    contactId: string | null;
    leadId: string | null;
    dealId: string | null;
    partnerId: string | null;
    whatsappMessages: Array<{
      id: string;
      fromMe: boolean;
      pushName: string | null;
      timestamp: string;
      messageType: string;
      mediaDriveId: string | null;
      mediaMimeType: string | null;
      mediaLabel: string | null;
      mediaTranscriptText: string | null;
    }>;
  }>;
  owner: { id: string; name: string; email: string } | null;
}

// ─── Reads (via NestJS backend) ───────────────────────────────────────────────

export async function getContacts(filters?: {
  search?: string;
  status?: string;
  company?: string;
  owner?: string;
}): Promise<ContactSummary[]> {
  const params = new URLSearchParams();
  if (filters?.search) params.set("search", filters.search);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.company) params.set("company", filters.company);
  if (filters?.owner) params.set("owner", filters.owner);

  const query = params.toString();
  return backendFetch<ContactSummary[]>(`/contacts${query ? `?${query}` : ""}`);
}

export async function getContactById(id: string): Promise<ContactDetail | null> {
  try {
    return await backendFetch<ContactDetail>(`/contacts/${id}`);
  } catch (err: any) {
    if (err?.message?.includes("404") || err?.message?.includes("não encontrado")) {
      return null;
    }
    throw err;
  }
}

// ─── Mutations (via NestJS backend) ──────────────────────────────────────────

export async function createContact(data: ContactFormData) {
  const validated = contactSchema.parse(data);

  // Map companyType to the appropriate relation field
  const leadId = validated.companyType === "lead" ? validated.companyId : undefined;
  const organizationId = validated.companyType === "organization" ? validated.companyId : undefined;
  const partnerId = validated.companyType === "partner" ? validated.companyId : undefined;

  const contact = await backendFetch<{ id: string }>("/contacts", {
    method: "POST",
    body: JSON.stringify({
      name: validated.name,
      email: validated.email || undefined,
      phone: validated.phone || undefined,
      whatsapp: validated.whatsapp || undefined,
      role: validated.role || undefined,
      department: validated.department || undefined,
      leadId: leadId || undefined,
      organizationId: organizationId || undefined,
      partnerId: partnerId || undefined,
      linkedin: validated.linkedin || undefined,
      status: validated.status || "active",
      isPrimary: validated.isPrimary || false,
      birthDate: validated.birthDate || undefined,
      notes: validated.notes || undefined,
      preferredLanguage: validated.preferredLanguage || "pt-BR",
      languages: validated.languages ?? [],
      source: validated.source || undefined,
    }),
  });

  revalidatePath("/contacts");
  return contact;
}

export async function updateContact(id: string, data: ContactFormData) {
  const validated = contactSchema.parse(data);

  const leadId = validated.companyType === "lead" ? validated.companyId : undefined;
  const organizationId = validated.companyType === "organization" ? validated.companyId : undefined;
  const partnerId = validated.companyType === "partner" ? validated.companyId : undefined;

  const contact = await backendFetch<{ id: string }>(`/contacts/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      name: validated.name,
      email: validated.email || undefined,
      phone: validated.phone || undefined,
      whatsapp: validated.whatsapp || undefined,
      role: validated.role || undefined,
      department: validated.department || undefined,
      leadId: leadId || undefined,
      organizationId: organizationId || undefined,
      partnerId: partnerId || undefined,
      linkedin: validated.linkedin || undefined,
      status: validated.status,
      isPrimary: validated.isPrimary,
      birthDate: validated.birthDate || undefined,
      notes: validated.notes || undefined,
      preferredLanguage: validated.preferredLanguage,
      languages: validated.languages ?? [],
      source: validated.source || undefined,
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
