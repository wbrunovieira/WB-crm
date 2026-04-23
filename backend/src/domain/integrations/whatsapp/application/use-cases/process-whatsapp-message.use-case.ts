import { Injectable, Logger } from "@nestjs/common";
import { Either, right } from "@/core/either";
import { ActivitiesRepository } from "@/domain/activities/application/repositories/activities.repository";
import { Activity } from "@/domain/activities/enterprise/entities/activity";
import type { IPhoneMatcherService } from "@/infra/shared/phone-matcher/phone-matcher.service";
import { WhatsAppMessagesRepository } from "../repositories/whatsapp-messages.repository";
import { PrismaService } from "@/infra/database/prisma.service";

export interface ProcessWhatsAppMessageInput {
  messageId: string;
  remoteJid: string;
  fromMe: boolean;
  messageType: string;
  pushName?: string;
  text?: string | null;
  mediaLabel?: string | null;
  messageTimestamp: number;
  ownerId: string;
}

export interface ProcessWhatsAppMessageOutput {
  activityId?: string;
  isNewSession?: boolean;
  alreadyExists?: boolean;
  ignored?: boolean;
}

function formatMessageLine(
  fromMe: boolean,
  pushName: string | undefined,
  text: string | null | undefined,
  mediaLabel: string | null | undefined,
  timestamp: Date,
): string {
  const hh = String(timestamp.getHours()).padStart(2, "0");
  const mm = String(timestamp.getMinutes()).padStart(2, "0");
  const timeStr = `${hh}:${mm}`;

  const sender = fromMe ? "Você" : (pushName ?? "Cliente");
  const content = text ?? mediaLabel ?? "(mensagem sem texto)";

  return `[${timeStr}] ${sender}: ${content}`;
}

@Injectable()
export class ProcessWhatsAppMessageUseCase {
  private readonly logger = new Logger(ProcessWhatsAppMessageUseCase.name);

  constructor(
    private readonly whatsAppRepo: WhatsAppMessagesRepository,
    private readonly activitiesRepo: ActivitiesRepository,
    private readonly phoneMatcher: IPhoneMatcherService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    input: ProcessWhatsAppMessageInput,
  ): Promise<Either<never, ProcessWhatsAppMessageOutput>> {
    const {
      messageId,
      remoteJid,
      fromMe,
      messageType,
      pushName,
      text,
      mediaLabel,
      messageTimestamp,
      ownerId,
    } = input;

    // 1. Idempotency check
    const existing = await this.whatsAppRepo.findByMessageId(messageId);
    if (existing) {
      return right({ alreadyExists: true });
    }

    // 2. Extract phone from JID
    const atIndex = remoteJid.indexOf("@");
    const phone = atIndex >= 0
      ? remoteJid.slice(0, atIndex).replace(/\D/g, "")
      : remoteJid.replace(/\D/g, "");

    // 3. Phone matching
    let contactId: string | undefined;
    let leadId: string | undefined;
    let partnerId: string | undefined;
    let entityName: string | undefined;

    try {
      const matchResult = await this.phoneMatcher.match(phone, ownerId);
      if (!matchResult) {
        this.logger.debug("No phone match found — ignoring message", { phone, ownerId });
        return right({ ignored: true });
      }
      contactId = matchResult.contactId;
      leadId = matchResult.leadId;
      partnerId = matchResult.partnerId;
      entityName = pushName ?? phone;
    } catch {
      return right({ ignored: true });
    }

    // 4. Format message line
    const timestamp = new Date(messageTimestamp * 1000);
    const messageLine = formatMessageLine(fromMe, pushName, text, mediaLabel, timestamp);

    // 5. Find existing session (2h window)
    const SESSION_WINDOW_MS = 2 * 60 * 60 * 1000;
    const lastInSession = await this.whatsAppRepo.findLastInSession(remoteJid, ownerId, SESSION_WINDOW_MS);

    let activityId: string;
    let isNewSession: boolean;

    if (lastInSession?.activityId) {
      // Append to existing activity
      activityId = lastInSession.activityId;
      isNewSession = false;

      const activity = await this.activitiesRepo.findByIdRaw(activityId);
      if (activity) {
        const newDescription = activity.description
          ? `${activity.description}\n${messageLine}`
          : messageLine;
        activity.update({ description: newDescription });
        await this.activitiesRepo.save(activity);
      }
    } else {
      // New session — create activity
      isNewSession = true;
      const subject = `WhatsApp — ${pushName ?? phone}`;

      const activity = Activity.create({
        ownerId,
        type: "whatsapp",
        subject,
        description: messageLine,
        completed: true,
        completedAt: timestamp,
        dueDate: timestamp,
        contactId,
        leadId,
        partnerId,
        meetingNoShow: false,
        emailReplied: false,
        emailOpenCount: 0,
        emailLinkClickCount: 0,
      });

      await this.activitiesRepo.save(activity);
      activityId = activity.id.toString();

      // Create notification
      try {
        await this.prisma.notification.create({
          data: {
            type: "whatsapp_message",
            status: "pending",
            title: `Nova mensagem WhatsApp — ${pushName ?? phone}`,
            summary: text ?? mediaLabel ?? "(mídia)",
            payload: JSON.stringify({ activityId, remoteJid, messageId }),
            read: false,
            userId: ownerId,
          },
        });
      } catch (err) {
        this.logger.warn("Failed to create WhatsApp notification", {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // 6. Save WhatsApp message record
    await this.whatsAppRepo.create({
      messageId,
      remoteJid,
      fromMe,
      messageType,
      pushName,
      text,
      mediaLabel,
      timestamp,
      activityId,
      ownerId,
    });

    return right({ activityId, isNewSession });
  }
}
