
import { backendFetch } from "@/lib/backend/client";

export async function getOrganizationsList() {
  try {
    const orgs = await backendFetch<{ id: string; name: string }[]>("/organizations");
    return orgs.map((o) => ({ id: o.id, name: o.name }));
  } catch {
    return [];
  }
}
