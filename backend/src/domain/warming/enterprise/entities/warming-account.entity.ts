import { Entity } from "@/core/entity";
import { UniqueEntityID } from "@/core/unique-entity-id";

export type WarmingPhase = "ramping" | "maintenance";

interface WarmingAccountProps {
  email: string;
  isActive: boolean;
  phase: WarmingPhase;
  startedAt: Date;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export class WarmingAccount extends Entity<WarmingAccountProps> {
  get email() { return this.props.email; }
  get isActive() { return this.props.isActive; }
  get phase() { return this.props.phase; }
  get startedAt() { return this.props.startedAt; }
  get ownerId() { return this.props.ownerId; }
  get createdAt() { return this.props.createdAt; }
  get updatedAt() { return this.props.updatedAt; }

  get daysSinceStart(): number {
    const ms = Date.now() - this.props.startedAt.getTime();
    return Math.floor(ms / (1000 * 60 * 60 * 24));
  }

  get shouldPromoteToMaintenance(): boolean {
    return this.props.phase === "ramping" && this.daysSinceStart >= 56;
  }

  get dailyVolume(): number {
    const day = this.daysSinceStart;
    if (this.props.phase === "maintenance") return 15;
    if (day < 14) return 10;
    if (day < 28) return 20;
    if (day < 42) return 40;
    return 80;
  }

  activate() {
    this.props.isActive = true;
    this.props.updatedAt = new Date();
  }

  deactivate() {
    this.props.isActive = false;
    this.props.updatedAt = new Date();
  }

  setMaintenance() {
    this.props.phase = "maintenance";
    this.props.updatedAt = new Date();
  }

  static create(props: Omit<WarmingAccountProps, "createdAt" | "updatedAt">, id?: UniqueEntityID) {
    return new WarmingAccount(
      { ...props, createdAt: new Date(), updatedAt: new Date() },
      id,
    );
  }

  static reconstitute(props: WarmingAccountProps, id: UniqueEntityID) {
    return new WarmingAccount(props, id);
  }
}
