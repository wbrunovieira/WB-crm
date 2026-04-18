import { AggregateRoot } from "@/core/aggregate-root";
import { UniqueEntityID } from "@/core/unique-entity-id";

export interface DealProps {
  ownerId: string;
  title: string;
  description?: string;
  value: number;
  currency: string;
  status: "open" | "won" | "lost";
  closedAt?: Date;
  stageId: string;
  contactId?: string;
  organizationId?: string;
  expectedCloseDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class Deal extends AggregateRoot<DealProps> {
  get ownerId()           { return this.props.ownerId; }
  get title()             { return this.props.title; }
  get description()       { return this.props.description; }
  get value()             { return this.props.value; }
  get currency()          { return this.props.currency; }
  get status()            { return this.props.status; }
  get closedAt()          { return this.props.closedAt; }
  get stageId()           { return this.props.stageId; }
  get contactId()         { return this.props.contactId; }
  get organizationId()    { return this.props.organizationId; }
  get expectedCloseDate() { return this.props.expectedCloseDate; }
  get createdAt()         { return this.props.createdAt; }
  get updatedAt()         { return this.props.updatedAt; }

  private touch() { this.props.updatedAt = new Date(); }

  update(data: Partial<Omit<DealProps, "ownerId" | "createdAt" | "updatedAt">>) {
    Object.assign(this.props, data);
    this.touch();
  }

  changeStage(stageId: string, probability: number) {
    this.props.stageId = stageId;

    if (probability === 0) {
      this.props.status = "lost";
      this.props.closedAt = new Date();
    } else if (probability === 100) {
      this.props.status = "won";
      this.props.closedAt = new Date();
    } else {
      this.props.status = "open";
      this.props.closedAt = undefined;
    }

    this.touch();
  }

  static create(
    props: Omit<DealProps, "createdAt" | "updatedAt"> & Partial<Pick<DealProps, "createdAt" | "updatedAt">>,
    id?: UniqueEntityID,
  ): Deal {
    const now = new Date();
    return new Deal(
      {
        createdAt: now,
        updatedAt: now,
        ...props,
      },
      id,
    );
  }
}
