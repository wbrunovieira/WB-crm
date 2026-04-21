import { NextRequest, NextResponse } from "next/server";

/** Meet transcription polling is handled by NestJS MeetTranscriptionsCronService (every 5 min). */
export async function GET(_req: NextRequest) {
  return NextResponse.json({ ok: true, message: "handled by NestJS cron" });
}
