export type TrackResult = {
  counted: boolean;
  reason?: "apple_mpp" | "gmail_proxy";
};

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3010";

export async function trackEmailOpen(
  token: string,
  userAgent: string,
  ip: string
): Promise<TrackResult> {
  const res = await fetch(`${BACKEND_URL}/track/open/${token}`, {
    method: "GET",
    headers: {
      "user-agent": userAgent,
      "x-forwarded-for": ip,
    },
  });
  if (!res.ok && res.status === 404) throw new Error("Token não encontrado");
  return { counted: true };
}

export async function trackEmailClick(token: string): Promise<TrackResult> {
  await fetch(`${BACKEND_URL}/track/click/${token}?url=about:blank`, { method: "GET" });
  return { counted: true };
}

export function generateTrackingToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

export function injectTracking(html: string, token: string, baseUrl: string): string {
  const openPixelUrl = `${baseUrl}/api/track/open/${token}`;
  const pixel = `<img src="${openPixelUrl}" width="1" height="1" style="display:none;border:0;" alt="" />`;

  const htmlWithTrackedLinks = html.replace(
    /href="(https?:\/\/[^"]+)"/gi,
    (_match, dest) => {
      const clickUrl = `${baseUrl}/api/track/click/${token}?dest=${encodeURIComponent(dest)}`;
      return `href="${clickUrl}"`;
    }
  );

  if (htmlWithTrackedLinks.includes("</body>")) {
    return htmlWithTrackedLinks.replace("</body>", `${pixel}</body>`);
  }

  return htmlWithTrackedLinks + pixel;
}
