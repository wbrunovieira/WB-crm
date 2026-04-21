import { NextRequest, NextResponse } from "next/server";

/** Meet RSVP refresh is handled by NestJS MeetRsvpCronService (every 5 min). */
export async function GET(_req: NextRequest) {
  return NextResponse.json({ ok: true, message: "handled by NestJS cron" });
}
