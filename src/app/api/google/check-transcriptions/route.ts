import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTranscriptionStatus, getTranscriptionResult } from "@/lib/transcriptor";

/**
 * GET /api/google/check-transcriptions
 *
 * Cron endpoint — runs every 5 minutes.
 * Polls pending transcription jobs and saves the result when done.
 *
 * Flow:
 * 1. Find meetings where transcriptionJobId is set but transcriptText is null.
 * 2. Check status via GET /transcriptions/{job_id}.
 * 3. If "done": fetch result and save transcriptText + transcribedAt.
 * 4. If "failed": log the error; clear the jobId so it can be retried.
 *
 * Secured by CRON_SECRET header.
 */
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find all meetings with a pending transcription job
  const pending = await prisma.meeting.findMany({
    where: {
      transcriptionJobId: { not: null },
      transcriptText: null,
    },
    select: { id: true, transcriptionJobId: true },
  });

  const results: { meetingId: string; action: string; error?: string }[] = [];

  for (const meeting of pending) {
    const jobId = meeting.transcriptionJobId!;
    try {
      const { status, error } = await getTranscriptionStatus(jobId);

      if (status === "done") {
        const { text } = await getTranscriptionResult(jobId);

        await prisma.meeting.update({
          where: { id: meeting.id },
          data: {
            transcriptText: text,
            transcribedAt: new Date(),
            transcriptionJobId: null, // clear job ID — no longer needed
          },
        });

        results.push({ meetingId: meeting.id, action: "transcription_saved" });
      } else if (status === "failed") {
        console.error(`Transcription job ${jobId} failed:`, error);
        await prisma.meeting.update({
          where: { id: meeting.id },
          data: { transcriptionJobId: null }, // clear so it can be retried manually
        });
        results.push({
          meetingId: meeting.id,
          action: "transcription_failed",
          error: error ?? "unknown",
        });
      } else {
        // pending | processing — still running, check again next cycle
        results.push({ meetingId: meeting.id, action: `transcription_${status}` });
      }
    } catch (err) {
      console.error(`Error checking transcription for meeting ${meeting.id}:`, err);
      results.push({
        meetingId: meeting.id,
        action: "error",
        error: String(err),
      });
    }
  }

  return NextResponse.json({
    polled: pending.length,
    results,
    checkedAt: new Date().toISOString(),
  });
}
