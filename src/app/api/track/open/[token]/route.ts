import { NextRequest, NextResponse } from "next/server";
import { trackEmailOpen } from "@/lib/email-tracking";

// GIF transparente 1x1 pixel (base64)
const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

function gifResponse(): NextResponse {
  return new NextResponse(TRANSPARENT_GIF, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
    },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.ip ??
    "";
  const userAgent = req.headers.get("user-agent") ?? "";

  try {
    await trackEmailOpen(params.token, userAgent, ip);
  } catch {
    // Silently ignore — sempre retorna o pixel para não vazar 404
  }

  return gifResponse();
}
