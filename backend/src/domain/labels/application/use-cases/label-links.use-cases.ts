import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { LabelsRepository } from "../repositories/labels.repository";

export class LabelNotFoundError extends Error {
  constructor() { super("Label não encontrada"); this.name = "LabelNotFoundError"; }
}
export class LabelForbiddenError extends Error {
  constructor() { super("Label não pertence a este usuário"); this.name = "LabelForbiddenError"; }
}

// ─── AddLabelToLead ─────────────────────────────────────────────────────────

export interface LabelLinkInput {
  labelId: string;
  entityId: string;
  requesterId: string;
}

@Injectable()
export class AddLabelToLeadUseCase {
  constructor(private readonly repo: LabelsRepository) {}

  async execute(input: LabelLinkInput): Promise<Either<Error, void>> {
    const label = await this.repo.findById(input.labelId);
    if (!label) return left(new LabelNotFoundError());
    if (label.ownerId !== input.requesterId) return left(new LabelForbiddenError());
    await this.repo.addToLead(input.labelId, input.entityId);
    return right(undefined);
  }
}

@Injectable()
export class RemoveLabelFromLeadUseCase {
  constructor(private readonly repo: LabelsRepository) {}

  async execute(input: LabelLinkInput): Promise<Either<Error, void>> {
    const label = await this.repo.findById(input.labelId);
    if (!label) return left(new LabelNotFoundError());
    if (label.ownerId !== input.requesterId) return left(new LabelForbiddenError());
    await this.repo.removeFromLead(input.labelId, input.entityId);
    return right(undefined);
  }
}

// ─── SetLeadLabels ───────────────────────────────────────────────────────────

export interface SetEntityLabelsInput {
  entityId: string;
  labelIds: string[];
  requesterId: string;
}

@Injectable()
export class SetLeadLabelsUseCase {
  constructor(private readonly repo: LabelsRepository) {}

  async execute(input: SetEntityLabelsInput): Promise<Either<LabelForbiddenError, void>> {
    // All labels must belong to requester
    for (const id of input.labelIds) {
      const label = await this.repo.findById(id);
      if (!label) return left(new LabelNotFoundError());
      if (label.ownerId !== input.requesterId) return left(new LabelForbiddenError());
    }
    await this.repo.setLeadLabels(input.entityId, input.labelIds);
    return right(undefined);
  }
}

// ─── AddLabelToOrganization ─────────────────────────────────────────────────

@Injectable()
export class AddLabelToOrganizationUseCase {
  constructor(private readonly repo: LabelsRepository) {}

  async execute(input: LabelLinkInput): Promise<Either<Error, void>> {
    const label = await this.repo.findById(input.labelId);
    if (!label) return left(new LabelNotFoundError());
    if (label.ownerId !== input.requesterId) return left(new LabelForbiddenError());
    await this.repo.addToOrganization(input.labelId, input.entityId);
    return right(undefined);
  }
}

@Injectable()
export class RemoveLabelFromOrganizationUseCase {
  constructor(private readonly repo: LabelsRepository) {}

  async execute(input: LabelLinkInput): Promise<Either<Error, void>> {
    const label = await this.repo.findById(input.labelId);
    if (!label) return left(new LabelNotFoundError());
    if (label.ownerId !== input.requesterId) return left(new LabelForbiddenError());
    await this.repo.removeFromOrganization(input.labelId, input.entityId);
    return right(undefined);
  }
}

@Injectable()
export class SetOrganizationLabelsUseCase {
  constructor(private readonly repo: LabelsRepository) {}

  async execute(input: SetEntityLabelsInput): Promise<Either<Error, void>> {
    for (const id of input.labelIds) {
      const label = await this.repo.findById(id);
      if (!label) return left(new LabelNotFoundError());
      if (label.ownerId !== input.requesterId) return left(new LabelForbiddenError());
    }
    await this.repo.setOrganizationLabels(input.entityId, input.labelIds);
    return right(undefined);
  }
}
