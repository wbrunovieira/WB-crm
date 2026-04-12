import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { downloadCallRecording } from "@/lib/goto/recording-downloader";
import { uploadCallRecordingToDrive } from "@/lib/google/goto-drive-uploader";
import {
  submitAudioForTranscription,
  getTranscriptionStatus,
  getTranscriptionResult,
} from "@/lib/transcriptor";

/**
 * GET /api/goto/check-recordings
 *
 * Cron endpoint — runs every 15 minutes.
 *
 * Pass 1 — Download + upload + submit transcription:
 *   Finds activities with gotoRecordingId but no gotoRecordingDriveId (created in last 4h).
 *   Downloads audio from GoTo API → uploads to Google Drive → submits for transcription.
 *
 * Pass 2 — Poll pending transcription jobs:
 *   Finds activities with gotoTranscriptionJobId set.
 *   Polls status → if done, saves gotoTranscriptText and clears jobId.
 *
 * Secured by CRON_SECRET header.
 */
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const results: { activityId: string; action: string; error?: string }[] = [];

  // ── Pass 1: Download recording → Drive → transcription ──────────────────
  const since4h = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  const pendingDownload = await prisma.activity.findMany({
    where: {
      gotoRecordingId: { not: null },
      gotoRecordingDriveId: null,
      completedAt: { gte: since4h },
    },
    select: { id: true, gotoRecordingId: true, subject: true },
  });

  for (const activity of pendingDownload) {
    try {
      const { buffer, contentType } = await downloadCallRecording(
        activity.gotoRecordingId!
      );

      // File name: ligacao-{activityId}.mp3 (safe for Drive)
      const ext = contentType.includes("wav") ? "wav" : contentType.includes("flac") ? "flac" : "mp3";
      const fileName = `ligacao-${activity.id}.${ext}`;

      const { fileId, webViewLink } = await uploadCallRecordingToDrive(
        buffer,
        fileName,
        contentType
      );

      const { jobId } = await submitAudioForTranscription(buffer, fileName);

      await prisma.activity.update({
        where: { id: activity.id },
        data: {
          gotoRecordingDriveId: fileId,
          gotoRecordingUrl: webViewLink,
          gotoTranscriptionJobId: jobId,
        },
      });

      results.push({ activityId: activity.id, action: "recording_uploaded_transcription_queued" });
    } catch (err) {
      console.error(`Pass 1 error for activity ${activity.id}:`, err);
      results.push({ activityId: activity.id, action: "error", error: String(err) });
    }
  }

  // ── Pass 2: Poll pending transcription jobs ──────────────────────────────
  const pendingJobs = await prisma.activity.findMany({
    where: {
      gotoTranscriptionJobId: { not: null },
      gotoTranscriptText: null,
    },
    select: { id: true, gotoTranscriptionJobId: true },
  });

  for (const activity of pendingJobs) {
    const jobId = activity.gotoTranscriptionJobId!;
    try {
      const { status, error } = await getTranscriptionStatus(jobId);

      if (status === "done") {
        const { text } = await getTranscriptionResult(jobId);
        await prisma.activity.update({
          where: { id: activity.id },
          data: { gotoTranscriptText: text, gotoTranscriptionJobId: null },
        });
        results.push({ activityId: activity.id, action: "transcription_saved" });
      } else if (status === "failed") {
        console.error(`Transcription job ${jobId} failed:`, error);
        await prisma.activity.update({
          where: { id: activity.id },
          data: { gotoTranscriptionJobId: null },
        });
        results.push({ activityId: activity.id, action: "transcription_failed", error: error ?? "unknown" });
      } else {
        results.push({ activityId: activity.id, action: `transcription_${status}` });
      }
    } catch (err) {
      console.error(`Pass 2 error for activity ${activity.id}:`, err);
      results.push({ activityId: activity.id, action: "error", error: String(err) });
    }
  }

  return NextResponse.json({
    pass1Processed: pendingDownload.length,
    pass2Polled: pendingJobs.length,
    results,
    checkedAt: now.toISOString(),
  });
}
