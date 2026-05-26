import { Entity } from "@/core/entity";
import { UniqueEntityID } from "@/core/unique-entity-id";

interface EmailCampaignSendProps {
  recipientId: string;
  stepId: string;
  sentAt: Date;
  openedAt?: Date;
  openCount: number;
  clickedAt?: Date;
  clickedUrl?: string;
  clickData: Record<string, number>; // url → click count
  gmailMessageId?: string;
  gmailThreadId?: string;
}

export class EmailCampaignSend extends Entity<EmailCampaignSendProps> {
  get recipientId()    { return this.props.recipientId; }
  get stepId()         { return this.props.stepId; }
  get sentAt()         { return this.props.sentAt; }
  get openedAt()       { return this.props.openedAt; }
  get openCount()      { return this.props.openCount; }
  get clickedAt()      { return this.props.clickedAt; }
  get clickedUrl()     { return this.props.clickedUrl; }
  get clickData()      { return this.props.clickData; }
  get gmailMessageId() { return this.props.gmailMessageId; }
  get gmailThreadId()  { return this.props.gmailThreadId; }

  markOpened() {
    if (!this.props.openedAt) this.props.openedAt = new Date();
    this.props.openCount += 1;
  }

  markClicked(url?: string) {
    if (!this.props.clickedAt) this.props.clickedAt = new Date();
    if (!this.props.openedAt) this.props.openedAt = new Date();
    if (url) {
      if (!this.props.clickedUrl) this.props.clickedUrl = url;
      this.props.clickData[url] = (this.props.clickData[url] ?? 0) + 1;
    }
  }

  static create(props: Omit<EmailCampaignSendProps, "sentAt" | "openCount" | "clickData">, id?: UniqueEntityID) {
    return new EmailCampaignSend({ ...props, sentAt: new Date(), openCount: 0, clickData: {} }, id);
  }

  static reconstitute(props: Omit<EmailCampaignSendProps, "openCount" | "clickData"> & { openCount?: number; clickData?: Record<string, number> }, id: UniqueEntityID) {
    return new EmailCampaignSend({ ...props, openCount: props.openCount ?? 0, clickData: props.clickData ?? {} }, id);
  }
}
