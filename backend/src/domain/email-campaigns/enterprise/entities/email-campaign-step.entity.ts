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

  static create(props: EmailCampaignStepProps, id?: UniqueEntityID) {
    return new EmailCampaignStep(props, id);
  }

  static reconstitute(props: EmailCampaignStepProps, id: UniqueEntityID) {
    return new EmailCampaignStep(props, id);
  }
}
