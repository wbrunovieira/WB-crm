import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findMeetingFiles } from "@/lib/google/recording-detector";
import { getMeetEvent, extractAttendees } from "@/lib/google/calendar";
import { getAuthenticatedClient } from "@/lib/google/auth";
import { google } from "googleapis";
import { submitVideoForTranscription } from "@/lib/transcriptor";

/**
 * GET /api/google/check-recordings
 *
 * Cron endpoint — runs every 15 minutes.
 *
 * Pass 1 — scheduled → ended:
 *   Finds meetings whose time has passed (endAt < now OR startAt > 30min ago),
 *   marks as ended, completes the linked Activity, then searches for recording.
 *
 * Pass 2 — ended, no recording yet:
 *   Retries recording search for meetings already marked ended but with no file yet.
 *   This handles the case where Google takes >15min to process the recording.
 *
 * Recording strategy (no file move required):
 *   We save the original Drive URL (no scope to move files created by Meet).
 *   We download the video content for transcription only.
 *
 * Secured by CRON_SECRET header.
 */
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const earlyEndCutoff = new Date(now.getTime() - 30 * 60 * 1000);

  // ── Pass 1: scheduled → ended ────────────────────────────────────────────
  const scheduledEnded = await prisma.meeting.findMany({
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

  // ── Pass 2: ended but recording not yet found ────────────────────────────
  const waitingForRecording = await prisma.meeting.findMany({
    where: {
      status: "ended",
      recordingDriveId: null,
      googleEventId: { not: null },
      // Only retry for meetings that ended in the last 4 hours
      actualEndAt: { gt: new Date(now.getTime() - 4 * 60 * 60 * 1000) },
    },
    include: {
      lead: { select: { id: true, businessName: true } },
      deal: { select: { id: true, title: true } },
      activity: { select: { id: true, completed: true } },
    },
  });

  const results: { meetingId: string; action: string; error?: string }[] = [];

  // ── Process Pass 1 first ─────────────────────────────────────────────────
  for (const meeting of scheduledEnded) {
    try {
      // 1. Fetch final attendee RSVP statuses
      let updatedAttendees: string | undefined;
      try {
        const event = await getMeetEvent(meeting.googleEventId!);
        updatedAttendees = JSON.stringify(extractAttendees(event));
      } catch {
        // Non-fatal — keep existing attendeeEmails
      }

      // 2. Mark as ended, set actual times
      await prisma.meeting.update({
        where: { id: meeting.id },
        data: {
          status: "ended",
          actualEndAt: now,
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

      // 4. Search Drive for recording + Gemini transcript
      const recordingResult = await processRecording(meeting, now, results);
      if (!recordingResult) {
        // Not found yet — Pass 2 will retry on next cron run
        results.push({ meetingId: meeting.id, action: "ended_recording_pending" });
      }
    } catch (err) {
      console.error(`Error processing meeting ${meeting.id}:`, err);
      results.push({ meetingId: meeting.id, action: "error", error: String(err) });
    }
  }

  // ── Process Pass 2: retry recording for already-ended meetings ───────────
  for (const meeting of waitingForRecording) {
    try {
      const found = await processRecording(meeting, now, results);
      if (!found) {
        results.push({ meetingId: meeting.id, action: "recording_still_pending" });
      }
    } catch (err) {
      console.error(`Error retrying recording for ${meeting.id}:`, err);
      results.push({ meetingId: meeting.id, action: "error", error: String(err) });
    }
  }

  return NextResponse.json({
    processedNew: scheduledEnded.length,
    retriedRecording: waitingForRecording.length,
    results,
    checkedAt: now.toISOString(),
  });
}

// ── Shared recording/transcript logic ────────────────────────────────────────

async function processRecording(
  meeting: {
    id: string;
    title: string;
    googleEventId: string | null;
    nativeTranscriptUrl?: string | null;
    lead?: { id: string; businessName: string } | null;
    deal?: { id: string; title: string } | null;
    activity?: { id: string; completed: boolean } | null;
    activityId?: string | null;
    actualStartAt?: Date | null;
    startAt: Date;
  },
  now: Date,
  results: { meetingId: string; action: string; error?: string }[]
): Promise<boolean> {
  const { recording, nativeTranscript } = await findMeetingFiles(meeting.title);

  // Save Gemini transcript URL if found and not already saved
  if (nativeTranscript && !meeting.nativeTranscriptUrl) {
    await prisma.meeting.update({
      where: { id: meeting.id },
      data: { nativeTranscriptUrl: nativeTranscript.webViewLink },
    });
  }

  if (!recording) return false;

  // Download recording for transcription (read via drive.readonly scope)
  const auth = await getAuthenticatedClient();
  const drive = google.drive({ version: "v3", auth });

  const fileRes = await drive.files.get(
    { fileId: recording.fileId, alt: "media" },
    { responseType: "arraybuffer" }
  );
  const buffer = Buffer.from(fileRes.data as ArrayBuffer);

  // Submit to our transcriptor
  const { jobId: transcriptionJobId } = await submitVideoForTranscription(
    buffer,
    `reuniao-${meeting.id}.mp4`
  );

  // Save recording URL directly (no move — avoids needing drive scope)
  await prisma.meeting.update({
    where: { id: meeting.id },
    data: {
      recordingDriveId: recording.fileId,
      recordingUrl: recording.webViewLink,
      recordingMovedAt: now,
      transcriptionJobId,
      ...(nativeTranscript ? { nativeTranscriptUrl: nativeTranscript.webViewLink } : {}),
    },
  });

  results.push({
    meetingId: meeting.id,
    action: "recording_saved_transcription_queued",
  });
  return true;
}
