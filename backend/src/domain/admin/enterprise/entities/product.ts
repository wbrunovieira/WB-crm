import { AggregateRoot } from "@/core/aggregate-root";
import { UniqueEntityID } from "@/core/unique-entity-id";

export interface ProductProps {
  name: string;
  slug: string;
  description?: string;
  businessLineId: string;
  basePrice?: number;
  currency: string;
  pricingType?: string;
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export class Product extends AggregateRoot<ProductProps> {
  get name()          { return this.props.name; }
  get slug()          { return this.props.slug; }
  get description()   { return this.props.description; }
  get businessLineId(){ return this.props.businessLineId; }
  get basePrice()     { return this.props.basePrice; }
  get currency()      { return this.props.currency; }
  get pricingType()   { return this.props.pricingType; }
  get isActive()      { return this.props.isActive; }
  get order()         { return this.props.order; }
  get createdAt()     { return this.props.createdAt; }
  get updatedAt()     { return this.props.updatedAt; }

  private touch() { this.props.updatedAt = new Date(); }

  update(data: Partial<Pick<ProductProps, "name" | "slug" | "description" | "businessLineId" | "basePrice" | "currency" | "pricingType" | "order">>) {
    Object.assign(this.props, data);
    this.touch();
  }

  toggleActive() {
    this.props.isActive = !this.props.isActive;
    this.touch();
  }

  static create(
    props: Omit<ProductProps, "createdAt" | "updatedAt"> & Partial<Pick<ProductProps, "createdAt" | "updatedAt">>,
    id?: UniqueEntityID,
  ): Product {
    const now = new Date();
    return new Product({ createdAt: now, updatedAt: now, ...props }, id);
  }
}
