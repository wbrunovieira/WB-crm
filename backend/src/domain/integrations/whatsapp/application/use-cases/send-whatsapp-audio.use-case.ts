import { Injectable, Logger } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { EvolutionApiPort } from "../ports/evolution-api.port";
import { GoogleDrivePort } from "../ports/google-drive.port";
import { WhatsAppMessagesRepository } from "../repositories/whatsapp-messages.repository";
import { TranscriberPort } from "@/infra/shared/transcriber/transcriber.port";
import { ActivitiesRepository } from "@/domain/activities/application/repositories/activities.repository";
import { Activity } from "@/domain/activities/enterprise/entities/activity";

export interface SendWhatsAppAudioInput {
  to: string;
  buffer: Buffer;
  fileName: string;
  mimetype: string;
  requesterId: string;
  entityName: string;
  leadId?: string | null;
  contactId?: string | null;
}

export interface SendWhatsAppAudioOutput {
  messageId: string;
  driveId: string;
  activityId: string;
}

const SESSION_WINDOW_MS = 2 * 60 * 60 * 1000;

@Injectable()
export class SendWhatsAppAudioUseCase {
  private readonly logger = new Logger(SendWhatsAppAudioUseCase.name);

  constructor(
    private readonly evolutionApi: EvolutionApiPort,
    private readonly drive: GoogleDrivePort,
    private readonly repo: WhatsAppMessagesRepository,
    private readonly transcriber: TranscriberPort,
    private readonly activitiesRepo: ActivitiesRepository,
  ) {}

  async execute(input: SendWhatsAppAudioInput): Promise<Either<Error, SendWhatsAppAudioOutput>> {
    const { to, buffer, fileName, mimetype, requesterId, entityName, leadId, contactId } = input;

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

    // 3. Compute remoteJid and find existing session
    const remoteJid = to.includes("@") ? to : `${to}@s.whatsapp.net`;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const messageLine = `[${timeStr}] Você: 🎤 Áudio de voz`;

    const lastInSession = await this.repo.findLastInSession(remoteJid, requesterId, SESSION_WINDOW_MS);

    let activityId: string;

    if (lastInSession?.activityId) {
      // Append to existing activity
      activityId = lastInSession.activityId;
      const activity = await this.activitiesRepo.findByIdRaw(activityId);
      if (activity) {
        activity.update({
          description: activity.description
            ? `${activity.description}\n${messageLine}`
            : messageLine,
        });
        await this.activitiesRepo.save(activity);
      }
    } else {
      // New session — create activity
      const activity = Activity.create({
        ownerId: requesterId,
        type: "whatsapp",
        subject: `WhatsApp — ${entityName}`,
        description: messageLine,
        completed: true,
        completedAt: now,
        dueDate: now,
        leadId: leadId ?? undefined,
        contactId: contactId ?? undefined,
        meetingNoShow: false,
        emailReplied: false,
        emailOpenCount: 0,
        emailLinkClickCount: 0,
      });
      await this.activitiesRepo.save(activity);
      activityId = activity.id.toString();
    }

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
      timestamp: now,
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

    return right({ messageId, driveId, activityId });
  }
}
