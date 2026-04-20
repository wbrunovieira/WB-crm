import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import {
  CadencesRepository,
  LeadCadenceRecord,
  ApplyCadenceInput,
  GeneratedActivity,
} from "../../application/repositories/cadences.repository";
import { Cadence } from "../../enterprise/entities/cadence";
import { CadenceStep } from "../../enterprise/entities/cadence-step";
import { UniqueEntityID } from "@/core/unique-entity-id";

function mapCadence(raw: Record<string, unknown>): Cadence {
  return Cadence.create(
    {
      name: raw.name as string,
      slug: raw.slug as string,
      description: raw.description as string | undefined,
      objective: raw.objective as string | undefined,
      durationDays: raw.durationDays as number,
      icpId: raw.icpId as string | undefined,
      status: raw.status as string,
      ownerId: raw.ownerId as string,
      createdAt: raw.createdAt as Date,
      updatedAt: raw.updatedAt as Date,
    },
    new UniqueEntityID(raw.id as string),
  ).unwrap() as Cadence;
}

function mapStep(raw: Record<string, unknown>): CadenceStep {
  return CadenceStep.create(
    {
      cadenceId: raw.cadenceId as string,
      dayNumber: raw.dayNumber as number,
      channel: raw.channel as string,
      subject: raw.subject as string,
      description: raw.description as string | undefined,
      order: raw.order as number,
      createdAt: raw.createdAt as Date,
      updatedAt: raw.updatedAt as Date,
    },
    new UniqueEntityID(raw.id as string),
  ).unwrap() as CadenceStep;
}

function mapLeadCadence(raw: Record<string, unknown>): LeadCadenceRecord {
  return {
    id: raw.id as string,
    leadId: raw.leadId as string,
    cadenceId: raw.cadenceId as string,
    status: raw.status as string,
    startDate: raw.startDate as Date,
    currentStep: raw.currentStep as number,
    notes: raw.notes as string | undefined,
    ownerId: raw.ownerId as string,
    pausedAt: raw.pausedAt as Date | undefined,
    completedAt: raw.completedAt as Date | undefined,
    cancelledAt: raw.cancelledAt as Date | undefined,
  };
}

@Injectable()
export class PrismaCadencesRepository extends CadencesRepository {
  constructor(private readonly prisma: PrismaService) { super(); }

  async findById(id: string): Promise<Cadence | null> {
    const raw = await this.prisma.cadence.findUnique({ where: { id } });
    if (!raw) return null;
    return mapCadence(raw as unknown as Record<string, unknown>);
  }

  async findByOwner(ownerId: string): Promise<Cadence[]> {
    const rows = await this.prisma.cadence.findMany({ where: { ownerId }, orderBy: { createdAt: "desc" } });
    return rows.map(r => mapCadence(r as unknown as Record<string, unknown>));
  }

  async existsBySlugAndOwner(slug: string, ownerId: string, excludeId?: string): Promise<boolean> {
    const row = await this.prisma.cadence.findFirst({
      where: { slug, ownerId, id: excludeId ? { not: excludeId } : undefined },
    });
    return !!row;
  }

  async save(cadence: Cadence): Promise<void> {
    const data = {
      name: cadence.name,
      slug: cadence.slug,
      description: cadence.description ?? null,
      objective: cadence.objective ?? null,
      durationDays: cadence.durationDays,
      icpId: cadence.icpId ?? null,
      status: cadence.status,
      ownerId: cadence.ownerId,
    };
    await this.prisma.cadence.upsert({
      where: { id: cadence.id.toString() },
      create: { id: cadence.id.toString(), ...data },
      update: data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.cadence.delete({ where: { id } });
  }

  async findStepsByCadence(cadenceId: string): Promise<CadenceStep[]> {
    const rows = await this.prisma.cadenceStep.findMany({
      where: { cadenceId },
      orderBy: [{ dayNumber: "asc" }, { order: "asc" }],
    });
    return rows.map(r => mapStep(r as unknown as Record<string, unknown>));
  }

  async findStepById(id: string): Promise<CadenceStep | null> {
    const raw = await this.prisma.cadenceStep.findUnique({ where: { id } });
    if (!raw) return null;
    return mapStep(raw as unknown as Record<string, unknown>);
  }

  async saveStep(step: CadenceStep): Promise<void> {
    const data = {
      cadenceId: step.cadenceId,
      dayNumber: step.dayNumber,
      channel: step.channel,
      subject: step.subject,
      description: step.description ?? null,
      order: step.order,
    };
    await this.prisma.cadenceStep.upsert({
      where: { id: step.id.toString() },
      create: { id: step.id.toString(), ...data },
      update: data,
    });
  }

  async deleteStep(id: string): Promise<void> {
    await this.prisma.cadenceStep.delete({ where: { id } });
  }

  async reorderSteps(cadenceId: string, orderedStepIds: string[]): Promise<void> {
    await this.prisma.$transaction(
      orderedStepIds.map((id, index) =>
        this.prisma.cadenceStep.update({ where: { id }, data: { order: index } })
      )
    );
  }

  async applyToLead(input: ApplyCadenceInput, steps: CadenceStep[]): Promise<{ leadCadenceId: string; activities: GeneratedActivity[] }> {
    return this.prisma.$transaction(async (tx) => {
      const lc = await tx.leadCadence.create({
        data: {
          leadId: input.leadId,
          cadenceId: input.cadenceId,
          startDate: input.startDate,
          status: "active",
          currentStep: 0,
          notes: input.notes ?? null,
          ownerId: input.ownerId,
        },
      });

      const activities: GeneratedActivity[] = [];

      for (const step of steps) {
        const scheduledDate = new Date(input.startDate);
        scheduledDate.setDate(scheduledDate.getDate() + (step.dayNumber - 1));

        const activity = await tx.activity.create({
          data: {
            type: step.activityType,
            subject: step.subject,
            description: step.description ?? null,
            dueDate: scheduledDate,
            completed: false,
            ownerId: input.ownerId,
            leadId: input.leadId,
          },
        });

        await tx.leadCadenceActivity.create({
          data: {
            leadCadenceId: lc.id,
            cadenceStepId: step.id.toString(),
            activityId: activity.id,
            scheduledDate,
          },
        });

        activities.push({
          leadCadenceId: lc.id,
          cadenceStepId: step.id.toString(),
          activityId: activity.id,
          scheduledDate,
        });
      }

      return { leadCadenceId: lc.id, activities };
    });
  }

  async getLeadCadences(leadId: string): Promise<LeadCadenceRecord[]> {
    const rows = await this.prisma.leadCadence.findMany({
      where: { leadId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(r => mapLeadCadence(r as unknown as Record<string, unknown>));
  }

  async findLeadCadenceById(id: string): Promise<LeadCadenceRecord | null> {
    const raw = await this.prisma.leadCadence.findUnique({ where: { id } });
    if (!raw) return null;
    return mapLeadCadence(raw as unknown as Record<string, unknown>);
  }

  async pauseLeadCadence(id: string): Promise<void> {
    await this.prisma.leadCadence.update({ where: { id }, data: { status: "paused", pausedAt: new Date() } });
  }

  async resumeLeadCadence(id: string): Promise<void> {
    await this.prisma.leadCadence.update({ where: { id }, data: { status: "active", pausedAt: null } });
  }

  async cancelLeadCadence(id: string): Promise<void> {
    await this.prisma.leadCadence.update({ where: { id }, data: { status: "cancelled", cancelledAt: new Date() } });
  }
}
