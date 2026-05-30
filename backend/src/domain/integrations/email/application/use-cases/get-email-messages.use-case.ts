import { Injectable } from "@nestjs/common";
import { EmailMessagesRepository, type EmailMessage } from "../repositories/email-messages.repository";

@Injectable()
export class GetEmailMessagesUseCase {
  constructor(private readonly repo: EmailMessagesRepository) {}

  async execute(ownerId: string): Promise<EmailMessage[]> {
    return this.repo.findByOwnerId(ownerId);
  }
}
