import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { RecurringContractsRepository } from "../../application/repositories/recurring-contracts.repository";
import {
  RecurringContract,
  type ContractCycle,
  type ContractStatus,
  type ContractType,
} from "../../enterprise/entities/recurring-contract";

type Row = {
  id: string; organizationId: string; ownerId: string; type: string; label: string | null;
  value: number; currency: string; cycle: string; nextChargeAt: Date | null; endsAt: Date | null;
  autoRenew: boolean; remindDays: number; isPassThrough: boolean; isCourtesy: boolean;
  status: string; notes: string | null; createdAt: Date; updatedAt: Date;
};

/** Conversao explicita nos DOIS sentidos. Campo que faltar aqui grava e nunca volta na leitura. */
function paraDominio(r: Row): RecurringContract {
  return RecurringContract.create(
    {
      organizationId: r.organizationId,
      ownerId: r.ownerId,
      type: r.type as ContractType,
      label: r.label ?? undefined,
      value: r.value,
      currency: r.currency,
      cycle: r.cycle as ContractCycle,
      nextChargeAt: r.nextChargeAt ?? undefined,
      endsAt: r.endsAt ?? undefined,
      autoRenew: r.autoRenew,
      remindDays: r.remindDays,
      isPassThrough: r.isPassThrough,
      isCourtesy: r.isCourtesy,
      status: r.status as ContractStatus,
      notes: r.notes ?? undefined,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    },
    new UniqueEntityID(r.id),
  );
}

function paraPrisma(c: RecurringContract) {
  return {
    organizationId: c.organizationId,
    ownerId: c.ownerId,
    type: c.type,
    label: c.label ?? null,
    value: c.value,
    currency: c.currency,
    cycle: c.cycle,
    nextChargeAt: c.nextChargeAt ?? null,
    endsAt: c.endsAt ?? null,
    autoRenew: c.autoRenew,
    remindDays: c.remindDays,
    isPassThrough: c.isPassThrough,
    isCourtesy: c.isCourtesy,
    status: c.status,
    notes: c.notes ?? null,
  };
}

@Injectable()
export class PrismaRecurringContractsRepository extends RecurringContractsRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findByOrganization(organizationId: string): Promise<RecurringContract[]> {
    const rows = await this.prisma.recurringContract.findMany({
      where: { organizationId },
      // Tipo e depois valor: dominio e hospedagem do mesmo cliente ficam juntos e previsiveis.
      orderBy: [{ type: "asc" }, { value: "desc" }],
    });
    return rows.map(paraDominio);
  }

  async findByIdRaw(id: string): Promise<RecurringContract | null> {
    const row = await this.prisma.recurringContract.findUnique({ where: { id } });
    return row ? paraDominio(row) : null;
  }

  async create(contract: RecurringContract): Promise<void> {
    await this.prisma.recurringContract.create({
      data: { id: contract.id.toString(), ...paraPrisma(contract) },
    });
  }

  async save(contract: RecurringContract): Promise<void> {
    await this.prisma.recurringContract.update({
      where: { id: contract.id.toString() },
      data: paraPrisma(contract),
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.recurringContract.delete({ where: { id } });
  }

  async findActiveByOwner(ownerId: string, requesterRole: string): Promise<RecurringContract[]> {
    const rows = await this.prisma.recurringContract.findMany({
      where: { status: "ativo", ...(requesterRole === "admin" ? {} : { ownerId }) },
      orderBy: { nextChargeAt: "asc" },
    });
    return rows.map(paraDominio);
  }
}
