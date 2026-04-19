import { Injectable, Logger } from "@nestjs/common";
import { Either, right } from "@/core/either";
import { WhatsAppJid } from "@/domain/integrations/whatsapp/enterprise/value-objects/whatsapp-jid.vo";
import { ProcessWhatsAppMessageUseCase } from "./process-whatsapp-message.use-case";

export interface HandleWhatsAppWebhookInput {
  event: string;
  remoteJid: string;
  messageId?: string;
  fromMe?: boolean;
  messageType?: string;
  pushName?: string;
  text?: string;
  message?: unknown;
  messageTimestamp?: number;
  ownerId: string;
}

export interface HandleWhatsAppWebhookOutput {
  ignored?: boolean;
  processed?: boolean;
}

@Injectable()
export class HandleWhatsAppWebhookUseCase {
  private readonly logger = new Logger(HandleWhatsAppWebhookUseCase.name);

  constructor(
    private readonly processMessage: ProcessWhatsAppMessageUseCase,
  ) {}

  async execute(
    input: HandleWhatsAppWebhookInput,
  ): Promise<Either<never, HandleWhatsAppWebhookOutput>> {
    const { event, remoteJid, messageId, fromMe, messageType, pushName, text, messageTimestamp, ownerId } = input;

    try {
      // Only process messages.upsert events
      if (event !== "messages.upsert") {
        this.logger.debug(`Ignoring WhatsApp event: ${event}`);
        return right({ ignored: true });
      }

      // Require remoteJid
      if (!remoteJid) {
        this.logger.debug("Missing remoteJid — ignoring");
        return right({ ignored: true });
      }

      // Validate JID
      const jidResult = WhatsAppJid.create(remoteJid);
      if (jidResult.isLeft()) {
        this.logger.debug(`Invalid JID "${remoteJid}" — ignoring`);
        return right({ ignored: true });
      }

      const jid = jidResult.value;

      // Ignore group messages
      if (jid.isGroup()) {
        this.logger.debug(`Group JID ignored: ${remoteJid}`);
        return right({ ignored: true });
      }

      // Fallback messageType to "conversation" if unknown
      const resolvedMessageType = messageType ?? "conversation";

      await this.processMessage.execute({
        messageId: messageId ?? `fallback-${Date.now()}`,
        remoteJid,
        fromMe: fromMe ?? false,
        messageType: resolvedMessageType,
        pushName,
        text,
        messageTimestamp: messageTimestamp ?? Math.floor(Date.now() / 1000),
        ownerId,
      });

      return right({ processed: true });
    } catch (err) {
      this.logger.error("Unhandled error in HandleWhatsAppWebhookUseCase", {
        error: err instanceof Error ? err.message : String(err),
      });
      return right({ ignored: true });
    }
  }
}
