import { Injectable, Logger } from "@nestjs/common";
import { Either, right } from "@/core/either";
import { WhatsAppJid } from "@/domain/integrations/whatsapp/enterprise/value-objects/whatsapp-jid.vo";
import { WhatsAppMessageType } from "@/domain/integrations/whatsapp/enterprise/value-objects/whatsapp-message-type.vo";
import { ProcessWhatsAppMessageUseCase } from "./process-whatsapp-message.use-case";
import { ProcessWhatsAppMediaUseCase } from "./process-whatsapp-media.use-case";

export interface HandleWhatsAppWebhookInput {
  event: string;
  remoteJid: string;
  messageId?: string;
  fromMe?: boolean;
  messageType?: string;
  pushName?: string;
  text?: string;
  messageRaw?: unknown;
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
    private readonly processMedia: ProcessWhatsAppMediaUseCase,
  ) {}

  async execute(
    input: HandleWhatsAppWebhookInput,
  ): Promise<Either<never, HandleWhatsAppWebhookOutput>> {
    const {
      event, remoteJid, messageId, fromMe, messageType,
      pushName, text, messageRaw, messageTimestamp, ownerId,
    } = input;

    try {
      if (event !== "messages.upsert") {
        this.logger.debug(`Ignoring WhatsApp event: ${event}`);
        return right({ ignored: true });
      }

      if (!remoteJid) {
        this.logger.debug("Missing remoteJid — ignoring");
        return right({ ignored: true });
      }

      const jidResult = WhatsAppJid.create(remoteJid);
      if (jidResult.isLeft()) {
        this.logger.debug(`Invalid JID "${remoteJid}" — ignoring`);
        return right({ ignored: true });
      }

      const jid = jidResult.value;

      if (jid.isGroup()) {
        this.logger.debug(`Group JID ignored: ${remoteJid}`);
        return right({ ignored: true });
      }

      const resolvedMessageType = messageType ?? "conversation";

      const processResult = await this.processMessage.execute({
        messageId: messageId ?? `fallback-${Date.now()}`,
        remoteJid,
        fromMe: fromMe ?? false,
        messageType: resolvedMessageType,
        pushName,
        text,
        messageTimestamp: messageTimestamp ?? Math.floor(Date.now() / 1000),
        ownerId,
      });

      // Trigger media processing for downloadable types (fire-and-forget)
      if (processResult.isRight() && processResult.value.whatsAppMessageId) {
        const typeResult = WhatsAppMessageType.create(resolvedMessageType);
        if (typeResult.isRight() && typeResult.value.isDownloadable()) {
          const waMessageId = processResult.value.whatsAppMessageId;
          const phone = remoteJid.split("@")[0];
          const entityName = pushName ?? phone;

          this.processMedia.execute({
            whatsAppMessageId: waMessageId,
            messageData: {
              key: {
                id: messageId ?? `fallback-${Date.now()}`,
                fromMe: fromMe ?? false,
                remoteJid,
              },
              message: messageRaw ?? null,
              messageType: resolvedMessageType,
            },
            entityName,
            senderName: pushName ?? phone,
          }).catch((err: unknown) => {
            this.logger.warn("WhatsApp media processing failed (fire-and-forget)", {
              whatsAppMessageId: waMessageId,
              error: err instanceof Error ? err.message : String(err),
            });
          });
        }
      }

      return right({ processed: true });
    } catch (err) {
      this.logger.error("Unhandled error in HandleWhatsAppWebhookUseCase", {
        error: err instanceof Error ? err.message : String(err),
      });
      return right({ ignored: true });
    }
  }
}
