import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { Proposal } from "../../enterprise/entities/proposal";
import { ProposalsRepository, ProposalFilters } from "../repositories/proposals.repository";

export class ProposalNotFoundError extends Error { name = "ProposalNotFoundError"; }
export class ProposalForbiddenError extends Error { name = "ProposalForbiddenError"; }

@Injectable()
export class GetProposalsUseCase {
  constructor(private readonly repo: ProposalsRepository) {}

  async execute(input: { requesterId: string; filters?: ProposalFilters }): Promise<Either<Error, Proposal[]>> {
    return right(await this.repo.findByOwner(input.requesterId, input.filters));
  }
}

@Injectable()
export class GetProposalByIdUseCase {
  constructor(private readonly repo: ProposalsRepository) {}

  async execute(input: { id: string; requesterId: string; requesterRole: string }): Promise<Either<Error, Proposal>> {
    const proposal = await this.repo.findById(input.id);
    if (!proposal) return left(new ProposalNotFoundError("Proposta não encontrada"));
    if (input.requesterRole !== "admin" && proposal.ownerId !== input.requesterId) {
      return left(new ProposalForbiddenError("Acesso negado"));
    }
    return right(proposal);
  }
}

@Injectable()
export class CreateProposalUseCase {
  constructor(private readonly repo: ProposalsRepository) {}

  async execute(input: {
    title: string;
    description?: string;
    status?: string;
    driveFileId?: string;
    driveUrl?: string;
    fileName?: string;
    fileSize?: number;
    leadId?: string;
    dealId?: string;
    ownerId: string;
  }): Promise<Either<Error, Proposal>> {
    const result = Proposal.create(input);
    if (result.isLeft()) return left(result.value);
    const proposal = result.value as Proposal;
    await this.repo.save(proposal);
    return right(proposal);
  }
}

@Injectable()
export class UpdateProposalUseCase {
  constructor(private readonly repo: ProposalsRepository) {}

  async execute(input: {
    id: string;
    requesterId: string;
    requesterRole: string;
    title?: string;
    description?: string;
    status?: string;
    driveFileId?: string;
    driveUrl?: string;
    fileName?: string;
    fileSize?: number;
    leadId?: string;
    dealId?: string;
  }): Promise<Either<Error, Proposal>> {
    const proposal = await this.repo.findById(input.id);
    if (!proposal) return left(new ProposalNotFoundError("Proposta não encontrada"));
    if (input.requesterRole !== "admin" && proposal.ownerId !== input.requesterId) {
      return left(new ProposalForbiddenError("Acesso negado"));
    }

    const updateResult = proposal.update(input);
    if (updateResult.isLeft()) return left(updateResult.value);

    await this.repo.save(proposal);
    return right(proposal);
  }
}

@Injectable()
export class DeleteProposalUseCase {
  constructor(private readonly repo: ProposalsRepository) {}

  async execute(input: { id: string; requesterId: string; requesterRole: string }): Promise<Either<Error, void>> {
    const proposal = await this.repo.findById(input.id);
    if (!proposal) return left(new ProposalNotFoundError("Proposta não encontrada"));
    if (input.requesterRole !== "admin" && proposal.ownerId !== input.requesterId) {
      return left(new ProposalForbiddenError("Acesso negado"));
    }
    await this.repo.delete(input.id);
    return right(undefined);
  }
}
