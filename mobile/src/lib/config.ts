import Constants from "expo-constants";

/**
 * Runtime config, injected via app.config.ts `extra` (from a gitignored .env / EAS secrets).
 * The JWT is embedded here only for build/first-run bootstrap; at runtime the token is read
 * from secure storage (see auth.ts), never from source.
 */
const extra = (Constants.expoConfig?.extra ?? {}) as {
  crmJwt?: string;
  apiUrl?: string;
};

export const API_URL = extra.apiUrl || "https://crm-api.wbdigitalsolutions.com";

/** The build-time embedded token. Empty when .env was not configured. */
export const EMBEDDED_JWT = extra.crmJwt || "";
