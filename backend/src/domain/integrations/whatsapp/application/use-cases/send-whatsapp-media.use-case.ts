import { Injectable, Logger } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { EvolutionApiPort } from "../ports/evolution-api.port";
import { WhatsAppMessagesRepository } from "../repositories/whatsapp-messages.repository";
import { ActivitiesRepository } from "@/domain/activities/application/repositories/activities.repository";
import { Activity } from "@/domain/activities/enterprise/entities/activity";

export interface SendWhatsAppMediaInput {
  to: string;
  mediatype: string;
  mediaBase64: string;
  fileName: string;
  mimetype: string;
  caption?: string;
  ownerId: string;
  entityName: string;
  leadId?: string | null;
  contactId?: string | null;
  organizationId?: string | null;
}

export interface SendWhatsAppMediaOutput {
  messageId: string;
  activityId: string;
}

const SESSION_WINDOW_MS = 2 * 60 * 60 * 1000;

@Injectable()
export class SendWhatsAppMediaUseCase {
  private readonly logger = new Logger(SendWhatsAppMediaUseCase.name);

  constructor(
    private readonly evolutionApi: EvolutionApiPort,
    private readonly repo: WhatsAppMessagesRepository,
    private readonly activitiesRepo: ActivitiesRepository,
  ) {}

  async execute(input: SendWhatsAppMediaInput): Promise<Either<Error, SendWhatsAppMediaOutput>> {
    const { to, mediatype, mediaBase64, fileName, mimetype, caption, ownerId, entityName, leadId, contactId } = input;

    let messageId: string;
    try {
      const result = await this.evolutionApi.sendMedia({
        to,
        mediatype,
        media: mediaBase64,
        caption,
        fileName,
        mimetype,
      });
      messageId = result.messageId;
    } catch (err) {
      this.logger.error("Error sending WhatsApp media", { error: err });
      return left(err instanceof Error ? err : new Error(String(err)));
    }

    const remoteJid = to.includes("@") ? to : `${to}@s.whatsapp.net`;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const mediaLabel = `📎 ${fileName}`;
    const messageLine = caption
      ? `[${timeStr}] Você: ${mediaLabel}\n${caption}`
      : `[${timeStr}] Você: ${mediaLabel}`;

    const lastInSession = await this.repo.findLastInSession(remoteJid, ownerId, SESSION_WINDOW_MS);

    let activityId: string;

    if (lastInSession?.activityId) {
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
      const activity = Activity.create({
        ownerId,
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

    await this.repo.create({
      messageId,
      remoteJid,
      fromMe: true,
      messageType: mediatype === "audio" ? "audioMessage" : "mediaMessage",
      ownerId,
      mediaMimeType: mimetype,
      mediaLabel,
      text: caption ?? null,
      timestamp: now,
      activityId,
    });

    return right({ messageId, activityId });
  }
}
