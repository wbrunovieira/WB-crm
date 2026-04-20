import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { Label } from "../../enterprise/entities/label";
import { LabelName } from "../../enterprise/value-objects/label-name.vo";
import { HexColor } from "../../enterprise/value-objects/hex-color.vo";
import { LabelsRepository } from "../repositories/labels.repository";

// ─── Errors ────────────────────────────────────────────────────────────────

export class LabelNotFoundError extends Error {
  constructor() { super("Label não encontrada"); this.name = "LabelNotFoundError"; }
}
export class DuplicateLabelError extends Error {
  constructor() { super("Já existe uma label com esse nome"); this.name = "DuplicateLabelError"; }
}

// ─── GetLabels ──────────────────────────────────────────────────────────────

@Injectable()
export class GetLabelsUseCase {
  constructor(private readonly repo: LabelsRepository) {}

  async execute(ownerId: string): Promise<Either<never, { labels: Label[] }>> {
    const labels = await this.repo.findByOwner(ownerId);
    return right({ labels });
  }
}

// ─── CreateLabel ────────────────────────────────────────────────────────────

export interface CreateLabelInput {
  name: string;
  color: string;
  ownerId: string;
}

@Injectable()
export class CreateLabelUseCase {
  constructor(private readonly repo: LabelsRepository) {}

  async execute(input: CreateLabelInput): Promise<Either<Error, { label: Label }>> {
    const nameOrError = LabelName.create(input.name);
    if (nameOrError.isLeft()) return left(nameOrError.value);

    const colorOrError = HexColor.create(input.color);
    if (colorOrError.isLeft()) return left(colorOrError.value);

    const exists = await this.repo.existsByNameAndOwner(nameOrError.value.toString(), input.ownerId);
    if (exists) return left(new DuplicateLabelError());

    const label = Label.create({ name: nameOrError.value, color: colorOrError.value, ownerId: input.ownerId });
    await this.repo.save(label);
    return right({ label });
  }
}

// ─── UpdateLabel ────────────────────────────────────────────────────────────

export interface UpdateLabelInput {
  id: string;
  name?: string;
  color?: string;
  requesterId: string;
}

@Injectable()
export class UpdateLabelUseCase {
  constructor(private readonly repo: LabelsRepository) {}

  async execute(input: UpdateLabelInput): Promise<Either<Error, { label: Label }>> {
    const label = await this.repo.findById(input.id);
    if (!label) return left(new LabelNotFoundError());
    if (label.ownerId !== input.requesterId) return left(new LabelNotFoundError());

    if (input.name !== undefined) {
      const exists = await this.repo.existsByNameAndOwner(input.name.trim(), input.requesterId);
      if (exists && input.name.trim() !== label.name) return left(new DuplicateLabelError());
    }

    const result = label.update({ name: input.name, color: input.color });
    if (result.isLeft()) return left(result.value);

    await this.repo.save(label);
    return right({ label });
  }
}

// ─── DeleteLabel ────────────────────────────────────────────────────────────

export interface DeleteLabelInput {
  id: string;
  requesterId: string;
}

@Injectable()
export class DeleteLabelUseCase {
  constructor(private readonly repo: LabelsRepository) {}

  async execute(input: DeleteLabelInput): Promise<Either<LabelNotFoundError, void>> {
    const label = await this.repo.findById(input.id);
    if (!label) return left(new LabelNotFoundError());
    if (label.ownerId !== input.requesterId) return left(new LabelNotFoundError());

    await this.repo.delete(input.id);
    return right(undefined);
  }
}
