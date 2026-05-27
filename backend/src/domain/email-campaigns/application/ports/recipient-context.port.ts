export interface RecipientContext {
  leadId?: string;
  organizationId?: string;
  contactId?: string;
  partnerId?: string;
}

export abstract class RecipientContextPort {
  abstract resolve(recipientType: string, recipientId: string): Promise<RecipientContext>;
}
