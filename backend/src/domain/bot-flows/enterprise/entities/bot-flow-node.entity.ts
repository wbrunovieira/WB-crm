import { Entity } from "@/core/entity";
import { UniqueEntityID } from "@/core/unique-entity-id";

export type NodeType = "START" | "SEND_MESSAGE" | "TYPING" | "WAIT_RESPONSE" | "CONDITION" | "TAG_LEAD" | "END";

export interface SendMessageConfig { type: "text" | "media" | "audio"; text?: string; mediaUrl?: string; mediaType?: string; caption?: string; }
export interface TypingConfig { seconds: number; }
export interface WaitResponseConfig { timeoutMinutes: number; }
export interface TagLeadConfig { labelName: string; }

export type NodeConfig = SendMessageConfig | TypingConfig | WaitResponseConfig | TagLeadConfig | Record<string, unknown>;

export interface BotFlowNodeProps {
  flowId: string;
  nodeType: NodeType;
  posX: number;
  posY: number;
  config: NodeConfig;
}

export class BotFlowNode extends Entity<BotFlowNodeProps> {
  get flowId()   { return this.props.flowId; }
  get nodeType() { return this.props.nodeType; }
  get posX()     { return this.props.posX; }
  get posY()     { return this.props.posY; }
  get config()   { return this.props.config; }

  static create(props: BotFlowNodeProps, id?: UniqueEntityID): BotFlowNode {
    return new BotFlowNode(props, id);
  }
}
