import { Entity } from "@/core/entity";
import { UniqueEntityID } from "@/core/unique-entity-id";

interface WarmingPoolEmailProps {
  email: string;
  name: string | null;
  isActive: boolean;
  ownerId: string;
  createdAt: Date;
}

export class WarmingPoolEmail extends Entity<WarmingPoolEmailProps> {
  get email() { return this.props.email; }
  get name() { return this.props.name; }
  get isActive() { return this.props.isActive; }
  get ownerId() { return this.props.ownerId; }
  get createdAt() { return this.props.createdAt; }

  static create(props: Omit<WarmingPoolEmailProps, "createdAt">, id?: UniqueEntityID) {
    return new WarmingPoolEmail({ ...props, createdAt: new Date() }, id);
  }

  static reconstitute(props: WarmingPoolEmailProps, id: UniqueEntityID) {
    return new WarmingPoolEmail(props, id);
  }
}
