import { Injectable, Logger } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { WhatsAppMessagesRepository } from "../repositories/whatsapp-messages.repository";
import { CreateNotificationUseCase } from "@/domain/notifications/application/use-cases/notifications.use-cases";
import { NotificationsEventBus } from "@/domain/notifications/application/ports/notifications-event-bus";
import { TranscriptionResult } from "@/infra/shared/transcriber/transcriber.port";

export class TranscriptionJobNotFoundError extends Error {
  name = "TranscriptionJobNotFoundError";
  constructor(jobId: string) {
    super(`Transcription job not found: ${jobId}`);
  }
}

export interface HandleWhatsAppTranscriptionCallbackInput {
  jobId: string;
  result: TranscriptionResult;
}

export interface HandleWhatsAppTranscriptionCallbackOutput {
  messageId: string;
  transcript: string;
}

@Injectable()
export class HandleWhatsAppTranscriptionCallbackUseCase {
  private readonly logger = new Logger(HandleWhatsAppTranscriptionCallbackUseCase.name);

  constructor(
    private readonly whatsAppRepo: WhatsAppMessagesRepository,
    private readonly createNotification: CreateNotificationUseCase,
    private readonly eventBus: NotificationsEventBus,
  ) {}

  async execute(
    input: HandleWhatsAppTranscriptionCallbackInput,
  ): Promise<Either<TranscriptionJobNotFoundError, HandleWhatsAppTranscriptionCallbackOutput>> {
    const { jobId, result } = input;

    const msg = await this.whatsAppRepo.findByTranscriptionJobId(jobId);
    if (!msg) {
      return left(new TranscriptionJobNotFoundError(jobId));
    }

    const speakerName = msg.fromMe ? "Agente" : ((msg.pushName as string | null) ?? "Cliente");
    const segments = result.segments ?? [];
    const formattedLines = segments.map((s) => `${speakerName}: ${s.text}`);
    const transcript = formattedLines.length > 0
      ? formattedLines.join("\n")
      : `${speakerName}: ${result.text}`;

    await this.whatsAppRepo.saveTranscript(msg.id, transcript);

    const notifResult = await this.createNotification.execute({
      type: "WHATSAPP_TRANSCRIBED",
      title: "Transcrição concluída",
      summary: `Áudio/vídeo transcrito com sucesso`,
      userId: msg.ownerId,
      jobId,
      payload: JSON.stringify({ messageId: msg.id, activityId: msg.activityId }),
    });

    if (notifResult.isRight()) {
      this.eventBus.emit(notifResult.value);
    } else {
      this.logger.warn("Failed to create transcription notification", { jobId });
    }

    return right({ messageId: msg.id, transcript });
  }
}
