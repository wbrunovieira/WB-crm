import { Injectable, Logger } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { EvolutionApiPort } from "../ports/evolution-api.port";

export interface SendWhatsAppMediaInput {
  to: string;
  mediatype: string;
  mediaBase64: string;
  fileName: string;
  mimetype: string;
  caption?: string;
}

export interface SendWhatsAppMediaOutput {
  messageId: string;
}

@Injectable()
export class SendWhatsAppMediaUseCase {
  private readonly logger = new Logger(SendWhatsAppMediaUseCase.name);

  constructor(private readonly evolutionApi: EvolutionApiPort) {}

  async execute(input: SendWhatsAppMediaInput): Promise<Either<Error, SendWhatsAppMediaOutput>> {
    try {
      const result = await this.evolutionApi.sendMedia({
        to: input.to,
        mediatype: input.mediatype,
        media: input.mediaBase64,
        caption: input.caption,
        fileName: input.fileName,
        mimetype: input.mimetype,
      });
      return right({ messageId: result.messageId });
    } catch (err) {
      this.logger.error("Error sending WhatsApp media", { error: err });
      return left(err instanceof Error ? err : new Error(String(err)));
    }
  }
}
