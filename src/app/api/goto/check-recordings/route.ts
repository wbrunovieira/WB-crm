import { NextRequest, NextResponse } from "next/server";

/** GoTo recording detection is handled by NestJS GotoRecordingsCronService (every 15 min). */
export async function GET(_req: NextRequest) {
  return NextResponse.json({ ok: true, message: "handled by NestJS cron" });
}
