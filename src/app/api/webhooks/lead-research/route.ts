import { NextResponse } from "next/server";
import { isInternalRequest } from "@/lib/internal-auth";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3010";

export async function POST(request: Request) {
  if (!isInternalRequest(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ ok: true }); }

  try {
    const res = await fetch(`${BACKEND_URL}/webhooks/lead-research`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({ ok: true }));
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ ok: true });
  }
}
