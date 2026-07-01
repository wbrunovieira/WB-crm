// Server-only helper for Server Components (SSR). NÃO é "use server" (server action):
// é chamado diretamente durante o render no servidor, nunca do client. Deixá-lo como
// server action registrava uma action no manifest e alimentava erros
// "Failed to find Server Action" em abas antigas após redeploy. Como é server-only,
// um import acidental por Client Component vira erro de build (mais seguro).
import "server-only";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3010";

/** Recupera o accessToken do NestJS a partir da sessão NextAuth */
async function getBearerToken(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.accessToken ?? null;
}

export async function backendFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getBearerToken();

  if (!token) {
    throw new Error("Token não fornecido");
  }

  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    const err = new Error(body?.message ?? `Backend error ${res.status}`) as Error & { status: number; body: unknown };
    err.status = res.status;
    err.body = body;
    throw err;
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
