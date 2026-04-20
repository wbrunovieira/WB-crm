import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { DisqualificationReason } from "../../enterprise/entities/disqualification-reason";
import { DisqualificationReasonsRepository } from "../repositories/disqualification-reasons.repository";

export class ReasonNotFoundError extends Error { name = "ReasonNotFoundError"; }
export class ReasonForbiddenError extends Error { name = "ReasonForbiddenError"; }
export class ReasonConflictError extends Error { name = "ReasonConflictError"; }

@Injectable()
export class GetDisqualificationReasonsUseCase {
  constructor(private readonly repo: DisqualificationReasonsRepository) {}

  async execute(input: { requesterId: string }): Promise<Either<Error, DisqualificationReason[]>> {
    return right(await this.repo.findByOwner(input.requesterId));
  }
}

@Injectable()
export class CreateDisqualificationReasonUseCase {
  constructor(private readonly repo: DisqualificationReasonsRepository) {}

  async execute(input: { name: string; ownerId: string }): Promise<Either<Error, DisqualificationReason>> {
    const result = DisqualificationReason.create({ name: input.name, ownerId: input.ownerId });
    if (result.isLeft()) return left(result.value);
    const reason = result.value as DisqualificationReason;

    const exists = await this.repo.existsByNameAndOwner(reason.name, input.ownerId);
    if (exists) return left(new ReasonConflictError(`Motivo '${reason.name}' já existe`));

    await this.repo.save(reason);
    return right(reason);
  }
}

@Injectable()
export class DeleteDisqualificationReasonUseCase {
  constructor(private readonly repo: DisqualificationReasonsRepository) {}

  async execute(input: { id: string; requesterId: string; requesterRole: string }): Promise<Either<Error, void>> {
    const reason = await this.repo.findById(input.id);
    if (!reason) return left(new ReasonNotFoundError("Motivo não encontrado"));
    if (input.requesterRole !== "admin" && reason.ownerId !== input.requesterId) {
      return left(new ReasonForbiddenError("Acesso negado"));
    }
    await this.repo.delete(input.id);
    return right(undefined);
  }
}
