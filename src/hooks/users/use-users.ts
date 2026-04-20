"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";

// ─── Types ───────────────────────────────────────────────────────────────────

export type UserListItem = {
  id: string;
  name: string;
  email: string;
  role: string;
};

// ─── Query keys ──────────────────────────────────────────────────────────────

export const userKeys = {
  all: ["users"] as const,
};

// ─── Queries ─────────────────────────────────────────────────────────────────

export function useUsers() {
  const { data: session } = useSession();
  const token = session?.user?.accessToken ?? "";

  return useQuery({
    queryKey: userKeys.all,
    queryFn: () => apiFetch<UserListItem[]>("/users", token),
    enabled: !!token,
  });
}
