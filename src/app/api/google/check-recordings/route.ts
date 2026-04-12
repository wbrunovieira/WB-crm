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
 *   Finds meetings whose time has passed, marks as ended, completes the linked
 *   Activity, then searches for recording + transcript.
 *
 * Pass 2 — ended, no recording/transcript yet:
 *   Retries for meetings already marked ended but still missing files.
 *   This handles the case where Google takes >15min to process recordings.
 *
 * Transcript strategy (priority order):
 *   1. Google Meet native transcript (Google Doc) — has speaker diarization.
 *      Export as text, split into meetingSummary (Gemini AI notes) + transcriptText (raw).
 *   2. Fallback: custom video transcription (if user forgot to enable transcript).
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

  // ── Pass 2: ended but recording/transcript not yet found ─────────────────
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

  // ── Process Pass 1 ───────────────────────────────────────────────────────
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

      // 4. Search Drive for recording + transcript
      const found = await processRecording(meeting, meeting.startAt, now, results);
      if (!found) {
        results.push({ meetingId: meeting.id, action: "ended_recording_pending" });
      }
    } catch (err) {
      console.error(`Error processing meeting ${meeting.id}:`, err);
      results.push({ meetingId: meeting.id, action: "error", error: String(err) });
    }
  }

  // ── Process Pass 2: retry for already-ended meetings ─────────────────────
  for (const meeting of waitingForRecording) {
    try {
      const found = await processRecording(meeting, meeting.startAt, now, results);
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

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Exports a Google Doc as plain text via Drive API.
 * Google Meet transcripts include speaker names: "Bruno Vieira: Olá..."
 */
async function exportGoogleDocText(fileId: string): Promise<string> {
  const auth = await getAuthenticatedClient();
  const drive = google.drive({ version: "v3", auth });
  const res = await drive.files.export(
    { fileId, mimeType: "text/plain" },
    { responseType: "arraybuffer" }
  );
  return Buffer.from(res.data as ArrayBuffer).toString("utf-8").trim();
}

/**
 * Splits the exported Google Meet doc into two parts:
 * - meetingSummary: the "📝 Observações" section (Gemini AI notes, topics, action items)
 * - transcriptText: the "📖 Transcrição" section (raw transcript with speaker names)
 *
 * Returns whichever sections are present.
 */
function parseGoogleMeetDoc(text: string): {
  meetingSummary: string | null;
  transcriptText: string | null;
} {
  // The doc always has "📖" before the raw transcript section
  const transcriptMarker = "📖";
  const idx = text.indexOf(transcriptMarker);

  if (idx === -1) {
    // No transcript section — entire content goes to summary
    return { meetingSummary: text || null, transcriptText: null };
  }

  const summaryRaw = text.slice(0, idx).trim();
  const transcriptRaw = text.slice(idx).trim();

  return {
    meetingSummary: summaryRaw || null,
    transcriptText: transcriptRaw || null,
  };
}

// ── Main recording/transcript logic ──────────────────────────────────────────

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
  scheduledStartAt: Date,
  now: Date,
  results: { meetingId: string; action: string; error?: string }[]
): Promise<boolean> {
  const { recording, nativeTranscript } = await findMeetingFiles(
    meeting.title,
    scheduledStartAt
  );

  // ── Strategy 1: Google Meet native transcript (preferred) ─────────────────
  // The native transcript is a Google Doc with:
  //   • "📝 Observações" — Gemini AI notes, summary, topics, action items → meetingSummary
  //   • "📖 Transcrição" — raw transcript with speaker names → transcriptText
  // This is richer than our custom video transcription and requires no video download.

  if (nativeTranscript) {
    let meetingSummary: string | null = null;
    let transcriptText: string | null = null;

    try {
      const rawText = await exportGoogleDocText(nativeTranscript.fileId);
      const parsed = parseGoogleMeetDoc(rawText);
      meetingSummary = parsed.meetingSummary;
      transcriptText = parsed.transcriptText;
    } catch (err) {
      console.error(`Failed to export native transcript for meeting ${meeting.id}:`, err);
    }

    await prisma.meeting.update({
      where: { id: meeting.id },
      data: {
        nativeTranscriptUrl: nativeTranscript.webViewLink,
        ...(meetingSummary !== null ? { meetingSummary } : {}),
        ...(transcriptText !== null ? { transcriptText, transcribedAt: now } : {}),
        ...(recording
          ? { recordingDriveId: recording.fileId, recordingUrl: recording.webViewLink, recordingMovedAt: now }
          : {}),
      },
    });

    results.push({
      meetingId: meeting.id,
      action: meetingSummary || transcriptText
        ? "google_transcript_saved"
        : "google_transcript_url_saved_export_failed",
    });
    return true;
  }

  // ── Strategy 2: Fallback — custom video transcription ────────────────────
  // Used when user forgot to enable transcription in Google Meet.
  // Downloads the .mp4 from Drive and submits to our transcription service.

  if (!recording) return false;

  const auth = await getAuthenticatedClient();
  const drive = google.drive({ version: "v3", auth });

  const fileRes = await drive.files.get(
    { fileId: recording.fileId, alt: "media" },
    { responseType: "arraybuffer" }
  );
  const buffer = Buffer.from(fileRes.data as ArrayBuffer);

  const { jobId: transcriptionJobId } = await submitVideoForTranscription(
    buffer,
    `reuniao-${meeting.id}.mp4`
  );

  await prisma.meeting.update({
    where: { id: meeting.id },
    data: {
      recordingDriveId: recording.fileId,
      recordingUrl: recording.webViewLink,
      recordingMovedAt: now,
      transcriptionJobId,
    },
  });

  results.push({
    meetingId: meeting.id,
    action: "recording_saved_video_transcription_queued",
  });
  return true;
}
