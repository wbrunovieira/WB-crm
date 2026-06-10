import { Entity } from "@/core/entity";
import { UniqueEntityID } from "@/core/unique-entity-id";

export type SuppressionReason = "manual" | "unsubscribed" | "bounced" | "spam";

interface EmailSuppressionProps {
  email: string;
  ownerId: string;
  reason: SuppressionReason;
  createdAt: Date;
}

export class EmailSuppression extends Entity<EmailSuppressionProps> {
  get email()     { return this.props.email; }
  get ownerId()   { return this.props.ownerId; }
  get reason()    { return this.props.reason; }
  get createdAt() { return this.props.createdAt; }

  static create(props: Omit<EmailSuppressionProps, "createdAt">, id?: UniqueEntityID) {
    // Normalize so lookups by (email, ownerId) match regardless of input casing
    return new EmailSuppression({ ...props, email: props.email.trim().toLowerCase(), createdAt: new Date() }, id);
  }

  static reconstitute(props: EmailSuppressionProps, id: UniqueEntityID) {
    return new EmailSuppression(props, id);
  }
}
