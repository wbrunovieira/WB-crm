import { Entity } from "@/core/entity";
import { UniqueEntityID } from "@/core/unique-entity-id";

export type RecipientType = "LEAD" | "CONTACT";
export type RecipientStatus = "PENDING" | "ACTIVE" | "COMPLETED" | "UNSUBSCRIBED" | "BOUNCED" | "SUPPRESSED" | "DELAYED";

interface EmailCampaignRecipientProps {
  campaignId: string;
  recipientType: RecipientType;
  recipientId: string;
  email: string;
  name?: string;
  company?: string;
  role?: string;
  customVars?: Record<string, string>;
  currentStep: number;
  status: RecipientStatus;
  unsubscribedAt?: Date;
}

export class EmailCampaignRecipient extends Entity<EmailCampaignRecipientProps> {
  get campaignId()    { return this.props.campaignId; }
  get recipientType() { return this.props.recipientType; }
  get recipientId()   { return this.props.recipientId; }
  get email()         { return this.props.email; }
  get name()          { return this.props.name; }
  get company()       { return this.props.company; }
  get role()          { return this.props.role; }
  get customVars()    { return this.props.customVars ?? {}; }
  get currentStep()     { return this.props.currentStep; }
  get status()          { return this.props.status; }
  get unsubscribedAt()  { return this.props.unsubscribedAt; }

  advanceStep() {
    this.props.currentStep += 1;
  }

  markActive() {
    this.props.status = "ACTIVE";
  }

  markCompleted() {
    this.props.status = "COMPLETED";
  }

  markBounced() {
    this.props.status = "BOUNCED";
  }

  /**
   * Skipped at send time because the email is already on the suppression list
   * (e.g. a prior bounce). It was NEVER sent — distinct from BOUNCED, which
   * means we sent and the message came back. Keeps suppressed contacts out of
   * the bounce rate.
   */
  markSuppressed() {
    this.props.status = "SUPPRESSED";
  }

  /**
   * The mail server reported a TEMPORARY delay (e.g. Gmail "(Delay)", DNS SERVFAIL,
   * greylisting) and is still retrying. NOT a bounce — the message may still be
   * delivered. Surfaced separately so it neither inflates the bounce rate nor counts
   * as delivered. If delivery ultimately fails, a definitive NDR flips it to BOUNCED.
   */
  markDelayed() {
    this.props.status = "DELAYED";
  }

  unsubscribe() {
    this.props.status = "UNSUBSCRIBED";
    this.props.unsubscribedAt = new Date();
  }

  static create(props: Omit<EmailCampaignRecipientProps, "currentStep" | "status">, id?: UniqueEntityID) {
    return new EmailCampaignRecipient({ ...props, currentStep: 0, status: "PENDING" }, id);
  }

  static reconstitute(props: EmailCampaignRecipientProps, id: UniqueEntityID) {
    return new EmailCampaignRecipient(props, id);
  }
}
