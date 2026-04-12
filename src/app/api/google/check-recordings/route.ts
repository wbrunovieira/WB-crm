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
 * Pass 0 — Drive-first detection (catches meetings started early or late):
 *   Lists all new files in "Meet Recordings" folder (last 6h).
 *   Extracts the meeting title from the filename and finds matching scheduled
 *   meetings in the DB. This detects meetings regardless of scheduled time —
 *   a meeting scheduled for 17:00 that ran at 11:00 is caught immediately.
 *
 * Pass 1 — scheduled → ended (time-based fallback):
 *   Finds meetings whose scheduled time has passed. Catches meetings where
 *   no recording was created (e.g. host forgot to record).
 *
 * Pass 2 — ended, files still pending:
 *   Retries recording/transcript search for ended meetings with no files yet.
 *   Google can take >15min to process recordings.
 *
 * Transcript strategy (priority):
 *   1. Google Meet native transcript doc → meetingSummary + transcriptText
 *   2. Fallback: custom video transcription (if user forgot to enable transcript)
 *
 * Secured by CRON_SECRET header.
 */
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const results: { meetingId: string; action: string; error?: string }[] = [];

  // ── Pass 0: Drive-first — detect early/late meetings via new Drive files ──
  // Searches "Meet Recordings" for files created in the last 6 hours,
  // extracts meeting title from filename, matches to scheduled meetings.
  const pass0Ids = new Set<string>();
  try {
    const auth = await getAuthenticatedClient();
    const drive = google.drive({ version: "v3", auth });

    const folderRes = await drive.files.list({
      q: `name = 'Meet Recordings' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: "files(id)",
      pageSize: 1,
    });
    const meetFolder = folderRes.data.files?.[0];

    if (meetFolder) {
      const since6h = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString();
      const recentFiles = await drive.files.list({
        q: `'${meetFolder.id}' in parents and trashed = false and createdTime > '${since6h}'`,
        fields: "files(id, name, mimeType, createdTime)",
        orderBy: "createdTime desc",
        pageSize: 50,
      });

      // Extract unique meeting titles from filenames.
      // Google Meet names files: "[Title] - YYYY/MM/DD HH:MM GMT±N - Recording"
      const titlesInDrive = new Set<string>();
      for (const f of recentFiles.data.files ?? []) {
        const match = f.name?.match(/^(.+?) - \d{4}\/\d{2}\/\d{2}/);
        if (match) titlesInDrive.add(match[1].toLowerCase());
      }

      if (titlesInDrive.size > 0) {
        // Find scheduled meetings whose title matches a file in Drive
        const scheduledMeetings = await prisma.meeting.findMany({
          where: { status: "scheduled" },
          include: {
            lead: { select: { id: true, businessName: true } },
            deal: { select: { id: true, title: true } },
            activity: { select: { id: true, completed: true } },
          },
        });

        for (const meeting of scheduledMeetings) {
          if (!titlesInDrive.has(meeting.title.toLowerCase())) continue;

          pass0Ids.add(meeting.id);
          try {
            // Fetch final RSVP statuses
            let updatedAttendees: string | undefined;
            try {
              const event = await getMeetEvent(meeting.googleEventId!);
              updatedAttendees = JSON.stringify(extractAttendees(event));
            } catch { /* non-fatal */ }

            await prisma.meeting.update({
              where: { id: meeting.id },
              data: {
                status: "ended",
                actualEndAt: now,
                actualStartAt: meeting.actualStartAt ?? now,
                ...(updatedAttendees ? { attendeeEmails: updatedAttendees } : {}),
              },
            });

            if (meeting.activityId && meeting.activity && !meeting.activity.completed) {
              await prisma.activity.update({
                where: { id: meeting.activityId },
                data: { completed: true, completedAt: now },
              });
            }

            // Pass now as scheduledStartAt: the meeting just ended (detected by Drive),
            // so the date filter in findMeetingFiles should look back from now, not
            // from the scheduled start (which may be hours in the future).
            const found = await processRecording(meeting, now, now, results);
            if (!found) {
              results.push({ meetingId: meeting.id, action: "drive_detected_recording_pending" });
            }
          } catch (err) {
            console.error(`Pass 0 error for meeting ${meeting.id}:`, err);
            results.push({ meetingId: meeting.id, action: "error", error: String(err) });
          }
        }
      }
    }
  } catch (err) {
    console.error("Pass 0 Drive scan error:", err);
  }

  // ── Pass 1: time-based fallback (catches meetings with no recording) ───────
  const earlyEndCutoff = new Date(now.getTime() - 30 * 60 * 1000);
  const scheduledEnded = await prisma.meeting.findMany({
    where: {
      status: "scheduled",
      id: { notIn: Array.from(pass0Ids) }, // already handled by Pass 0
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

  for (const meeting of scheduledEnded) {
    try {
      let updatedAttendees: string | undefined;
      try {
        const event = await getMeetEvent(meeting.googleEventId!);
        updatedAttendees = JSON.stringify(extractAttendees(event));
      } catch { /* non-fatal */ }

      await prisma.meeting.update({
        where: { id: meeting.id },
        data: {
          status: "ended",
          actualEndAt: now,
          ...(meeting.actualStartAt ? {} : { actualStartAt: meeting.startAt }),
          ...(updatedAttendees ? { attendeeEmails: updatedAttendees } : {}),
        },
      });

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

      const found = await processRecording(meeting, meeting.startAt, now, results);
      if (!found) {
        results.push({ meetingId: meeting.id, action: "ended_recording_pending" });
      }
    } catch (err) {
      console.error(`Pass 1 error for meeting ${meeting.id}:`, err);
      results.push({ meetingId: meeting.id, action: "error", error: String(err) });
    }
  }

  // ── Pass 2: retry for ended meetings still missing files ──────────────────
  const waitingForRecording = await prisma.meeting.findMany({
    where: {
      status: "ended",
      recordingDriveId: null,
      googleEventId: { not: null },
      actualEndAt: { gt: new Date(now.getTime() - 4 * 60 * 60 * 1000) },
    },
    include: {
      lead: { select: { id: true, businessName: true } },
      deal: { select: { id: true, title: true } },
      activity: { select: { id: true, completed: true } },
    },
  });

  for (const meeting of waitingForRecording) {
    try {
      // Use actualEndAt as the reference time for Drive search — the recording
      // was created around when the meeting ended, not when it was scheduled.
      const searchRef = meeting.actualEndAt ?? meeting.startAt;
      const found = await processRecording(meeting, searchRef, now, results);
      if (!found) {
        results.push({ meetingId: meeting.id, action: "recording_still_pending" });
      }
    } catch (err) {
      console.error(`Pass 2 error for meeting ${meeting.id}:`, err);
      results.push({ meetingId: meeting.id, action: "error", error: String(err) });
    }
  }

  return NextResponse.json({
    processedNew: pass0Ids.size + scheduledEnded.length,
    pass0DriveDetected: pass0Ids.size,
    pass1TimeBased: scheduledEnded.length,
    retriedRecording: waitingForRecording.length,
    results,
    checkedAt: now.toISOString(),
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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
 * Splits the exported Google Meet doc:
 * - meetingSummary: "📝 Observações" section (Gemini AI notes)
 * - transcriptText: "📖 Transcrição" section (raw with speaker names)
 */
function parseGoogleMeetDoc(text: string): {
  meetingSummary: string | null;
  transcriptText: string | null;
} {
  const idx = text.indexOf("📖");
  if (idx === -1) {
    return { meetingSummary: text || null, transcriptText: null };
  }
  return {
    meetingSummary: text.slice(0, idx).trim() || null,
    transcriptText: text.slice(idx).trim() || null,
  };
}

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

  // ── Strategy 1: Google native doc (Gemini notes + optional raw transcript) ─
  // Google always creates "Anotações do Gemini" (AI summary).
  // The raw transcript section (📖 Transcrição) only appears when the user
  // explicitly enables transcription in the meeting. When it's absent, we still
  // save the summary but fall through to video transcription as fallback.
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

    // Save whatever we got from the doc (summary and/or transcript)
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

    // If the doc has a raw transcript, we're done — no need for video transcription
    if (transcriptText) {
      results.push({ meetingId: meeting.id, action: "google_transcript_saved" });
      return true;
    }

    // Doc exists but no raw transcript (user didn't enable it) → fall through
    // to video transcription. We still return the summary saved above.
    results.push({ meetingId: meeting.id, action: "google_summary_saved_no_transcript" });
  }

  // ── Strategy 2: Fallback — custom video transcription ────────────────────
  // Used when: (a) no native doc at all, or (b) doc exists but has no raw transcript.
  if (!recording) return nativeTranscript !== null; // true if we at least saved the summary

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

  results.push({ meetingId: meeting.id, action: "recording_saved_video_transcription_queued" });
  return true;
}
