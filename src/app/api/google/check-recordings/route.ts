import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findMeetingFiles, moveRecordingToFolder } from "@/lib/google/recording-detector";
import { getMeetEvent, extractAttendees } from "@/lib/google/calendar";
import { getAuthenticatedClient } from "@/lib/google/auth";
import { google } from "googleapis";
import { submitVideoForTranscription } from "@/lib/transcriptor";

/**
 * GET /api/google/check-recordings
 *
 * Cron endpoint — runs every 15 minutes (configured in n8n or system cron).
 * 1. Finds meetings that have ended (endAt < now, status=scheduled).
 * 2. Marks meeting as ended and completes the linked Activity.
 * 3. Searches Drive for the recording file.
 * 4. Moves recording to WB-CRM/Reuniões/[Entity name]/.
 * 5. Downloads the recording and submits to the transcriptor API.
 * 6. Saves transcriptionJobId to Meeting for polling by check-transcriptions.
 *
 * Secured by CRON_SECRET header.
 */
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Also catch meetings that started >30min ago but endAt is null or in the future
  // (handles early terminations where the user ends the call before scheduled end)
  const earlyEndCutoff = new Date(now.getTime() - 30 * 60 * 1000);

  const endedMeetings = await prisma.meeting.findMany({
    where: {
      status: "scheduled",
      OR: [
        { endAt: { lt: now } },
        { endAt: null, startAt: { lt: earlyEndCutoff } },
        { endAt: { gt: now }, startAt: { lt: earlyEndCutoff } },
      ],
    },
    include: {
      lead: { select: { id: true, businessName: true } },
      deal: { select: { id: true, title: true } },
      activity: { select: { id: true, completed: true } },
    },
  });

  const results: { meetingId: string; action: string; error?: string }[] = [];

  for (const meeting of endedMeetings) {
    try {
      // 1. Fetch final attendee RSVP statuses from Google Calendar
      let updatedAttendees: string | undefined;
      try {
        const event = await getMeetEvent(meeting.googleEventId!);
        updatedAttendees = JSON.stringify(extractAttendees(event));
      } catch {
        // Non-fatal — keep existing attendeeEmails
      }

      // 2. Mark meeting as ended, set actualEndAt, refresh attendee statuses
      await prisma.meeting.update({
        where: { id: meeting.id },
        data: {
          status: "ended",
          actualEndAt: now,
          // Set actualStartAt = scheduled startAt if not already set
          ...(meeting.actualStartAt ? {} : { actualStartAt: meeting.startAt }),
          ...(updatedAttendees ? { attendeeEmails: updatedAttendees } : {}),
        },
      });

      // 3. Complete linked Activity
      if (meeting.activityId && meeting.activity && !meeting.activity.completed) {
        await prisma.activity.update({
          where: { id: meeting.activityId },
          data: { completed: true, completedAt: now },
        });
      }

      if (!meeting.googleEventId) {
        results.push({ meetingId: meeting.id, action: "ended_no_event_id" });
        continue;
      }

      // 5. Search for recording + native transcript in Drive (by meeting title)
      const { recording, nativeTranscript } = await findMeetingFiles(
        meeting.title,
        new Date(meeting.startAt.getTime() - 5 * 60 * 1000) // 5 min before scheduled start
      );

      // Save native transcript URL if Google Meet generated one
      if (nativeTranscript) {
        await prisma.meeting.update({
          where: { id: meeting.id },
          data: { nativeTranscriptUrl: nativeTranscript.webViewLink },
        });
      }

      if (!recording) {
        // Recording not ready yet — retry next cycle
        results.push({
          meetingId: meeting.id,
          action: nativeTranscript ? "ended_native_transcript_found_no_recording_yet" : "ended_no_recording_yet",
        });
        continue;
      }

      // 6. Move recording to WB-CRM/Reuniões/[entity]/
      const entityName =
        meeting.lead?.businessName ??
        meeting.deal?.title ??
        "Geral";

      const { fileId, webViewLink } = await moveRecordingToFolder(
        recording.fileId,
        entityName
      );

      // 5. Download recording from Drive as Buffer
      const auth = await getAuthenticatedClient();
      const drive = google.drive({ version: "v3", auth });

      const fileRes = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "arraybuffer" }
      );
      const buffer = Buffer.from(fileRes.data as ArrayBuffer);

      // 6. Submit to transcriptor API
      const { jobId: transcriptionJobId } = await submitVideoForTranscription(
        buffer,
        `reuniao-${meeting.id}.mp4`
      );

      // 7. Persist recording + transcription job
      await prisma.meeting.update({
        where: { id: meeting.id },
        data: {
          recordingDriveId: fileId,
          recordingUrl: webViewLink,
          recordingMovedAt: now,
          transcriptionJobId,
        },
      });

      results.push({ meetingId: meeting.id, action: "recording_saved_transcription_queued" });
    } catch (err) {
      console.error(`Error processing meeting ${meeting.id}:`, err);
      results.push({
        meetingId: meeting.id,
        action: "error",
        error: String(err),
      });
    }
  }

  return NextResponse.json({
    processed: endedMeetings.length,
    results,
    checkedAt: now.toISOString(),
  });
}
