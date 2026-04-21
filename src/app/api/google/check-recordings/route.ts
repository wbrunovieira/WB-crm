import { NextRequest, NextResponse } from "next/server";

/** Meet recording detection is handled by NestJS MeetRecordingsCronService (every 15 min). */
export async function GET(_req: NextRequest) {
  return NextResponse.json({ ok: true, message: "handled by NestJS cron" });
}
