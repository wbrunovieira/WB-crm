import { Entity } from "@/core/entity";
import { UniqueEntityID } from "@/core/unique-entity-id";

export type SendStatus = "PENDING" | "RUNNING" | "DONE" | "FAILED" | "OPTED_OUT";

export interface CampaignSendProps {
  campaignId: string;
  phone: string;       // E.164 sem "+"
  leadId?: string;
  status: SendStatus;
  currentStep: number;
  scheduledAt?: Date;
  startedAt?: Date;
  finishedAt?: Date;
  errorMessage?: string;
}

export class CampaignSend extends Entity<CampaignSendProps> {
  get campaignId()   { return this.props.campaignId; }
  get phone()        { return this.props.phone; }
  get leadId()       { return this.props.leadId; }
  get status()       { return this.props.status; }
  get currentStep()  { return this.props.currentStep; }
  get scheduledAt()  { return this.props.scheduledAt; }
  get startedAt()    { return this.props.startedAt; }
  get finishedAt()   { return this.props.finishedAt; }
  get errorMessage() { return this.props.errorMessage; }

  markRunning() {
    this.props.status = "RUNNING";
    this.props.startedAt = new Date();
  }

  advanceStep(scheduledAt?: Date) {
    this.props.currentStep++;
    this.props.scheduledAt = scheduledAt;
  }

  markDone() {
    this.props.status = "DONE";
    this.props.finishedAt = new Date();
  }

  markFailed(message: string) {
    this.props.status = "FAILED";
    this.props.errorMessage = message;
    this.props.finishedAt = new Date();
  }

  static create(
    props: Omit<CampaignSendProps, "status" | "currentStep"> & Partial<Pick<CampaignSendProps, "status" | "currentStep">>,
    id?: UniqueEntityID
  ): CampaignSend {
    return new CampaignSend(
      { status: "PENDING", currentStep: 0, ...props },
      id
    );
  }
}
