import { AggregateRoot } from "@/core/aggregate-root";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { BotFlowNode } from "./bot-flow-node.entity";
import { BotFlowEdge } from "./bot-flow-edge.entity";

export type TriggerType = "KEYWORD" | "ALL" | "CAMPAIGN_REPLY";

export interface BotFlowProps {
  ownerId: string;
  instanceName: string;
  name: string;
  description?: string;
  isActive: boolean;
  triggerType: TriggerType;
  triggerValue?: string;
  nodes: BotFlowNode[];
  edges: BotFlowEdge[];
  createdAt: Date;
  updatedAt: Date;
}

export class BotFlow extends AggregateRoot<BotFlowProps> {
  get ownerId()      { return this.props.ownerId; }
  get instanceName() { return this.props.instanceName; }
  get name()         { return this.props.name; }
  get description()  { return this.props.description; }
  get isActive()     { return this.props.isActive; }
  get triggerType()  { return this.props.triggerType; }
  get triggerValue() { return this.props.triggerValue; }
  get nodes()        { return this.props.nodes; }
  get edges()        { return this.props.edges; }
  get createdAt()    { return this.props.createdAt; }
  get updatedAt()    { return this.props.updatedAt; }

  activate()   { this.props.isActive = true;  this.props.updatedAt = new Date(); }
  deactivate() { this.props.isActive = false; this.props.updatedAt = new Date(); }

  matchesTrigger(text: string): boolean {
    if (!this.props.isActive) return false;
    switch (this.props.triggerType) {
      case "ALL": return true;
      case "KEYWORD": return text.trim().toLowerCase() === (this.props.triggerValue ?? "").toLowerCase();
      default: return false;
    }
  }

  getStartNode(): BotFlowNode | undefined {
    return this.props.nodes.find((n) => n.nodeType === "START");
  }

  getOutEdges(nodeId: string): BotFlowEdge[] {
    return this.props.edges.filter((e) => e.sourceNodeId === nodeId);
  }

  getNode(nodeId: string): BotFlowNode | undefined {
    return this.props.nodes.find((n) => n.id.toString() === nodeId);
  }

  setFlow(nodes: BotFlowNode[], edges: BotFlowEdge[]) {
    this.props.nodes = nodes;
    this.props.edges = edges;
    this.props.updatedAt = new Date();
  }

  static create(
    props: Pick<BotFlowProps, "ownerId" | "instanceName" | "name"> & Partial<BotFlowProps>,
    id?: UniqueEntityID,
  ): BotFlow {
    const now = new Date();
    return new BotFlow({
      isActive: false,
      triggerType: "KEYWORD",
      nodes: [],
      edges: [],
      createdAt: now,
      updatedAt: now,
      ...props,
    }, id);
  }
}
