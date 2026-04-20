import { AggregateRoot } from "@/core/aggregate-root";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { Either, left, right } from "@/core/either";
import { CadenceName } from "../value-objects/cadence-name.vo";
import { CadenceSlug } from "../value-objects/cadence-slug.vo";
import { CadenceStatus } from "../value-objects/cadence-status.vo";

export interface CadenceProps {
  name: CadenceName;
  slug: CadenceSlug;
  description?: string;
  objective?: string;
  durationDays: number;
  icpId?: string;
  status: CadenceStatus;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export class CadenceDurationError extends Error { name = "CadenceDurationError"; }

export class Cadence extends AggregateRoot<CadenceProps> {
  get name(): string { return this.props.name.value; }
  get slug(): string { return this.props.slug.value; }
  get description(): string | undefined { return this.props.description; }
  get objective(): string | undefined { return this.props.objective; }
  get durationDays(): number { return this.props.durationDays; }
  get icpId(): string | undefined { return this.props.icpId; }
  get status(): string { return this.props.status.value; }
  get ownerId(): string { return this.props.ownerId; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  get isPublished(): boolean { return this.props.status.value === "active"; }

  static create(data: {
    name: string;
    slug?: string;
    description?: string;
    objective?: string;
    durationDays?: number;
    icpId?: string;
    status?: string;
    ownerId: string;
    createdAt?: Date;
    updatedAt?: Date;
  }, id?: UniqueEntityID): Either<Error, Cadence> {
    const nameResult = CadenceName.create(data.name);
    if (nameResult.isLeft()) return left(nameResult.value);

    const slug: Either<Error, CadenceSlug> = data.slug ? CadenceSlug.create(data.slug) : right(CadenceSlug.fromName(data.name));
    if (slug.isLeft()) return left(slug.value);

    const durationDays = data.durationDays ?? 14;
    if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 365) {
      return left(new CadenceDurationError("Duração deve ser entre 1 e 365 dias"));
    }

    const statusResult: Either<Error, CadenceStatus> = data.status
      ? CadenceStatus.create(data.status)
      : right(CadenceStatus.draft());
    if (statusResult.isLeft()) return left(statusResult.value);

    const now = new Date();
    return right(new Cadence({
      name: nameResult.value as CadenceName,
      slug: slug.value as CadenceSlug,
      description: data.description,
      objective: data.objective,
      durationDays,
      icpId: data.icpId,
      status: statusResult.value as CadenceStatus,
      ownerId: data.ownerId,
      createdAt: data.createdAt ?? now,
      updatedAt: data.updatedAt ?? now,
    }, id));
  }

  update(data: { name?: string; slug?: string; description?: string; objective?: string; durationDays?: number; icpId?: string }): Either<Error, void> {
    if (data.name !== undefined) {
      const r = CadenceName.create(data.name);
      if (r.isLeft()) return left(r.value);
      this.props.name = r.value as CadenceName;
    }
    if (data.slug !== undefined) {
      const r = CadenceSlug.create(data.slug);
      if (r.isLeft()) return left(r.value);
      this.props.slug = r.value as CadenceSlug;
    }
    if (data.durationDays !== undefined) {
      if (!Number.isInteger(data.durationDays) || data.durationDays < 1 || data.durationDays > 365) {
        return left(new CadenceDurationError("Duração deve ser entre 1 e 365 dias"));
      }
      this.props.durationDays = data.durationDays;
    }
    if (data.description !== undefined) this.props.description = data.description;
    if (data.objective !== undefined) this.props.objective = data.objective;
    if (data.icpId !== undefined) this.props.icpId = data.icpId;
    this.props.updatedAt = new Date();
    return right(undefined);
  }

  publish(): Either<Error, void> {
    if (this.props.status.value === "archived") return left(new Error("Não é possível publicar uma cadência arquivada"));
    this.props.status = CadenceStatus.active();
    this.props.updatedAt = new Date();
    return right(undefined);
  }

  unpublish(): Either<Error, void> {
    this.props.status = CadenceStatus.draft();
    this.props.updatedAt = new Date();
    return right(undefined);
  }
}
