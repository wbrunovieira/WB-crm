import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3010";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) headers["x-forwarded-for"] = forwarded;

  const apiKey = req.headers.get("x-internal-api-key");
  if (apiKey) headers["x-internal-api-key"] = apiKey;

  const secret = req.headers.get("x-webhook-secret");
  if (secret) headers["x-webhook-secret"] = secret;

  // Inject internal secret so NestJS accepts the request
  if (!headers["x-webhook-secret"] && process.env.WEBHOOK_SECRET) {
    headers["x-webhook-secret"] = process.env.WEBHOOK_SECRET;
  }

  const res = await fetch(`${BACKEND_URL}/webhooks/lead-deep-research`, {
    method: "POST",
    headers,
    body,
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
