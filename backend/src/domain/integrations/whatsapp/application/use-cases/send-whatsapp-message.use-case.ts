import { Injectable, Logger } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { EvolutionApiPort } from "../ports/evolution-api.port";
import { ProcessWhatsAppMessageUseCase } from "./process-whatsapp-message.use-case";

export interface SendWhatsAppMessageInput {
  to: string;
  text: string;
  ownerId: string;
  contactName?: string;
  leadId?: string;
  contactId?: string;
  organizationId?: string;
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
    private readonly processMessage: ProcessWhatsAppMessageUseCase,
  ) {}

  async execute(
    input: SendWhatsAppMessageInput,
  ): Promise<Either<Error, SendWhatsAppMessageOutput>> {
    const { to, text, ownerId, contactName, leadId, contactId, organizationId } = input;

    try {
      // 1. Send via Evolution API
      const sendResult = await this.evolutionApi.sendText(to, text);

      const now = Math.floor(Date.now() / 1000);
      const digits = to.replace(/\D/g, "");
      const remoteJid = digits.includes("@") ? digits : `${digits}@s.whatsapp.net`;

      // 2. Process via shared use case — handles session grouping (2h window)
      const processResult = await this.processMessage.execute({
        messageId: sendResult.messageId,
        remoteJid,
        fromMe: true,
        messageType: "conversation",
        pushName: contactName,
        text,
        messageTimestamp: sendResult.timestamp ?? now,
        ownerId,
        entityOverride: { leadId, contactId },
      });

      if (processResult.isRight() && processResult.value.activityId) {
        return right({ messageId: sendResult.messageId, activityId: processResult.value.activityId });
      }

      // Fallback: return messageId even if activity creation had issues
      return right({ messageId: sendResult.messageId, activityId: "" });
    } catch (err) {
      this.logger.error("Error sending WhatsApp message", {
        to,
        error: err instanceof Error ? err.message : String(err),
      });
      return left(err instanceof Error ? err : new Error(String(err)));
    }
  }
}
