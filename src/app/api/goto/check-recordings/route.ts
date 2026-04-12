import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findRecordingKey, downloadRecordingFromS3 } from "@/lib/goto/s3-recording";
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
 * Pass 1 — Find in S3 + submit transcription:
 *   Finds activities with gotoRecordingId but no gotoRecordingUrl (last 4h).
 *   Finds the MP3 in S3 → downloads → submits for transcription.
 *   Saves S3 key in gotoRecordingUrl.
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

  // ── Pass 1: Find in S3 → download → submit transcription ────────────────
  const since4h = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  const pendingDownload = await prisma.activity.findMany({
    where: {
      gotoRecordingId: { not: null },
      gotoRecordingUrl: null,
      completedAt: { gte: since4h },
    },
    select: { id: true, gotoRecordingId: true, completedAt: true },
  });

  for (const activity of pendingDownload) {
    try {
      const callDate = activity.completedAt ?? now;
      const s3Key = await findRecordingKey(activity.gotoRecordingId!, callDate);

      if (!s3Key) {
        results.push({ activityId: activity.id, action: "s3_not_found_yet" });
        continue;
      }

      const { buffer } = await downloadRecordingFromS3(s3Key);
      const fileName = `ligacao-${activity.id}.mp3`;
      const { jobId } = await submitAudioForTranscription(buffer, fileName);

      await prisma.activity.update({
        where: { id: activity.id },
        data: {
          gotoRecordingUrl: s3Key,
          gotoTranscriptionJobId: jobId,
        },
      });

      results.push({ activityId: activity.id, action: "s3_found_transcription_queued", s3Key } as never);
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
