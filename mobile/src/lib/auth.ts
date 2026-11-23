import * as SecureStore from "expo-secure-store";
import { empresaAtiva } from "./active-company";

const TOKEN_KEY = "crm_jwt";

// In-memory cache so we don't hit the Keychain on every request. `resolved` lets us
// cache a null result too (token-less state) instead of re-reading the Keychain each call.
let cachedToken: string | null = null;
let resolved = false;

/**
 * Returns the CRM JWT. The build-time embedded token is the source of truth: on first
 * launch it seeds the device Keychain (expo-secure-store), and whenever it CHANGES
 * (e.g. you rotate the token in .env and rebuild) it overwrites the stored one — so
 * rotation is not a silent no-op. This app has no login screen; it acts as a single
 * known user (see docs/plans/mobile-prospecting-app.md).
 */
export async function getToken(): Promise<string | null> {
  // Cada empresa traz seu próprio JWT embutido no build (ver mobile/.env e app.config.ts).
  // Trocar de empresa troca o token junto — por isso não há mais cache nem cópia no
  // Keychain: a fonte de verdade é a empresa ativa, e ela muda em runtime.
  const t = empresaAtiva().token;
  return t.length > 0 ? t : null;
}

/** True when a token is available (embedded or already stored). */
export async function hasToken(): Promise<boolean> {
  return (await getToken()) !== null;
}

/** Clears the stored token (e.g. to rotate it). */
export async function clearToken(): Promise<void> {
  cachedToken = null;
  resolved = false;
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
