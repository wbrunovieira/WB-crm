import { prisma } from "@/lib/prisma";

const APPLE_MPP_PREFIX = "17.";
const GMAIL_PROXY_UA = "GoogleImageProxy";

export type TrackResult = {
  counted: boolean;
  reason?: "apple_mpp" | "gmail_proxy";
};

/**
 * Registra abertura de e-mail via pixel 1x1.
 * Filtra Apple Mail Privacy Protection (IP 17.x.x.x) e Gmail proxy.
 */
export async function trackEmailOpen(
  token: string,
  userAgent: string,
  ip: string
): Promise<TrackResult> {
  const activity = await prisma.activity.findUnique({
    where: { emailTrackingToken: token },
    select: { id: true, emailOpenedAt: true },
  });

  if (!activity) {
    throw new Error("Token não encontrado");
  }

  if (ip.startsWith(APPLE_MPP_PREFIX)) {
    return { counted: false, reason: "apple_mpp" };
  }

  if (userAgent.includes(GMAIL_PROXY_UA)) {
    return { counted: false, reason: "gmail_proxy" };
  }

  const now = new Date();
  await prisma.activity.update({
    where: { id: activity.id },
    data: {
      emailOpenCount: { increment: 1 },
      emailLastOpenedAt: now,
      ...(activity.emailOpenedAt === null ? { emailOpenedAt: now } : {}),
    },
  });

  return { counted: true };
}

/**
 * Registra clique em link rastreado no e-mail.
 * Cliques sempre contam — requerem ação humana.
 */
export async function trackEmailClick(token: string): Promise<TrackResult> {
  const activity = await prisma.activity.findUnique({
    where: { emailTrackingToken: token },
    select: { id: true, emailLinkClickedAt: true },
  });

  if (!activity) {
    throw new Error("Token não encontrado");
  }

  const now = new Date();
  await prisma.activity.update({
    where: { id: activity.id },
    data: {
      emailLinkClickCount: { increment: 1 },
      emailLastLinkClickedAt: now,
      ...(activity.emailLinkClickedAt === null ? { emailLinkClickedAt: now } : {}),
    },
  });

  return { counted: true };
}

/**
 * Gera token único de tracking para um e-mail enviado.
 */
export function generateTrackingToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

/**
 * Injeta pixel de abertura e envolve links com URLs de tracking no HTML do e-mail.
 */
export function injectTracking(html: string, token: string, baseUrl: string): string {
  const openPixelUrl = `${baseUrl}/api/track/open/${token}`;
  const pixel = `<img src="${openPixelUrl}" width="1" height="1" style="display:none;border:0;" alt="" />`;

  // Substitui todos os href="..." pelo link de tracking
  const htmlWithTrackedLinks = html.replace(
    /href="(https?:\/\/[^"]+)"/gi,
    (_match, dest) => {
      const clickUrl = `${baseUrl}/api/track/click/${token}?dest=${encodeURIComponent(dest)}`;
      return `href="${clickUrl}"`;
    }
  );

  // Injeta o pixel antes de </body> ou no final do HTML
  if (htmlWithTrackedLinks.includes("</body>")) {
    return htmlWithTrackedLinks.replace("</body>", `${pixel}</body>`);
  }

  return htmlWithTrackedLinks + pixel;
}
