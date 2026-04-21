export interface WhatsAppVerificationData {
  whatsappVerified: boolean;
  whatsappVerifiedAt: Date;
  whatsappVerifiedNumber: string;
}

export abstract class WhatsAppEntityRepository {
  abstract updateLeadVerification(leadId: string, ownerId: string, data: WhatsAppVerificationData): Promise<boolean>;
  abstract updateContactVerification(contactId: string, ownerId: string, data: WhatsAppVerificationData): Promise<boolean>;
  abstract updateLeadNumber(leadId: string, ownerId: string, whatsapp: string): Promise<boolean>;
  abstract updateContactNumber(contactId: string, ownerId: string, whatsapp: string): Promise<boolean>;
}
