import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3010";

export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string;
  email: string;
}

const EXPIRY_BUFFER_MS = 5 * 60 * 1000;

async function apiFetch(path: string, options: RequestInit = {}) {
  const session = await getServerSession(authOptions);
  const token = session?.user?.accessToken;
  if (!token) throw new Error("Sem sessão para acessar token Google");
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok && res.status !== 204) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message ?? `Backend error ${res.status}`);
  }
  return res;
}

export async function getStoredToken(): Promise<(TokenData & { gmailHistoryId: string | null }) | null> {
  const res = await apiFetch("/email/token");
  const data = await res.json().catch(() => null);
  if (!data) return null;
  return { ...data, expiresAt: new Date(data.expiresAt) };
}

export async function saveToken(data: TokenData): Promise<void> {
  await apiFetch("/email/token", {
    method: "POST",
    body: JSON.stringify({ ...data, expiresAt: data.expiresAt.toISOString() }),
  });
}

export async function deleteToken(): Promise<void> {
  await apiFetch("/email/token", { method: "DELETE" });
}

export async function updateHistoryId(historyId: string): Promise<void> {
  await apiFetch("/email/token/history", {
    method: "PATCH",
    body: JSON.stringify({ historyId }),
  });
}

export function isTokenExpired(token: { expiresAt: Date }): boolean {
  return token.expiresAt.getTime() - Date.now() < EXPIRY_BUFFER_MS;
}
