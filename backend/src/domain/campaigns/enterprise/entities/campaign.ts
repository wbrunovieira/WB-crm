import { AggregateRoot } from "@/core/aggregate-root";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { CampaignStartedEvent } from "../events/campaign-started.event";
import type { CampaignStep } from "./campaign-step";

export type CampaignStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "FINISHED";

export interface CampaignProps {
  ownerId: string;
  name: string;
  instanceName: string;
  description?: string;
  status: CampaignStatus;
  antiBlockConfig?: string; // JSON serializado
  steps: CampaignStep[];
  createdAt: Date;
  updatedAt: Date;
}

export class Campaign extends AggregateRoot<CampaignProps> {
  get ownerId()         { return this.props.ownerId; }
  get name()            { return this.props.name; }
  get instanceName()    { return this.props.instanceName; }
  get description()     { return this.props.description; }
  get status()          { return this.props.status; }
  get antiBlockConfig() { return this.props.antiBlockConfig; }
  get steps()           { return this.props.steps; }
  get createdAt()       { return this.props.createdAt; }
  get updatedAt()       { return this.props.updatedAt; }

  private touch() { this.props.updatedAt = new Date(); }

  start() {
    if (this.props.status !== "DRAFT" && this.props.status !== "PAUSED") return;
    this.props.status = "ACTIVE";
    this.touch();
    this.addDomainEvent(new CampaignStartedEvent(this.id));
  }

  pause() {
    if (this.props.status !== "ACTIVE") return;
    this.props.status = "PAUSED";
    this.touch();
  }

  resume() {
    if (this.props.status !== "PAUSED") return;
    this.props.status = "ACTIVE";
    this.touch();
    this.addDomainEvent(new CampaignStartedEvent(this.id));
  }

  finish() {
    this.props.status = "FINISHED";
    this.touch();
  }

  addStep(step: CampaignStep) {
    this.props.steps.push(step);
    this.touch();
  }

  static create(
    props: Pick<CampaignProps, "ownerId" | "name" | "instanceName"> & Partial<CampaignProps>,
    id?: UniqueEntityID
  ): Campaign {
    const now = new Date();
    return new Campaign(
      {
        status: "DRAFT",
        steps: [],
        createdAt: now,
        updatedAt: now,
        ...props,
      },
      id
    );
  }
}
