import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { GatekeeperAnalysisRepository } from "../repositories/gatekeeper-analysis.repository";
import { GatekeeperBatchRepository } from "../repositories/gatekeeper-batch.repository";
import type { GatekeeperAnalysis } from "../../enterprise/entities/gatekeeper-analysis.entity";
import type { GatekeeperBatch } from "../../enterprise/entities/gatekeeper-batch.entity";

export class GatekeeperNotFoundError extends Error {
  name = "GatekeeperNotFoundError";
}
export class GatekeeperForbiddenError extends Error {
  name = "GatekeeperForbiddenError";
}

function canAccess(ownerId: string, requesterId: string, requesterRole: string): boolean {
  return requesterRole === "admin" || ownerId === requesterId;
}

@Injectable()
export class GetGatekeeperAnalysesUseCase {
  constructor(private readonly repo: GatekeeperAnalysisRepository) {}
  async execute(ownerId: string): Promise<GatekeeperAnalysis[]> {
    return this.repo.findByOwner(ownerId);
  }
}

@Injectable()
export class GetGatekeeperAnalysisByActivityUseCase {
  constructor(private readonly repo: GatekeeperAnalysisRepository) {}
  async execute(input: { activityId: string; requesterId: string; requesterRole: string }): Promise<Either<Error, GatekeeperAnalysis>> {
    const analysis = await this.repo.findByActivityId(input.activityId);
    if (!analysis) return left(new GatekeeperNotFoundError("Análise não encontrada"));
    if (!canAccess(analysis.ownerId, input.requesterId, input.requesterRole)) {
      return left(new GatekeeperForbiddenError("Acesso negado"));
    }
    return right(analysis);
  }
}

@Injectable()
export class GetGatekeeperAnalysisByIdUseCase {
  constructor(private readonly repo: GatekeeperAnalysisRepository) {}
  async execute(input: { id: string; requesterId: string; requesterRole: string }): Promise<Either<Error, GatekeeperAnalysis>> {
    const analysis = await this.repo.findById(input.id);
    if (!analysis) return left(new GatekeeperNotFoundError("Análise não encontrada"));
    if (!canAccess(analysis.ownerId, input.requesterId, input.requesterRole)) {
      return left(new GatekeeperForbiddenError("Acesso negado"));
    }
    return right(analysis);
  }
}

@Injectable()
export class GetGatekeeperBatchesUseCase {
  constructor(private readonly repo: GatekeeperBatchRepository) {}
  async execute(ownerId: string): Promise<GatekeeperBatch[]> {
    return this.repo.findByOwner(ownerId);
  }
}

@Injectable()
export class GetGatekeeperBatchByIdUseCase {
  constructor(private readonly repo: GatekeeperBatchRepository) {}
  async execute(input: { id: string; requesterId: string; requesterRole: string }): Promise<Either<Error, GatekeeperBatch>> {
    const batch = await this.repo.findById(input.id);
    if (!batch) return left(new GatekeeperNotFoundError("Lote não encontrado"));
    if (!canAccess(batch.ownerId, input.requesterId, input.requesterRole)) {
      return left(new GatekeeperForbiddenError("Acesso negado"));
    }
    return right(batch);
  }
}
