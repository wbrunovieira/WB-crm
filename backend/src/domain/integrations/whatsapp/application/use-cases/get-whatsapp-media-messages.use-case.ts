import { Injectable } from "@nestjs/common";
import { Either, right } from "@/core/either";
import { WhatsAppMessagesRepository, WhatsAppMessageData } from "../repositories/whatsapp-messages.repository";

@Injectable()
export class GetWhatsAppMediaMessagesUseCase {
  constructor(private readonly repo: WhatsAppMessagesRepository) {}

  async execute(activityId: string): Promise<Either<never, { messages: WhatsAppMessageData[] }>> {
    const messages = await this.repo.findMediaByActivityId(activityId);
    return right({ messages });
  }
}
