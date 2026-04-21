import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3010";

function validateSecret(req: NextRequest): boolean {
  const expectedSecret = process.env.GOTO_WEBHOOK_SECRET;
  if (!expectedSecret) return false;
  return req.nextUrl.searchParams.get("secret") === expectedSecret;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!validateSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const secret = req.nextUrl.searchParams.get("secret") ?? "";

  try {
    const res = await fetch(`${BACKEND_URL}/webhooks/goto/sync?secret=${encodeURIComponent(secret)}`, {
      method: "POST",
    });
    const data = await res.json().catch(() => ({ ok: false }));
    return NextResponse.json(data, { status: res.ok ? 200 : res.status });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}
