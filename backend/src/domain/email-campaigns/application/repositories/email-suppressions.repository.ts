import type { EmailSuppression } from "../../enterprise/entities/email-suppression.entity";
import type { SuppressionReason } from "../../enterprise/entities/email-suppression.entity";

export abstract class EmailSuppressionsRepository {
  abstract findByEmail(email: string, ownerId: string): Promise<EmailSuppression | null>;
  abstract findAllByOwner(ownerId: string): Promise<EmailSuppression[]>;
  abstract isEmailSuppressed(email: string, ownerId: string): Promise<boolean>;
  abstract save(suppression: EmailSuppression): Promise<void>;
  abstract delete(email: string, ownerId: string): Promise<void>;
}
