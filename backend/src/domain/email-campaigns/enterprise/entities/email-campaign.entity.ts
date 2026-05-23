import { AggregateRoot } from "@/core/aggregate-root";
import { UniqueEntityID } from "@/core/unique-entity-id";
import type { EmailCampaignStep } from "./email-campaign-step.entity";

export type EmailCampaignStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "FINISHED";

interface EmailCampaignProps {
  name: string;
  description?: string;
  fromEmail: string;
  status: EmailCampaignStatus;
  ownerId: string;
  steps: EmailCampaignStep[];
  createdAt: Date;
  updatedAt: Date;
}

export class EmailCampaign extends AggregateRoot<EmailCampaignProps> {
  get name()        { return this.props.name; }
  get description() { return this.props.description; }
  get fromEmail()   { return this.props.fromEmail; }
  get status()      { return this.props.status; }
  get ownerId()     { return this.props.ownerId; }
  get steps()       { return this.props.steps; }
  get createdAt()   { return this.props.createdAt; }
  get updatedAt()   { return this.props.updatedAt; }

  private touch() { this.props.updatedAt = new Date(); }

  start() {
    if (this.props.status !== "DRAFT" && this.props.status !== "PAUSED") return;
    this.props.status = "ACTIVE";
    this.touch();
  }

  pause() {
    if (this.props.status !== "ACTIVE") return;
    this.props.status = "PAUSED";
    this.touch();
  }

  finish() {
    this.props.status = "FINISHED";
    this.touch();
  }

  update(data: Partial<Pick<EmailCampaignProps, "name" | "description" | "fromEmail">>) {
    if (data.name !== undefined) this.props.name = data.name;
    if (data.description !== undefined) this.props.description = data.description;
    if (data.fromEmail !== undefined) this.props.fromEmail = data.fromEmail;
    this.touch();
  }

  static create(
    props: Omit<EmailCampaignProps, "createdAt" | "updatedAt" | "steps">,
    id?: UniqueEntityID,
  ) {
    return new EmailCampaign({ ...props, steps: [], createdAt: new Date(), updatedAt: new Date() }, id);
  }

  static reconstitute(props: EmailCampaignProps, id: UniqueEntityID) {
    return new EmailCampaign(props, id);
  }
}
