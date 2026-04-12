import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMeetEvent, extractAttendees } from "@/lib/google/calendar";

/**
 * GET /api/google/check-rsvp
 *
 * Cron endpoint — runs every 5 minutes.
 * Refreshes RSVP statuses for all scheduled meetings that have a googleEventId.
 * Updates attendeeEmails in the DB when any status changed.
 *
 * Secured by CRON_SECRET header.
 */
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const meetings = await prisma.meeting.findMany({
    where: {
      status: "scheduled",
      googleEventId: { not: null },
    },
    select: { id: true, googleEventId: true, attendeeEmails: true },
  });

  let updated = 0;
  const errors: string[] = [];

  for (const meeting of meetings) {
    try {
      const event = await getMeetEvent(meeting.googleEventId!);
      const freshAttendees = extractAttendees(event);

      // Only update if something changed
      const current = JSON.stringify(JSON.parse(meeting.attendeeEmails as string));
      const fresh = JSON.stringify(freshAttendees);

      if (current !== fresh) {
        await prisma.meeting.update({
          where: { id: meeting.id },
          data: { attendeeEmails: fresh },
        });
        updated++;
      }
    } catch (err) {
      errors.push(`${meeting.id}: ${(err as Error).message}`);
    }
  }

  return NextResponse.json({
    checked: meetings.length,
    updated,
    errors: errors.length > 0 ? errors : undefined,
  });
}
