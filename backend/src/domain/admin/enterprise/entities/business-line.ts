import { AggregateRoot } from "@/core/aggregate-root";
import { UniqueEntityID } from "@/core/unique-entity-id";

export interface BusinessLineProps {
  name: string;
  slug: string;
  description?: string;
  color?: string;
  icon?: string;
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export class BusinessLine extends AggregateRoot<BusinessLineProps> {
  get name()        { return this.props.name; }
  get slug()        { return this.props.slug; }
  get description() { return this.props.description; }
  get color()       { return this.props.color; }
  get icon()        { return this.props.icon; }
  get isActive()    { return this.props.isActive; }
  get order()       { return this.props.order; }
  get createdAt()   { return this.props.createdAt; }
  get updatedAt()   { return this.props.updatedAt; }

  private touch() { this.props.updatedAt = new Date(); }

  update(data: Partial<Pick<BusinessLineProps, "name" | "slug" | "description" | "color" | "icon" | "order">>) {
    Object.assign(this.props, data);
    this.touch();
  }

  toggleActive() {
    this.props.isActive = !this.props.isActive;
    this.touch();
  }

  static create(
    props: Omit<BusinessLineProps, "createdAt" | "updatedAt"> & Partial<Pick<BusinessLineProps, "createdAt" | "updatedAt">>,
    id?: UniqueEntityID,
  ): BusinessLine {
    const now = new Date();
    return new BusinessLine({ createdAt: now, updatedAt: now, ...props }, id);
  }
}
