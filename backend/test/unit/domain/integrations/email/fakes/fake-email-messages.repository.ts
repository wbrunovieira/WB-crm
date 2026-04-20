import {
  EmailMessagesRepository,
  EmailMessage,
} from "@/domain/integrations/email/application/repositories/email-messages.repository";

export class FakeEmailMessagesRepository extends EmailMessagesRepository {
  public items: EmailMessage[] = [];

  async findByMessageId(messageId: string): Promise<EmailMessage | null> {
    return this.items.find((m) => m.gmailMessageId === messageId) ?? null;
  }

  async save(message: EmailMessage): Promise<void> {
    const idx = this.items.findIndex((m) => m.id === message.id);
    if (idx >= 0) {
      this.items[idx] = { ...message };
    } else {
      this.items.push({ ...message });
    }
  }

  async findPendingTranscriptions(): Promise<EmailMessage[]> {
    return [];
  }

  async update(message: EmailMessage): Promise<void> {
    const idx = this.items.findIndex((m) => m.id === message.id);
    if (idx >= 0) {
      this.items[idx] = { ...message };
    }
  }

  async findByOwnerId(ownerId: string): Promise<EmailMessage[]> {
    return this.items.filter((m) => m.ownerId === ownerId);
  }
}
