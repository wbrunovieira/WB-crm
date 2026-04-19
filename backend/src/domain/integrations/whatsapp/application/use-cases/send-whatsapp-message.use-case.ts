import { Injectable, Logger } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { EvolutionApiPort } from "../ports/evolution-api.port";
import { WhatsAppMessagesRepository } from "../repositories/whatsapp-messages.repository";
import { ActivitiesRepository } from "@/domain/activities/application/repositories/activities.repository";
import { Activity } from "@/domain/activities/enterprise/entities/activity";

export interface SendWhatsAppMessageInput {
  to: string;
  text: string;
  ownerId: string;
  contactName?: string;
}

export interface SendWhatsAppMessageOutput {
  messageId: string;
  activityId: string;
}

@Injectable()
export class SendWhatsAppMessageUseCase {
  private readonly logger = new Logger(SendWhatsAppMessageUseCase.name);

  constructor(
    private readonly evolutionApi: EvolutionApiPort,
    private readonly whatsAppRepo: WhatsAppMessagesRepository,
    private readonly activitiesRepo: ActivitiesRepository,
  ) {}

  async execute(
    input: SendWhatsAppMessageInput,
  ): Promise<Either<Error, SendWhatsAppMessageOutput>> {
    const { to, text, ownerId, contactName } = input;

    try {
      // 1. Send via Evolution API
      const sendResult = await this.evolutionApi.sendText(to, text);

      const now = new Date();

      // 2. Create Activity immediately (fromMe=true, no webhook wait)
      const subject = `WhatsApp — ${contactName ?? to}`;
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const messageLine = `[${hh}:${mm}] Você: ${text}`;

      const activity = Activity.create({
        ownerId,
        type: "whatsapp",
        subject,
        description: messageLine,
        completed: true,
        completedAt: now,
        dueDate: now,
        meetingNoShow: false,
        emailReplied: false,
        emailOpenCount: 0,
        emailLinkClickCount: 0,
      });

      await this.activitiesRepo.save(activity);
      const activityId = activity.id.toString();

      // 3. Save WhatsApp message record
      await this.whatsAppRepo.create({
        messageId: sendResult.messageId,
        remoteJid: sendResult.remoteJid,
        fromMe: true,
        messageType: "conversation",
        pushName: undefined,
        text,
        timestamp: now,
        activityId,
        ownerId,
      });

      return right({ messageId: sendResult.messageId, activityId });
    } catch (err) {
      this.logger.error("Error sending WhatsApp message", {
        to,
        error: err instanceof Error ? err.message : String(err),
      });
      return left(err instanceof Error ? err : new Error(String(err)));
    }
  }
}
