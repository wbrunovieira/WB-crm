"use server";

import { backendFetch } from "@/lib/backend/client";

export async function getContactsList() {
  try {
    const contacts = await backendFetch<{
      id: string;
      name: string;
      organizationId: string | null;
      leadId: string | null;
      organization: { id: string; name: string } | null;
      lead: { id: string; businessName: string } | null;
      partner: { id: string; name: string } | null;
    }[]>("/contacts");
    return contacts;
  } catch {
    return [];
  }
}
