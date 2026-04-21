"use server";

import { backendFetch } from "@/lib/backend/client";

export async function getDealsList() {
  try {
    const deals = await backendFetch<{ id: string; title: string }[]>("/deals");
    return deals.map((d) => ({ id: d.id, title: d.title }));
  } catch {
    return [];
  }
}
