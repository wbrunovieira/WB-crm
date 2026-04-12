import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  findRecordingKey,
  findSiblingRecordingKey,
  downloadRecordingFromS3,
} from "@/lib/goto/s3-recording";
import {
  submitAudioForTranscription,
  getTranscriptionStatus,
  getTranscriptionResult,
  TranscriptionSegment,
} from "@/lib/transcriptor";

/**
 * GET /api/goto/check-recordings
 *
 * Cron endpoint — runs every 15 minutes.
 *
 * Pass 1 — Find both tracks in S3 + submit dual transcription:
 *   Finds activities with gotoRecordingId but no gotoRecordingUrl.
 *   Finds agent MP3 → finds sibling client MP3 → downloads both →
 *   submits each for transcription individually.
 *   Saves S3 keys and job IDs.
 *
 * Pass 2 — Poll both transcription jobs:
 *   Finds activities with pending transcription jobs.
 *   When BOTH agent + client jobs complete → interleaves segments by timestamp
 *   → saves JSON transcript with speaker attribution and names.
 *
 * Secured by CRON_SECRET header.
 */

export interface TranscriptSegment extends TranscriptionSegment {
  speaker: "agent" | "client";
  speakerName: string;
}

async function getAgentName(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });
  return user?.name ?? "Agente";
}

async function getClientName(activity: {
  contactId: string | null;
  leadId: string | null;
  partnerId: string | null;
}): Promise<string> {
  if (activity.contactId) {
    const c = await prisma.contact.findUnique({
      where: { id: activity.contactId },
      select: { name: true },
    });
    return c?.name ?? "Cliente";
  }
  if (activity.leadId) {
    const l = await prisma.lead.findUnique({
      where: { id: activity.leadId },
      select: { name: true },
    });
    return l?.name ?? "Cliente";
  }
  if (activity.partnerId) {
    const p = await prisma.partner.findUnique({
      where: { id: activity.partnerId },
      select: { name: true },
    });
    return p?.name ?? "Parceiro";
  }
  return "Cliente";
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const results: { activityId: string; action: string; error?: string }[] = [];

  // ── Pass 1: Find both tracks in S3 → submit dual transcription ──────────
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
      const agentKey = await findRecordingKey(activity.gotoRecordingId!, callDate);

      if (!agentKey) {
        results.push({ activityId: activity.id, action: "s3_not_found_yet" });
        continue;
      }

      // Find client track (sibling file with same callId)
      const siblingResult = await findSiblingRecordingKey(agentKey);
      const clientKey = siblingResult?.key ?? null;

      // Download and transcribe agent track
      const { buffer: bufferAgent } = await downloadRecordingFromS3(agentKey);
      const { jobId: jobAgent } = await submitAudioForTranscription(
        bufferAgent,
        `ligacao-${activity.id}-agent.mp3`
      );

      // Download and transcribe client track (if found)
      let jobClient: string | null = null;
      if (clientKey) {
        const { buffer: bufferClient } = await downloadRecordingFromS3(clientKey);
        const { jobId } = await submitAudioForTranscription(
          bufferClient,
          `ligacao-${activity.id}-client.mp3`
        );
        jobClient = jobId;
      }

      await prisma.activity.update({
        where: { id: activity.id },
        data: {
          gotoRecordingUrl: agentKey,
          gotoRecordingUrl2: clientKey,
          gotoTranscriptionJobId: jobAgent,
          gotoTranscriptionJobId2: jobClient,
        },
      });

      results.push({
        activityId: activity.id,
        action: clientKey ? "s3_found_dual_transcription_queued" : "s3_found_single_transcription_queued",
        agentKey,
        clientKey,
      } as never);
    } catch (err) {
      console.error(`Pass 1 error for activity ${activity.id}:`, err);
      results.push({ activityId: activity.id, action: "error", error: String(err) });
    }
  }

  // ── Pass 2: Poll both transcription jobs → interleave when both done ─────
  const pendingJobs = await prisma.activity.findMany({
    where: {
      gotoTranscriptText: null,
      OR: [
        { gotoTranscriptionJobId: { not: null } },
        { gotoTranscriptionJobId2: { not: null } },
      ],
    },
    select: {
      id: true,
      ownerId: true,
      gotoTranscriptionJobId: true,
      gotoTranscriptionJobId2: true,
      contactId: true,
      leadId: true,
      partnerId: true,
    },
  });

  for (const activity of pendingJobs) {
    try {
      const jobA = activity.gotoTranscriptionJobId;
      const jobB = activity.gotoTranscriptionJobId2;

      const statusA = jobA ? await getTranscriptionStatus(jobA) : null;
      const statusB = jobB ? await getTranscriptionStatus(jobB) : null;

      const aDone = !statusA || statusA.status === "done" || statusA.status === "failed";
      const bDone = !statusB || statusB.status === "done" || statusB.status === "failed";

      if (!aDone || !bDone) {
        // Still waiting for at least one job
        const pending = [!aDone && "agent", !bDone && "client"].filter(Boolean).join("+");
        results.push({ activityId: activity.id, action: `transcription_pending_${pending}` });
        continue;
      }

      // Both done/failed — fetch results and interleave
      const resultA = statusA?.status === "done" && jobA
        ? await getTranscriptionResult(jobA)
        : null;
      const resultB = statusB?.status === "done" && jobB
        ? await getTranscriptionResult(jobB)
        : null;

      const agentName = await getAgentName(activity.ownerId);
      const clientName = await getClientName(activity);

      const segmentsAgent: TranscriptSegment[] = (resultA?.segments ?? []).map((s) => ({
        ...s,
        speaker: "agent",
        speakerName: agentName,
      }));
      const segmentsClient: TranscriptSegment[] = (resultB?.segments ?? []).map((s) => ({
        ...s,
        speaker: "client",
        speakerName: clientName,
      }));

      const interleaved = [...segmentsAgent, ...segmentsClient].sort(
        (a, b) => a.start - b.start
      );

      const transcriptJson = JSON.stringify(interleaved);

      await prisma.activity.update({
        where: { id: activity.id },
        data: {
          gotoTranscriptText: transcriptJson,
          gotoTranscriptionJobId: null,
          gotoTranscriptionJobId2: null,
        },
      });

      results.push({ activityId: activity.id, action: "transcription_saved" });
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
