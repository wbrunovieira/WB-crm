import { Injectable, Logger } from "@nestjs/common";
import { Either, right } from "@/core/either";
import { EvolutionApiPort } from "../ports/evolution-api.port";
import { GoogleDrivePort } from "../ports/google-drive.port";
import { WhatsAppMessagesRepository } from "../repositories/whatsapp-messages.repository";
import { TranscriberPort } from "@/infra/shared/transcriber/transcriber.port";
import { WhatsAppMessageType } from "@/domain/integrations/whatsapp/enterprise/value-objects/whatsapp-message-type.vo";

export interface ProcessWhatsAppMediaInput {
  whatsAppMessageId: string;
  messageData: {
    key: { id: string; fromMe: boolean; remoteJid: string };
    message: unknown;
    messageType: string;
  };
  entityName: string;
  senderName: string;
}

export interface ProcessWhatsAppMediaOutput {
  processed?: boolean;
  skipped?: boolean;
}

@Injectable()
export class ProcessWhatsAppMediaUseCase {
  private readonly logger = new Logger(ProcessWhatsAppMediaUseCase.name);

  constructor(
    private readonly evolutionApi: EvolutionApiPort,
    private readonly googleDrive: GoogleDrivePort,
    private readonly whatsAppRepo: WhatsAppMessagesRepository,
    private readonly transcriber: TranscriberPort,
  ) {}

  async execute(
    input: ProcessWhatsAppMediaInput,
  ): Promise<Either<never, ProcessWhatsAppMediaOutput>> {
    const { whatsAppMessageId, messageData, entityName, senderName } = input;

    try {
      // 1. Download media
      let downloadResult: Awaited<ReturnType<EvolutionApiPort["downloadMedia"]>>;
      try {
        downloadResult = await this.evolutionApi.downloadMedia({
          key: messageData.key,
          message: messageData.message as Record<string, unknown> | null,
        });
      } catch (err) {
        this.logger.warn("Failed to download WhatsApp media", {
          whatsAppMessageId,
          error: err instanceof Error ? err.message : String(err),
        });
        return right({ skipped: true });
      }

      // 2. Upload to Drive
      const folderPath = `WB-CRM/WhatsApp/${entityName}`;
      const folderId = await this.googleDrive.getOrCreateFolder(folderPath);

      const ext = downloadResult.fileName.split(".").pop() ?? "bin";
      const driveFileName = `${senderName}-${Date.now()}.${ext}`;

      const { id: driveId, webViewLink: mediaUrl } = await this.googleDrive.uploadFile({
        name: driveFileName,
        mimeType: downloadResult.mimeType,
        content: downloadResult.buffer,
        folderId,
      });

      // 3. Update WhatsApp message record
      await this.whatsAppRepo.updateMedia(whatsAppMessageId, {
        mediaDriveId: driveId,
        mediaUrl,
        mediaMimeType: downloadResult.mimeType,
      });

      // 4. Submit transcription if applicable
      const typeResult = WhatsAppMessageType.create(messageData.messageType);
      const isTranscribable = typeResult.isRight() && typeResult.value.isTranscribable();

      if (isTranscribable) {
        const isVideo = messageData.messageType === "videoMessage";
        let jobResult: { jobId: string };

        const backendUrl = process.env.BACKEND_PUBLIC_URL ?? "";
        const callbackSecret = process.env.TRANSCRIBER_CALLBACK_SECRET;
        const callbackOptions = backendUrl
          ? {
              callbackUrl: `${backendUrl}/webhooks/transcription/complete`,
              ...(callbackSecret ? { callbackSecret } : {}),
            }
          : undefined;

        if (isVideo) {
          jobResult = await this.transcriber.submitVideo(
            downloadResult.buffer,
            driveFileName,
            callbackOptions,
          );
        } else {
          jobResult = await this.transcriber.submitAudio(
            downloadResult.buffer,
            driveFileName,
            callbackOptions,
          );
        }

        await this.whatsAppRepo.updateMedia(whatsAppMessageId, {
          mediaTranscriptionJobId: jobResult.jobId,
        });
      }

      return right({ processed: true });
    } catch (err) {
      this.logger.error("Error processing WhatsApp media", {
        whatsAppMessageId,
        error: err instanceof Error ? err.message : String(err),
      });
      return right({ skipped: true });
    }
  }
}
