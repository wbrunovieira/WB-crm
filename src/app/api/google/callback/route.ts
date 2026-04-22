import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3010";

/** Forward the Google OAuth callback to the NestJS backend which handles the token exchange */
export async function GET(req: NextRequest) {
  const params = new URLSearchParams();
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");
  if (code) params.set("code", code);
  if (error) params.set("error", error);
  return NextResponse.redirect(`${BACKEND_URL}/google/callback?${params.toString()}`);
}
