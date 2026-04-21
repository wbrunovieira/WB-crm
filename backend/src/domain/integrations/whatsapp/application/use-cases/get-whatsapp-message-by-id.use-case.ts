import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { WhatsAppMessagesRepository, WhatsAppMessageData } from "../repositories/whatsapp-messages.repository";

export class WhatsAppMessageNotFoundError extends Error {
  constructor() { super("Mensagem não encontrada"); this.name = "WhatsAppMessageNotFoundError"; }
}

@Injectable()
export class GetWhatsAppMessageByIdUseCase {
  constructor(private readonly messages: WhatsAppMessagesRepository) {}

  async execute(id: string): Promise<Either<WhatsAppMessageNotFoundError, WhatsAppMessageData>> {
    const msg = await this.messages.findById(id);
    if (!msg) return left(new WhatsAppMessageNotFoundError());
    return right(msg);
  }
}
