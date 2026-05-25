import { Entity } from "@/core/entity";
import { UniqueEntityID } from "@/core/unique-entity-id";

export type SessionStatus = "ACTIVE" | "COMPLETED" | "TIMEOUT" | "ERROR";

export interface BotFlowSessionProps {
  flowId: string;
  instanceName: string;
  phone: string;
  leadId?: string;
  currentNodeId?: string;
  status: SessionStatus;
  variables: Record<string, string>;
  waitingSince?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class BotFlowSession extends Entity<BotFlowSessionProps> {
  get flowId()        { return this.props.flowId; }
  get instanceName()  { return this.props.instanceName; }
  get phone()         { return this.props.phone; }
  get leadId()        { return this.props.leadId; }
  get currentNodeId() { return this.props.currentNodeId; }
  get status()        { return this.props.status; }
  get variables()     { return this.props.variables; }
  get waitingSince()  { return this.props.waitingSince; }
  get createdAt()     { return this.props.createdAt; }
  get updatedAt()     { return this.props.updatedAt; }

  advanceTo(nodeId: string) {
    this.props.currentNodeId = nodeId;
    this.props.waitingSince = undefined;
    this.props.updatedAt = new Date();
  }

  setWaiting() {
    this.props.waitingSince = new Date();
    this.props.updatedAt = new Date();
  }

  complete() { this.props.status = "COMPLETED"; this.props.updatedAt = new Date(); }
  timeout()  { this.props.status = "TIMEOUT";   this.props.updatedAt = new Date(); }
  error()    { this.props.status = "ERROR";      this.props.updatedAt = new Date(); }

  setVariable(key: string, value: string) {
    this.props.variables = { ...this.props.variables, [key]: value };
  }

  static create(
    props: Omit<BotFlowSessionProps, "createdAt" | "updatedAt" | "status"> & Partial<Pick<BotFlowSessionProps, "status">>,
    id?: UniqueEntityID,
  ): BotFlowSession {
    const now = new Date();
    return new BotFlowSession({ status: "ACTIVE", ...props, createdAt: now, updatedAt: now }, id);
  }
}
