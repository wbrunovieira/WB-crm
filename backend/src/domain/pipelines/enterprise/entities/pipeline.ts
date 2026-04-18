import { AggregateRoot } from "@/core/aggregate-root";
import { UniqueEntityID } from "@/core/unique-entity-id";

export interface PipelineProps {
  name: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class Pipeline extends AggregateRoot<PipelineProps> {
  get name()      { return this.props.name; }
  get isDefault() { return this.props.isDefault; }
  get createdAt() { return this.props.createdAt; }
  get updatedAt() { return this.props.updatedAt; }

  private touch() { this.props.updatedAt = new Date(); }

  update(data: Partial<Pick<PipelineProps, "name" | "isDefault">>) {
    Object.assign(this.props, data);
    this.touch();
  }

  setDefault(value: boolean) {
    this.props.isDefault = value;
    this.touch();
  }

  static create(
    props: Omit<PipelineProps, "createdAt" | "updatedAt"> & Partial<Pick<PipelineProps, "createdAt" | "updatedAt">>,
    id?: UniqueEntityID,
  ): Pipeline {
    const now = new Date();
    return new Pipeline({ createdAt: now, updatedAt: now, ...props }, id);
  }
}
