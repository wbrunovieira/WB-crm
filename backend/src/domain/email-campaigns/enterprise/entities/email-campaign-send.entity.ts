import { Entity } from "@/core/entity";
import { UniqueEntityID } from "@/core/unique-entity-id";

interface EmailCampaignSendProps {
  recipientId: string;
  stepId: string;
  sentAt: Date;
  openedAt?: Date;
  clickedAt?: Date;
  clickedUrl?: string;
  gmailMessageId?: string;
  gmailThreadId?: string;
}

export class EmailCampaignSend extends Entity<EmailCampaignSendProps> {
  get recipientId()    { return this.props.recipientId; }
  get stepId()         { return this.props.stepId; }
  get sentAt()         { return this.props.sentAt; }
  get openedAt()       { return this.props.openedAt; }
  get clickedAt()      { return this.props.clickedAt; }
  get clickedUrl()     { return this.props.clickedUrl; }
  get gmailMessageId() { return this.props.gmailMessageId; }
  get gmailThreadId()  { return this.props.gmailThreadId; }

  markOpened() {
    if (!this.props.openedAt) this.props.openedAt = new Date();
  }

  markClicked(url?: string) {
    if (!this.props.clickedAt) this.props.clickedAt = new Date();
    if (!this.props.openedAt) this.props.openedAt = new Date();
    if (url && !this.props.clickedUrl) this.props.clickedUrl = url;
  }

  static create(props: Omit<EmailCampaignSendProps, "sentAt">, id?: UniqueEntityID) {
    return new EmailCampaignSend({ ...props, sentAt: new Date() }, id);
  }

  static reconstitute(props: EmailCampaignSendProps, id: UniqueEntityID) {
    return new EmailCampaignSend(props, id);
  }
}
