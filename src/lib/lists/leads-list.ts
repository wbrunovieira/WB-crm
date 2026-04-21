import { backendFetch } from "@/lib/backend/client";

interface LeadSelectItem {
  id: string;
  businessName: string;
  leadContacts: Array<{ id: string; name: string; email: string | null; role: string | null; isPrimary: boolean }>;
}

export async function getLeadsList(): Promise<LeadSelectItem[]> {
  return backendFetch<LeadSelectItem[]>("/leads/for-select").catch(() => []);
}
