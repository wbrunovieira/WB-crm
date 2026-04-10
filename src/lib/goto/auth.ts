import type { GoToStoredTokens, GoToTokenResponse } from "./types";

const GOTO_AUTH_URL =
  "https://authentication.logmeininc.com/oauth/authorize";
const GOTO_TOKEN_URL =
  "https://authentication.logmeininc.com/oauth/token";

const REQUIRED_SCOPES = [
  "call-events.v1.notifications.manage",
  "call-events.v1.events.read",
  "cr.v1.read",
].join(" ");

// Buffer de 5 minutos antes da expiração real
const EXPIRY_BUFFER_MS = 5 * 60 * 1000;

export function buildAuthorizationUrl(): string {
  const clientId = process.env.GOTO_CLIENT_ID!;
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/goto/callback`;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: REQUIRED_SCOPES,
  });

  return `${GOTO_AUTH_URL}?${params.toString()}`;
}

function basicAuthHeader(): string {
  const clientId = process.env.GOTO_CLIENT_ID!;
  const clientSecret = process.env.GOTO_CLIENT_SECRET!;
  return `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
}

function parseTokenResponse(data: GoToTokenResponse): GoToStoredTokens {
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    accountKey: data.account_key,
  };
}

export async function exchangeCodeForTokens(
  code: string
): Promise<GoToStoredTokens> {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/goto/callback`;

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  const res = await fetch(GOTO_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuthHeader(),
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(
      `GoTo token exchange failed: ${res.status} ${JSON.stringify(error)}`
    );
  }

  const data: GoToTokenResponse = await res.json();
  return parseTokenResponse(data);
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<GoToStoredTokens> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const res = await fetch(GOTO_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuthHeader(),
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(
      `GoTo token refresh failed: ${res.status} ${JSON.stringify(error)}`
    );
  }

  const data: GoToTokenResponse = await res.json();
  return parseTokenResponse(data);
}

export function isTokenExpired(expiresAt: number): boolean {
  return Date.now() >= expiresAt - EXPIRY_BUFFER_MS;
}
