import { Entity } from "@/core/entity";
import { UniqueEntityID } from "@/core/unique-entity-id";

interface WarmingSendProps {
  fromEmail: string;
  toEmail: string;
  subject: string;
  gmailMessageId: string | null;
  gmailThreadId: string | null;
  isAutoReply: boolean;
  warmingAccountId: string;
  sentAt: Date;
}

export class WarmingSend extends Entity<WarmingSendProps> {
  get fromEmail() { return this.props.fromEmail; }
  get toEmail() { return this.props.toEmail; }
  get subject() { return this.props.subject; }
  get gmailMessageId() { return this.props.gmailMessageId; }
  get gmailThreadId() { return this.props.gmailThreadId; }
  get isAutoReply() { return this.props.isAutoReply; }
  get warmingAccountId() { return this.props.warmingAccountId; }
  get sentAt() { return this.props.sentAt; }

  static create(props: Omit<WarmingSendProps, "sentAt">, id?: UniqueEntityID) {
    return new WarmingSend({ ...props, sentAt: new Date() }, id);
  }

  static reconstitute(props: WarmingSendProps, id: UniqueEntityID) {
    return new WarmingSend(props, id);
  }
}
