import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTranscriptionStatus, getTranscriptionResult } from "@/lib/transcriptor";

/**
 * GET /api/evolution/check-transcriptions
 *
 * Cron endpoint — roda a cada 5 minutos.
 *
 * Faz polling dos jobs de transcrição pendentes em WhatsAppMessage.
 * Quando concluído, salva o texto com atribuição de speaker:
 *   fromMe=true  → nome do agente (User.name)
 *   fromMe=false → pushName da mensagem
 *
 * Autenticado via CRON_SECRET header.
 */

async function getAgentName(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });
  return user?.name ?? "Agente";
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: { messageId: string; action: string; error?: string }[] = [];

  const pendingMessages = await prisma.whatsAppMessage.findMany({
    where: {
      mediaTranscriptionJobId: { not: null },
      mediaTranscriptText: null,
    },
    select: {
      id: true,
      mediaTranscriptionJobId: true,
      fromMe: true,
      ownerId: true,
      pushName: true,
    },
  });

  for (const msg of pendingMessages) {
    const jobId = msg.mediaTranscriptionJobId!;
    try {
      const status = await getTranscriptionStatus(jobId);

      if (status.status === "pending" || status.status === "processing") {
        results.push({ messageId: msg.id, action: "transcription_pending" });
        continue;
      }

      if (status.status === "failed") {
        await prisma.whatsAppMessage.update({
          where: { id: msg.id },
          data: { mediaTranscriptionJobId: null },
        });
        results.push({ messageId: msg.id, action: "transcription_failed" });
        continue;
      }

      // done — buscar resultado
      const result = await getTranscriptionResult(jobId);
      const speakerName = msg.fromMe
        ? await getAgentName(msg.ownerId)
        : (msg.pushName ?? "Cliente");

      const transcriptText = `${speakerName}: ${result.text}`;

      await prisma.whatsAppMessage.update({
        where: { id: msg.id },
        data: {
          mediaTranscriptText: transcriptText,
          mediaTranscriptionJobId: null,
        },
      });

      results.push({ messageId: msg.id, action: "transcription_saved" });
    } catch (err) {
      results.push({
        messageId: msg.id,
        action: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({
    polled: pendingMessages.length,
    results,
    checkedAt: new Date().toISOString(),
  });
}
