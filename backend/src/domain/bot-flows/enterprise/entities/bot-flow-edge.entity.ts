import { Entity } from "@/core/entity";
import { UniqueEntityID } from "@/core/unique-entity-id";

export type ConditionType = "contains" | "exact" | "regex" | "number_range" | "default";

export interface BotFlowEdgeProps {
  flowId: string;
  sourceNodeId: string;
  targetNodeId: string;
  conditionType?: ConditionType;
  conditionValue?: string;
  label?: string;
}

export class BotFlowEdge extends Entity<BotFlowEdgeProps> {
  get flowId()         { return this.props.flowId; }
  get sourceNodeId()   { return this.props.sourceNodeId; }
  get targetNodeId()   { return this.props.targetNodeId; }
  get conditionType()  { return this.props.conditionType; }
  get conditionValue() { return this.props.conditionValue; }
  get label()          { return this.props.label; }

  matches(text: string): boolean {
    if (!this.props.conditionType || this.props.conditionType === "default") return true;
    const val = this.props.conditionValue ?? "";
    const t = text.trim().toLowerCase();
    switch (this.props.conditionType) {
      case "contains": return t.includes(val.toLowerCase());
      case "exact":    return t === val.toLowerCase();
      case "regex":    try { return new RegExp(val, "i").test(text); } catch { return false; }
      case "number_range": {
        const [min, max] = val.split("-").map(Number);
        const n = parseFloat(text.replace(",", "."));
        return !isNaN(n) && n >= min && n <= max;
      }
      default: return false;
    }
  }

  static create(props: BotFlowEdgeProps, id?: UniqueEntityID): BotFlowEdge {
    return new BotFlowEdge(props, id);
  }
}
