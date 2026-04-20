import { AggregateRoot } from "@/core/aggregate-root";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { Either, left, right } from "@/core/either";
import { SectorName, InvalidSectorNameError } from "../value-objects/sector-name.vo";
import { SectorSlug, InvalidSectorSlugError } from "../value-objects/sector-slug.vo";

interface SectorProps {
  name: SectorName;
  slug: SectorSlug;
  description?: string;
  marketSize?: string;
  marketSizeNotes?: string;
  averageTicket?: string;
  budgetSeason?: string;
  salesCycleDays?: number;
  salesCycleNotes?: string;
  decisionMakers?: string;
  buyingProcess?: string;
  mainObjections?: string;
  mainPains?: string;
  referenceCompanies?: string;
  competitorsLandscape?: string;
  jargons?: string;
  regulatoryNotes?: string;
  isActive: boolean;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateSectorProps = Omit<SectorProps, "name" | "slug" | "createdAt" | "updatedAt"> & {
  name: SectorName;
  slug: SectorSlug;
  createdAt?: Date;
  updatedAt?: Date;
};

export type UpdateSectorInput = {
  name?: string;
  slug?: string;
  description?: string;
  isActive?: boolean;
  marketSize?: string;
  salesCycleDays?: number;
  [key: string]: unknown;
};

export class Sector extends AggregateRoot<SectorProps> {
  get name(): string { return this.props.name.toString(); }
  get slug(): string { return this.props.slug.toString(); }
  get description(): string | undefined { return this.props.description; }
  get isActive(): boolean { return this.props.isActive; }
  get ownerId(): string { return this.props.ownerId; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }
  get marketSize(): string | undefined { return this.props.marketSize; }
  get salesCycleDays(): number | undefined { return this.props.salesCycleDays; }
  get allProps(): SectorProps { return this.props; }

  update(data: UpdateSectorInput): Either<InvalidSectorNameError | InvalidSectorSlugError, void> {
    if (data.name !== undefined) {
      const r = SectorName.create(data.name);
      if (r.isLeft()) return left(r.value);
      this.props.name = r.value;
    }
    if (data.slug !== undefined) {
      const r = SectorSlug.create(data.slug);
      if (r.isLeft()) return left(r.value);
      this.props.slug = r.value;
    }
    if (data.description !== undefined) this.props.description = data.description;
    if (data.isActive !== undefined) this.props.isActive = data.isActive;
    if (data.marketSize !== undefined) this.props.marketSize = data.marketSize;
    if (data.salesCycleDays !== undefined) this.props.salesCycleDays = data.salesCycleDays;
    this.props.updatedAt = new Date();
    return right(undefined);
  }

  static create(props: CreateSectorProps, id?: UniqueEntityID): Sector {
    const now = new Date();
    return new Sector({ ...props, createdAt: props.createdAt ?? now, updatedAt: props.updatedAt ?? now }, id);
  }
}
