import { AggregateRoot } from "@/core/aggregate-root";
import { UniqueEntityID } from "@/core/unique-entity-id";

export interface StageProps {
  name: string;
  order: number;
  pipelineId: string;
  probability: number;
  createdAt: Date;
  updatedAt: Date;
}

export class Stage extends AggregateRoot<StageProps> {
  get name()       { return this.props.name; }
  get order()      { return this.props.order; }
  get pipelineId() { return this.props.pipelineId; }
  get probability(){ return this.props.probability; }
  get createdAt()  { return this.props.createdAt; }
  get updatedAt()  { return this.props.updatedAt; }

  private touch() { this.props.updatedAt = new Date(); }

  update(data: Partial<Pick<StageProps, "name" | "order" | "probability">>) {
    Object.assign(this.props, data);
    this.touch();
  }

  static create(
    props: Omit<StageProps, "createdAt" | "updatedAt"> & Partial<Pick<StageProps, "createdAt" | "updatedAt">>,
    id?: UniqueEntityID,
  ): Stage {
    const now = new Date();
    return new Stage({ createdAt: now, updatedAt: now, ...props }, id);
  }
}
