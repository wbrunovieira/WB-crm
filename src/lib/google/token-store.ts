import { prisma } from "@/lib/prisma";

export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string;
  email: string;
}

/** Margem de segurança: renovar 5 min antes de expirar */
const EXPIRY_BUFFER_MS = 5 * 60 * 1000;

// Usamos um ID fixo pois só existe um token da empresa no banco
const SINGLETON_ID = "google-token-singleton";

export async function getStoredToken() {
  return prisma.googleToken.findFirst();
}

export async function saveToken(data: TokenData) {
  return prisma.googleToken.upsert({
    where: { id: SINGLETON_ID },
    create: {
      id: SINGLETON_ID,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: data.expiresAt,
      scope: data.scope,
      email: data.email,
    },
    update: {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: data.expiresAt,
      scope: data.scope,
      email: data.email,
    },
  });
}

export async function deleteToken() {
  return prisma.googleToken.deleteMany();
}

/** Atualiza o gmailHistoryId após cada ciclo de polling */
export async function updateHistoryId(historyId: string) {
  return prisma.googleToken.updateMany({
    data: { gmailHistoryId: historyId },
  });
}

export function isTokenExpired(token: { expiresAt: Date }): boolean {
  return token.expiresAt.getTime() - Date.now() < EXPIRY_BUFFER_MS;
}
