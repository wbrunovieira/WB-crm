import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3010";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = req.headers.get("x-webhook-secret") ?? "";
  let body: string;
  try { body = await req.text(); } catch { return NextResponse.json({ ok: true }); }

  try {
    const res = await fetch(`${BACKEND_URL}/webhooks/whatsapp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": secret,
      },
      body,
    });
    const data = await res.json().catch(() => ({ ok: true }));
    return NextResponse.json(data, { status: res.ok ? 200 : res.status });
  } catch {
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
