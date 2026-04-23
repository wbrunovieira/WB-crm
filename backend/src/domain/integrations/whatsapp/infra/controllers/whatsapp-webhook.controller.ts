import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { HandleWhatsAppWebhookUseCase } from "@/domain/integrations/whatsapp/application/use-cases/handle-whatsapp-webhook.use-case";

interface EvolutionWebhookPayload {
  event?: string;
  instance?: string;
  data?: {
    key?: {
      id?: string;
      fromMe?: boolean;
      remoteJid?: string;
    };
    pushName?: string;
    message?: Record<string, unknown>;
    messageType?: string;
    messageTimestamp?: number;
    messageStubType?: number;
    messageStubParameters?: string[];
    broadcast?: boolean;
  };
}

function extractText(data: EvolutionWebhookPayload["data"]): string | undefined {
  if (!data?.message) return undefined;
  const msg = data.message;
  return (
    (msg["conversation"] as string | undefined) ??
    ((msg["extendedTextMessage"] as { text?: string } | undefined)?.text) ??
    undefined
  );
}

function extractMediaLabel(data: EvolutionWebhookPayload["data"]): string | undefined {
  if (!data?.message) return undefined;
  const msg = data.message;
  const mediaKeys = ["imageMessage", "videoMessage", "audioMessage", "documentMessage", "stickerMessage"];
  for (const key of mediaKeys) {
    const media = msg[key] as { caption?: string; fileName?: string } | undefined;
    if (media) return media.caption ?? media.fileName ?? undefined;
  }
  return undefined;
}

@ApiTags("Webhooks")
@Controller("webhooks/whatsapp")
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name);

  constructor(
    private readonly handleWebhook: HandleWhatsAppWebhookUseCase,
  ) {}

  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: "Evolution API WhatsApp webhook (public) — validates X-Webhook-Secret header" })
  async handleWebhookPost(
    @Headers("x-webhook-secret") secret: string | undefined,
    @Body() body: EvolutionWebhookPayload | undefined,
  ): Promise<{ ok: boolean }> {
    // 1. Validate secret (optional — if env var not set, accept all)
    const expectedSecret = process.env.EVOLUTION_WEBHOOK_SECRET;
    if (expectedSecret && secret !== expectedSecret) {
      this.logger.warn("WhatsApp webhook: invalid X-Webhook-Secret");
      throw new UnauthorizedException("Invalid webhook secret");
    }
    if (!expectedSecret) {
      this.logger.debug("EVOLUTION_WEBHOOK_SECRET not configured — accepting webhook without validation");
    }

    // 2. Forward to n8n in background (fire-and-forget)
    const n8nUrl = process.env.EVOLUTION_N8N_FORWARD_URL;
    if (n8nUrl && body) {
      fetch(n8nUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).catch((err: unknown) => {
        this.logger.warn("Failed to forward to n8n", {
          error: err instanceof Error ? err.message : String(err),
        });
      });
    }

    // 3. Get owner from env
    const ownerId = process.env.EVOLUTION_DEFAULT_OWNER_ID ?? "";

    // 4. Extract fields from payload
    const event = body?.event ?? "";
    const remoteJid = body?.data?.key?.remoteJid ?? "";
    const messageId = body?.data?.key?.id;
    const fromMe = body?.data?.key?.fromMe ?? false;
    const messageType = body?.data?.messageType;
    const pushName = body?.data?.pushName;
    const text = extractText(body?.data);
    const mediaLabel = extractMediaLabel(body?.data);
    const messageTimestamp = body?.data?.messageTimestamp;

    // 5. Delegate — never returns error
    try {
      await this.handleWebhook.execute({
        event,
        remoteJid,
        messageId,
        fromMe,
        messageType,
        pushName,
        text: text ?? mediaLabel,
        messageTimestamp,
        ownerId,
      });
    } catch (err) {
      this.logger.error("WhatsApp webhook unhandled error", {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return { ok: true };
  }
}
