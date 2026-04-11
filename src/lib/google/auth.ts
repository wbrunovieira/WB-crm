import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { getStoredToken, saveToken, isTokenExpired } from "./token-store";

export const SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
];

export function createOAuth2Client(): OAuth2Client {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

/** Gera a URL de consentimento Google para o admin conectar a conta */
export function getAuthUrl(client: OAuth2Client = createOAuth2Client()): string {
  return client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });
}

/** Troca o authorization code por tokens e persiste no banco */
export async function exchangeCode(
  code: string,
  email: string,
  client: OAuth2Client = createOAuth2Client()
) {
  const { tokens } = await client.getToken(code);

  const tokenData = {
    accessToken: tokens.access_token!,
    refreshToken: tokens.refresh_token!,
    expiresAt: new Date(tokens.expiry_date!),
    scope: tokens.scope ?? SCOPES.join(" "),
    email,
  };

  await saveToken(tokenData);
  return tokenData;
}

/** Busca o email da conta via userinfo (chamado no callback após exchangeCode) */
export async function fetchGoogleEmail(
  accessToken: string,
  client: OAuth2Client = createOAuth2Client()
): Promise<string> {
  client.setCredentials({ access_token: accessToken });
  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const { data } = await oauth2.userinfo.get();
  return data.email ?? "";
}

/** Retorna token válido — renova automaticamente se estiver expirado */
export async function getValidToken(
  clientFactory: () => OAuth2Client = createOAuth2Client
) {
  const stored = await getStoredToken();

  if (!stored) {
    throw new Error("Conta Google não conectada. Acesse /admin/google para conectar.");
  }

  if (!isTokenExpired(stored)) {
    return stored;
  }

  // Token expirado → renovar com refresh_token
  const client = clientFactory();
  client.setCredentials({ refresh_token: stored.refreshToken });
  const { credentials } = await client.refreshAccessToken();

  const refreshed = {
    accessToken: credentials.access_token!,
    refreshToken: stored.refreshToken,
    expiresAt: new Date(credentials.expiry_date!),
    scope: stored.scope,
    email: stored.email,
  };

  await saveToken(refreshed);
  return refreshed;
}

/** Retorna cliente OAuth2 autenticado pronto para usar nas APIs Google */
export async function getAuthenticatedClient(): Promise<OAuth2Client> {
  const token = await getValidToken();
  const client = createOAuth2Client();
  client.setCredentials({
    access_token: token.accessToken,
    refresh_token: token.refreshToken,
  });
  return client;
}
