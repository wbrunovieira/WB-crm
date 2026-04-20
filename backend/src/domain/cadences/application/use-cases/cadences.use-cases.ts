import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { Cadence } from "../../enterprise/entities/cadence";
import { CadenceStep } from "../../enterprise/entities/cadence-step";
import { CadencesRepository, LeadCadenceRecord, GeneratedActivity } from "../repositories/cadences.repository";

export class CadenceNotFoundError extends Error { name = "CadenceNotFoundError"; }
export class CadenceForbiddenError extends Error { name = "CadenceForbiddenError"; }
export class CadenceStepNotFoundError extends Error { name = "CadenceStepNotFoundError"; }
export class CadenceAlreadyAppliedError extends Error { name = "CadenceAlreadyAppliedError"; }
export class LeadCadenceNotFoundError extends Error { name = "LeadCadenceNotFoundError"; }
export class CadenceSlugConflictError extends Error { name = "CadenceSlugConflictError"; }

// ── Cadence CRUD ─────────────────────────────────────────────────────────────

@Injectable()
export class CreateCadenceUseCase {
  constructor(private readonly repo: CadencesRepository) {}

  async execute(input: {
    name: string;
    slug?: string;
    description?: string;
    objective?: string;
    durationDays?: number;
    icpId?: string;
    ownerId: string;
  }): Promise<Either<Error, Cadence>> {
    const result = Cadence.create(input);
    if (result.isLeft()) return left(result.value);
    const cadence = result.value as Cadence;

    const slugTaken = await this.repo.existsBySlugAndOwner(cadence.slug, input.ownerId);
    if (slugTaken) return left(new CadenceSlugConflictError(`Slug '${cadence.slug}' já existe`));

    await this.repo.save(cadence);
    return right(cadence);
  }
}

@Injectable()
export class UpdateCadenceUseCase {
  constructor(private readonly repo: CadencesRepository) {}

  async execute(input: {
    id: string;
    requesterId: string;
    requesterRole: string;
    name?: string;
    slug?: string;
    description?: string;
    objective?: string;
    durationDays?: number;
    icpId?: string;
  }): Promise<Either<Error, Cadence>> {
    const cadence = await this.repo.findById(input.id);
    if (!cadence) return left(new CadenceNotFoundError("Cadência não encontrada"));
    if (input.requesterRole !== "admin" && cadence.ownerId !== input.requesterId) {
      return left(new CadenceForbiddenError("Acesso negado"));
    }

    if (input.slug) {
      const taken = await this.repo.existsBySlugAndOwner(input.slug, cadence.ownerId, input.id);
      if (taken) return left(new CadenceSlugConflictError(`Slug '${input.slug}' já existe`));
    }

    const updateResult = cadence.update(input);
    if (updateResult.isLeft()) return left(updateResult.value);

    await this.repo.save(cadence);
    return right(cadence);
  }
}

@Injectable()
export class DeleteCadenceUseCase {
  constructor(private readonly repo: CadencesRepository) {}

  async execute(input: { id: string; requesterId: string; requesterRole: string }): Promise<Either<Error, void>> {
    const cadence = await this.repo.findById(input.id);
    if (!cadence) return left(new CadenceNotFoundError("Cadência não encontrada"));
    if (input.requesterRole !== "admin" && cadence.ownerId !== input.requesterId) {
      return left(new CadenceForbiddenError("Acesso negado"));
    }
    await this.repo.delete(input.id);
    return right(undefined);
  }
}

@Injectable()
export class GetCadencesUseCase {
  constructor(private readonly repo: CadencesRepository) {}

  async execute(input: { requesterId: string; icpId?: string }): Promise<Either<Error, Cadence[]>> {
    const cadences = await this.repo.findByOwner(input.requesterId);
    const filtered = input.icpId ? cadences.filter((c) => c.icpId === input.icpId) : cadences;
    return right(filtered);
  }
}

@Injectable()
export class GetCadenceByIdUseCase {
  constructor(private readonly repo: CadencesRepository) {}

  async execute(input: { id: string; requesterId: string; requesterRole: string }): Promise<Either<Error, Cadence>> {
    const cadence = await this.repo.findById(input.id);
    if (!cadence) return left(new CadenceNotFoundError("Cadência não encontrada"));
    if (input.requesterRole !== "admin" && cadence.ownerId !== input.requesterId) {
      return left(new CadenceForbiddenError("Acesso negado"));
    }
    return right(cadence);
  }
}

@Injectable()
export class PublishCadenceUseCase {
  constructor(private readonly repo: CadencesRepository) {}

  async execute(input: { id: string; requesterId: string; requesterRole: string }): Promise<Either<Error, void>> {
    const cadence = await this.repo.findById(input.id);
    if (!cadence) return left(new CadenceNotFoundError("Cadência não encontrada"));
    if (input.requesterRole !== "admin" && cadence.ownerId !== input.requesterId) {
      return left(new CadenceForbiddenError("Acesso negado"));
    }
    const result = cadence.publish();
    if (result.isLeft()) return left(result.value);
    await this.repo.save(cadence);
    return right(undefined);
  }
}

@Injectable()
export class UnpublishCadenceUseCase {
  constructor(private readonly repo: CadencesRepository) {}

  async execute(input: { id: string; requesterId: string; requesterRole: string }): Promise<Either<Error, void>> {
    const cadence = await this.repo.findById(input.id);
    if (!cadence) return left(new CadenceNotFoundError("Cadência não encontrada"));
    if (input.requesterRole !== "admin" && cadence.ownerId !== input.requesterId) {
      return left(new CadenceForbiddenError("Acesso negado"));
    }
    cadence.unpublish();
    await this.repo.save(cadence);
    return right(undefined);
  }
}

// ── Steps ─────────────────────────────────────────────────────────────────────

@Injectable()
export class CreateCadenceStepUseCase {
  constructor(private readonly repo: CadencesRepository) {}

  async execute(input: {
    cadenceId: string;
    dayNumber: number;
    channel: string;
    subject: string;
    description?: string;
    order?: number;
    requesterId: string;
    requesterRole: string;
  }): Promise<Either<Error, CadenceStep>> {
    const cadence = await this.repo.findById(input.cadenceId);
    if (!cadence) return left(new CadenceNotFoundError("Cadência não encontrada"));
    if (input.requesterRole !== "admin" && cadence.ownerId !== input.requesterId) {
      return left(new CadenceForbiddenError("Acesso negado"));
    }

    const result = CadenceStep.create({
      cadenceId: input.cadenceId,
      dayNumber: input.dayNumber,
      channel: input.channel,
      subject: input.subject,
      description: input.description,
      order: input.order,
    });
    if (result.isLeft()) return left(result.value);
    const step = result.value as CadenceStep;

    await this.repo.saveStep(step);
    return right(step);
  }
}

@Injectable()
export class UpdateCadenceStepUseCase {
  constructor(private readonly repo: CadencesRepository) {}

  async execute(input: {
    stepId: string;
    requesterId: string;
    requesterRole: string;
    dayNumber?: number;
    channel?: string;
    subject?: string;
    description?: string;
    order?: number;
  }): Promise<Either<Error, CadenceStep>> {
    const step = await this.repo.findStepById(input.stepId);
    if (!step) return left(new CadenceStepNotFoundError("Step não encontrado"));

    const cadence = await this.repo.findById(step.cadenceId);
    if (!cadence) return left(new CadenceNotFoundError("Cadência não encontrada"));
    if (input.requesterRole !== "admin" && cadence.ownerId !== input.requesterId) {
      return left(new CadenceForbiddenError("Acesso negado"));
    }

    const result = step.update(input);
    if (result.isLeft()) return left(result.value);
    await this.repo.saveStep(step);
    return right(step);
  }
}

@Injectable()
export class DeleteCadenceStepUseCase {
  constructor(private readonly repo: CadencesRepository) {}

  async execute(input: { stepId: string; requesterId: string; requesterRole: string }): Promise<Either<Error, void>> {
    const step = await this.repo.findStepById(input.stepId);
    if (!step) return left(new CadenceStepNotFoundError("Step não encontrado"));

    const cadence = await this.repo.findById(step.cadenceId);
    if (!cadence) return left(new CadenceNotFoundError("Cadência não encontrada"));
    if (input.requesterRole !== "admin" && cadence.ownerId !== input.requesterId) {
      return left(new CadenceForbiddenError("Acesso negado"));
    }

    await this.repo.deleteStep(input.stepId);
    return right(undefined);
  }
}

@Injectable()
export class ReorderCadenceStepsUseCase {
  constructor(private readonly repo: CadencesRepository) {}

  async execute(input: {
    cadenceId: string;
    orderedStepIds: string[];
    requesterId: string;
    requesterRole: string;
  }): Promise<Either<Error, void>> {
    const cadence = await this.repo.findById(input.cadenceId);
    if (!cadence) return left(new CadenceNotFoundError("Cadência não encontrada"));
    if (input.requesterRole !== "admin" && cadence.ownerId !== input.requesterId) {
      return left(new CadenceForbiddenError("Acesso negado"));
    }
    await this.repo.reorderSteps(input.cadenceId, input.orderedStepIds);
    return right(undefined);
  }
}

@Injectable()
export class GetCadenceStepsUseCase {
  constructor(private readonly repo: CadencesRepository) {}

  async execute(input: {
    cadenceId: string;
    requesterId: string;
    requesterRole: string;
  }): Promise<Either<Error, CadenceStep[]>> {
    const cadence = await this.repo.findById(input.cadenceId);
    if (!cadence) return left(new CadenceNotFoundError("Cadência não encontrada"));
    if (input.requesterRole !== "admin" && cadence.ownerId !== input.requesterId) {
      return left(new CadenceForbiddenError("Acesso negado"));
    }
    const steps = await this.repo.findStepsByCadence(input.cadenceId);
    return right(steps);
  }
}

// ── Lead Cadence ──────────────────────────────────────────────────────────────

@Injectable()
export class ApplyCadenceToLeadUseCase {
  constructor(private readonly repo: CadencesRepository) {}

  async execute(input: {
    cadenceId: string;
    leadId: string;
    startDate?: Date;
    notes?: string;
    requesterId: string;
    requesterRole: string;
  }): Promise<Either<Error, { leadCadenceId: string; activities: GeneratedActivity[] }>> {
    const cadence = await this.repo.findById(input.cadenceId);
    if (!cadence) return left(new CadenceNotFoundError("Cadência não encontrada"));
    if (input.requesterRole !== "admin" && cadence.ownerId !== input.requesterId) {
      return left(new CadenceForbiddenError("Acesso negado"));
    }

    const steps = await this.repo.findStepsByCadence(input.cadenceId);

    const result = await this.repo.applyToLead(
      {
        leadId: input.leadId,
        cadenceId: input.cadenceId,
        startDate: input.startDate ?? new Date(),
        ownerId: input.requesterId,
        notes: input.notes,
      },
      steps,
    );
    return right(result);
  }
}

@Injectable()
export class GetLeadCadencesUseCase {
  constructor(private readonly repo: CadencesRepository) {}

  async execute(input: { leadId: string }): Promise<Either<Error, LeadCadenceRecord[]>> {
    const records = await this.repo.getLeadCadences(input.leadId);
    return right(records);
  }
}

@Injectable()
export class PauseLeadCadenceUseCase {
  constructor(private readonly repo: CadencesRepository) {}

  async execute(input: { leadCadenceId: string; requesterId: string; requesterRole: string }): Promise<Either<Error, void>> {
    const lc = await this.repo.findLeadCadenceById(input.leadCadenceId);
    if (!lc) return left(new LeadCadenceNotFoundError("Cadência do lead não encontrada"));
    if (input.requesterRole !== "admin" && lc.ownerId !== input.requesterId) {
      return left(new CadenceForbiddenError("Acesso negado"));
    }
    await this.repo.pauseLeadCadence(input.leadCadenceId);
    return right(undefined);
  }
}

@Injectable()
export class ResumeLeadCadenceUseCase {
  constructor(private readonly repo: CadencesRepository) {}

  async execute(input: { leadCadenceId: string; requesterId: string; requesterRole: string }): Promise<Either<Error, void>> {
    const lc = await this.repo.findLeadCadenceById(input.leadCadenceId);
    if (!lc) return left(new LeadCadenceNotFoundError("Cadência do lead não encontrada"));
    if (input.requesterRole !== "admin" && lc.ownerId !== input.requesterId) {
      return left(new CadenceForbiddenError("Acesso negado"));
    }
    await this.repo.resumeLeadCadence(input.leadCadenceId);
    return right(undefined);
  }
}

@Injectable()
export class CancelLeadCadenceUseCase {
  constructor(private readonly repo: CadencesRepository) {}

  async execute(input: { leadCadenceId: string; requesterId: string; requesterRole: string }): Promise<Either<Error, void>> {
    const lc = await this.repo.findLeadCadenceById(input.leadCadenceId);
    if (!lc) return left(new LeadCadenceNotFoundError("Cadência do lead não encontrada"));
    if (input.requesterRole !== "admin" && lc.ownerId !== input.requesterId) {
      return left(new CadenceForbiddenError("Acesso negado"));
    }
    await this.repo.cancelLeadCadence(input.leadCadenceId);
    return right(undefined);
  }
}

@Injectable()
export class GetCadenceLeadCountUseCase {
  constructor(private readonly repo: CadencesRepository) {}

  async execute(input: { cadenceId: string; requesterId: string; requesterRole: string }): Promise<Either<Error, { count: number }>> {
    const cadence = await this.repo.findById(input.cadenceId);
    if (!cadence) return left(new CadenceNotFoundError("Cadência não encontrada"));
    if (input.requesterRole !== "admin" && cadence.ownerId !== input.requesterId) {
      return left(new CadenceForbiddenError("Acesso negado"));
    }
    const count = await this.repo.countActiveLeads(input.cadenceId);
    return right({ count });
  }
}

@Injectable()
export class BulkApplyCadenceUseCase {
  constructor(private readonly repo: CadencesRepository) {}

  async execute(input: {
    cadenceId: string;
    leadIds: string[];
    startDate?: Date;
    notes?: string;
    requesterId: string;
    requesterRole: string;
  }): Promise<Either<Error, { applied: string[]; failed: Array<{ leadId: string; reason: string }> }>> {
    const cadence = await this.repo.findById(input.cadenceId);
    if (!cadence) return left(new CadenceNotFoundError("Cadência não encontrada"));
    if (input.requesterRole !== "admin" && cadence.ownerId !== input.requesterId) {
      return left(new CadenceForbiddenError("Acesso negado"));
    }

    const steps = await this.repo.findStepsByCadence(input.cadenceId);
    const applied: string[] = [];
    const failed: Array<{ leadId: string; reason: string }> = [];

    for (const leadId of input.leadIds) {
      try {
        await this.repo.applyToLead(
          { leadId, cadenceId: input.cadenceId, startDate: input.startDate ?? new Date(), ownerId: input.requesterId, notes: input.notes },
          steps,
        );
        applied.push(leadId);
      } catch (err) {
        failed.push({ leadId, reason: err instanceof Error ? err.message : "Erro desconhecido" });
      }
    }

    return right({ applied, failed });
  }
}
