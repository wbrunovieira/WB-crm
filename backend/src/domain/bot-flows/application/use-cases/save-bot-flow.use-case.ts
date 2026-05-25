import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { BotFlowsRepository } from "../repositories/bot-flows.repository";
import { BotFlowNode, NodeType, NodeConfig } from "../../enterprise/entities/bot-flow-node.entity";
import { BotFlowEdge, ConditionType } from "../../enterprise/entities/bot-flow-edge.entity";
import { UniqueEntityID } from "@/core/unique-entity-id";

interface NodeInput {
  id: string;
  nodeType: NodeType;
  posX: number;
  posY: number;
  config: NodeConfig;
}

interface EdgeInput {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  conditionType?: ConditionType;
  conditionValue?: string;
  label?: string;
}

interface Input {
  flowId: string;
  ownerId: string;
  nodes: NodeInput[];
  edges: EdgeInput[];
  name?: string;
  description?: string;
  triggerType?: string;
  triggerValue?: string;
}

@Injectable()
export class SaveBotFlowUseCase {
  constructor(private readonly flows: BotFlowsRepository) {}

  async execute({ flowId, ownerId, nodes, edges, name, description, triggerType, triggerValue }: Input): Promise<Either<Error, void>> {
    const flow = await this.flows.findById(flowId);
    if (!flow) return left(new Error("Flow not found"));
    if (flow.ownerId !== ownerId) return left(new Error("Unauthorized"));

    const domainNodes = nodes.map(n =>
      BotFlowNode.create(
        { flowId, nodeType: n.nodeType, posX: n.posX, posY: n.posY, config: n.config },
        new UniqueEntityID(n.id),
      ),
    );
    const domainEdges = edges.map(e =>
      BotFlowEdge.create(
        { flowId, sourceNodeId: e.sourceNodeId, targetNodeId: e.targetNodeId, conditionType: e.conditionType, conditionValue: e.conditionValue, label: e.label },
        new UniqueEntityID(e.id),
      ),
    );

    flow.setFlow(domainNodes, domainEdges);
    if (name) (flow as any).props.name = name;
    if (description !== undefined) (flow as any).props.description = description;
    if (triggerType) (flow as any).props.triggerType = triggerType;
    if (triggerValue !== undefined) (flow as any).props.triggerValue = triggerValue;

    await this.flows.save(flow);
    return right(undefined);
  }
}
