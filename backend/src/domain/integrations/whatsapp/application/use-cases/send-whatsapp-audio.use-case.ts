import { Injectable, Logger } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { EvolutionApiPort } from "../ports/evolution-api.port";
import { GoogleDrivePort } from "../ports/google-drive.port";
import { WhatsAppMessagesRepository } from "../repositories/whatsapp-messages.repository";
import { TranscriberPort } from "@/infra/shared/transcriber/transcriber.port";

export interface SendWhatsAppAudioInput {
  to: string;
  buffer: Buffer;
  fileName: string;
  mimetype: string;
  requesterId: string;
  entityName: string;
}

export interface SendWhatsAppAudioOutput {
  messageId: string;
  driveId: string;
}

@Injectable()
export class SendWhatsAppAudioUseCase {
  private readonly logger = new Logger(SendWhatsAppAudioUseCase.name);

  constructor(
    private readonly evolutionApi: EvolutionApiPort,
    private readonly drive: GoogleDrivePort,
    private readonly repo: WhatsAppMessagesRepository,
    private readonly transcriber: TranscriberPort,
  ) {}

  async execute(input: SendWhatsAppAudioInput): Promise<Either<Error, SendWhatsAppAudioOutput>> {
    const { to, buffer, fileName, mimetype, requesterId, entityName } = input;

    // 1. Upload to Google Drive
    const folderId = await this.drive.getOrCreateFolder(`WhatsApp - ${entityName}`);
    const { id: driveId, webViewLink: mediaUrl } = await this.drive.uploadFile({
      name: fileName,
      mimeType: mimetype,
      content: buffer,
      folderId,
    });

    // 2. Send as PTT voice message via Evolution API
    let messageId: string;
    try {
      const audioBase64 = buffer.toString("base64");
      const sendResult = await this.evolutionApi.sendAudio({ to, audioBase64, mimetype });
      messageId = sendResult.messageId;
    } catch (err) {
      return left(err instanceof Error ? err : new Error(String(err)));
    }

    // 3. Find existing session to inherit activityId
    const remoteJid = to.includes("@") ? to : `${to}@s.whatsapp.net`;
    const sessionMsg = await this.repo.findLastInSession(remoteJid, requesterId, 2 * 60 * 60 * 1000);
    const activityId = sessionMsg?.activityId ?? null;

    // 4. Create WhatsApp message record
    const msg = await this.repo.create({
      messageId,
      remoteJid,
      fromMe: true,
      messageType: "audioMessage",
      ownerId: requesterId,
      mediaDriveId: driveId,
      mediaUrl,
      mediaMimeType: mimetype,
      mediaLabel: "🎤 Áudio de voz",
      timestamp: new Date(),
      activityId,
    });

    // 5. Submit for transcription (non-fatal)
    try {
      const { jobId } = await this.transcriber.submitAudio(buffer, fileName);
      await this.repo.updateMedia(msg.id, { mediaTranscriptionJobId: jobId });
    } catch (err) {
      this.logger.warn("Audio transcription submission failed (non-fatal)", {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return right({ messageId, driveId });
  }
}
