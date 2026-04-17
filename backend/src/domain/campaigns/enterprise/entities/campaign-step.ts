import { Entity } from "@/core/entity";
import { UniqueEntityID } from "@/core/unique-entity-id";

export type StepType = "TEXT" | "MEDIA" | "AUDIO" | "DELAY" | "TYPING";

export interface CampaignStepProps {
  campaignId: string;
  order: number;
  type: StepType;
  text?: string;
  mediaUrl?: string;
  mediaCaption?: string;
  mediaType?: string;
  delaySeconds?: number;
  typingSeconds?: number;
}

export class CampaignStep extends Entity<CampaignStepProps> {
  get campaignId() { return this.props.campaignId; }
  get order()      { return this.props.order; }
  get type()       { return this.props.type; }
  get text()       { return this.props.text; }
  get mediaUrl()   { return this.props.mediaUrl; }
  get mediaCaption(){ return this.props.mediaCaption; }
  get mediaType()  { return this.props.mediaType; }
  get delaySeconds(){ return this.props.delaySeconds; }
  get typingSeconds(){ return this.props.typingSeconds; }

  static create(props: CampaignStepProps, id?: UniqueEntityID): CampaignStep {
    return new CampaignStep(props, id);
  }
}
