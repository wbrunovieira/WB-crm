import { Entity } from "@/core/entity";
import { UniqueEntityID } from "@/core/unique-entity-id";

export type ScheduledEmailStatus = "PENDING" | "SENT" | "CANCELLED" | "FAILED";

export interface ScheduledEmailAttachment {
  filename: string;
  mimeType: string;
  data: string; // base64
  size?: number;
}

export interface ScheduledEmailSendProps {
  ownerId: string;
  activityId: string | null;
  status: ScheduledEmailStatus;
  scheduledSendAt: Date;

  to: string;
  subject: string;
  bodyHtml: string;
  fromEmail: string | null;
  threadId: string | null;
  attachments: ScheduledEmailAttachment[];

  leadId: string | null;
  contactId: string | null; // principal — usado para cancelar ao responder
  contactIds: string[]; // todos os contatos (passados ao envio)
  organizationId: string | null;
  dealId: string | null;

  sentMessageId: string | null;
  sentThreadId: string | null;
  failReason: string | null;

  createdAt: Date;
  sentAt: Date | null;
  cancelledAt: Date | null;
}

type CreateProps = Omit<
  ScheduledEmailSendProps,
  "status" | "createdAt" | "sentAt" | "cancelledAt" | "sentMessageId" | "sentThreadId" | "failReason"
> &
  Partial<Pick<ScheduledEmailSendProps, "status" | "createdAt">>;

export class ScheduledEmailSend extends Entity<ScheduledEmailSendProps> {
  get ownerId() { return this.props.ownerId; }
  get activityId() { return this.props.activityId; }
  get status() { return this.props.status; }
  get scheduledSendAt() { return this.props.scheduledSendAt; }
  get to() { return this.props.to; }
  get subject() { return this.props.subject; }
  get bodyHtml() { return this.props.bodyHtml; }
  get fromEmail() { return this.props.fromEmail; }
  get threadId() { return this.props.threadId; }
  get attachments() { return this.props.attachments; }
  get leadId() { return this.props.leadId; }
  get contactId() { return this.props.contactId; }
  get contactIds() { return this.props.contactIds; }
  get organizationId() { return this.props.organizationId; }
  get dealId() { return this.props.dealId; }
  get sentMessageId() { return this.props.sentMessageId; }
  get sentThreadId() { return this.props.sentThreadId; }
  get failReason() { return this.props.failReason; }
  get createdAt() { return this.props.createdAt; }
  get sentAt() { return this.props.sentAt; }
  get cancelledAt() { return this.props.cancelledAt; }

  get isPending() { return this.props.status === "PENDING"; }

  linkActivity(activityId: string) {
    this.props.activityId = activityId;
  }

  markSent(messageId: string, threadId: string, at: Date = new Date()) {
    this.props.status = "SENT";
    this.props.sentMessageId = messageId;
    this.props.sentThreadId = threadId;
    this.props.sentAt = at;
    this.props.failReason = null;
  }

  markCancelled(at: Date = new Date()) {
    this.props.status = "CANCELLED";
    this.props.cancelledAt = at;
  }

  markFailed(reason: string, at: Date = new Date()) {
    this.props.status = "FAILED";
    this.props.failReason = reason;
    this.props.sentAt = at;
  }

  static create(props: CreateProps, id?: UniqueEntityID): ScheduledEmailSend {
    return new ScheduledEmailSend(
      {
        status: "PENDING",
        createdAt: new Date(),
        sentAt: null,
        cancelledAt: null,
        sentMessageId: null,
        sentThreadId: null,
        failReason: null,
        ...props,
      },
      id,
    );
  }

  /** Rebuilds an entity from persisted state (used by the Prisma mapper). */
  static fromPersistence(props: ScheduledEmailSendProps, id: UniqueEntityID): ScheduledEmailSend {
    return new ScheduledEmailSend(props, id);
  }
}
