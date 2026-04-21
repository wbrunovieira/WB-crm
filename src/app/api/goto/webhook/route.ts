import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3010";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = req.nextUrl.searchParams.get("secret") ?? "";
  let body: string | null = null;
  try { body = await req.text(); } catch { /* empty body is valid (ping) */ }

  try {
    const res = await fetch(`${BACKEND_URL}/webhooks/goto/calls?secret=${encodeURIComponent(secret)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": req.headers.get("user-agent") ?? "",
      },
      body: body || "{}",
    });
    const data = await res.json().catch(() => ({ ok: true }));
    return NextResponse.json(data, { status: res.ok ? 200 : res.status });
  } catch {
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
