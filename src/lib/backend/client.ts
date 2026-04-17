"use server";

import { getToken } from "next-auth/jwt";
import { cookies, headers } from "next/headers";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3010";

/** Recupera o JWT do NextAuth para usar como Bearer no NestJS backend */
async function getBearerToken(): Promise<string | null> {
  // In App Router server actions we read the cookie manually
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const token = await getToken({
    req: { headers: { cookie: cookieHeader } } as any,
    secret: process.env.NEXTAUTH_SECRET!,
  });

  if (!token) return null;
  // getToken returns the decoded payload — we need the raw JWT.
  // Use the session cookie name to get the raw token.
  const rawToken =
    cookieStore.get("__Secure-next-auth.session-token")?.value ??
    cookieStore.get("next-auth.session-token")?.value ??
    null;
  return rawToken;
}

export async function backendFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getBearerToken();
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(body?.message ?? `Backend error ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
