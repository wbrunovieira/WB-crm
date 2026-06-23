import { Entity } from "@/core/entity";
import { UniqueEntityID } from "@/core/unique-entity-id";

interface EmailCampaignStepProps {
  campaignId: string;
  order: number;
  subject: string;
  bodyHtml: string;
  delayDays: number;
}

export class EmailCampaignStep extends Entity<EmailCampaignStepProps> {
  get campaignId() { return this.props.campaignId; }
  get order()      { return this.props.order; }
  get subject()    { return this.props.subject; }
  get bodyHtml()   { return this.props.bodyHtml; }
  get delayDays()  { return this.props.delayDays; }

  update(data: Partial<Pick<EmailCampaignStepProps, "subject" | "bodyHtml" | "delayDays" | "order">>) {
    if (data.subject !== undefined) this.props.subject = data.subject;
    if (data.bodyHtml !== undefined) this.props.bodyHtml = data.bodyHtml;
    if (data.delayDays !== undefined) this.props.delayDays = data.delayDays;
    if (data.order !== undefined) this.props.order = data.order;
    return this;
  }

  static create(props: EmailCampaignStepProps, id?: UniqueEntityID) {
    return new EmailCampaignStep(props, id);
  }

  static reconstitute(props: EmailCampaignStepProps, id: UniqueEntityID) {
    return new EmailCampaignStep(props, id);
  }
}
