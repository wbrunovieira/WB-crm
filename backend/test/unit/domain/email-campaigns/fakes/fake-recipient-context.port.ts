import { RecipientContextPort, RecipientContext } from "@/domain/email-campaigns/application/ports/recipient-context.port";

export class FakeRecipientContextPort extends RecipientContextPort {
  private map = new Map<string, RecipientContext>();

  register(recipientType: string, recipientId: string, context: RecipientContext) {
    this.map.set(`${recipientType}:${recipientId}`, context);
  }

  async resolve(recipientType: string, recipientId: string): Promise<RecipientContext> {
    return this.map.get(`${recipientType}:${recipientId}`) ?? {};
  }
}
