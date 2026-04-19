import { Injectable, Logger } from "@nestjs/common";
import { Either, right } from "@/core/either";
import { WhatsAppMessagesRepository } from "../repositories/whatsapp-messages.repository";
import { TranscriberPort } from "@/infra/shared/transcriber/transcriber.port";

export interface PollWhatsAppTranscriptionsOutput {
  polled: number;
  saved: number;
  failed: number;
}

@Injectable()
export class PollWhatsAppTranscriptionsUseCase {
  private readonly logger = new Logger(PollWhatsAppTranscriptionsUseCase.name);

  constructor(
    private readonly whatsAppRepo: WhatsAppMessagesRepository,
    private readonly transcriber: TranscriberPort,
  ) {}

  async execute(ownerId?: string): Promise<Either<never, PollWhatsAppTranscriptionsOutput>> {
    const pending = await this.whatsAppRepo.findPendingTranscriptions(ownerId);

    let saved = 0;
    let failed = 0;

    for (const msg of pending) {
      if (!msg.mediaTranscriptionJobId) continue;

      try {
        const status = await this.transcriber.getStatus(msg.mediaTranscriptionJobId);

        if (status.status === "pending" || status.status === "processing") {
          // Still in progress — skip
          continue;
        }

        if (status.status === "failed") {
          this.logger.warn("Transcription job failed", {
            id: msg.id,
            jobId: msg.mediaTranscriptionJobId,
          });
          await this.whatsAppRepo.saveTranscript(msg.id, "");
          // Clear jobId by saving empty transcript (saveTranscript nullifies jobId)
          failed++;
          continue;
        }

        if (status.status === "done") {
          const result = await this.transcriber.getResult(msg.mediaTranscriptionJobId);

          // Format speaker name
          const speakerName = msg.fromMe ? "Agente" : ((msg.pushName as string | null) ?? "Cliente");

          // Format transcript with speaker label
          const segments = result.segments ?? [];
          const formattedLines = segments.map(
            (s) => `${speakerName}: ${s.text}`,
          );
          const transcript = formattedLines.length > 0
            ? formattedLines.join("\n")
            : `${speakerName}: ${result.text}`;

          await this.whatsAppRepo.saveTranscript(msg.id, transcript);
          saved++;
        }
      } catch (err) {
        this.logger.error("Error polling WhatsApp transcription", {
          id: msg.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return right({ polled: pending.length, saved, failed });
  }
}
