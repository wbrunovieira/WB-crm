import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { RecurringContractsRepository } from "../repositories/recurring-contracts.repository";
import {
  RecurringContract,
  type ContractCycle,
  type ContractStatus,
  type ContractType,
} from "../../enterprise/entities/recurring-contract";

const TIPOS: ContractType[] = ["dominio", "hospedagem", "servidor", "manutencao", "outro"];
const CICLOS: ContractCycle[] = ["mensal", "trimestral", "anual"];

export interface ContractInput {
  organizationId: string;
  type: string;
  label?: string;
  value: number;
  currency?: string;
  cycle: string;
  nextChargeAt?: Date;
  endsAt?: Date;
  autoRenew?: boolean;
  remindDays?: number;
  isPassThrough?: boolean;
  isCourtesy?: boolean;
  status?: string;
  notes?: string;
  requesterId: string;
}

function valida(type: string, cycle: string, value: number): Error | null {
  if (!TIPOS.includes(type as ContractType)) return new Error(`Tipo inválido: ${type}`);
  if (!CICLOS.includes(cycle as ContractCycle)) return new Error(`Ciclo inválido: ${cycle}`);
  if (value < 0) return new Error("Valor não pode ser negativo");
  return null;
}

@Injectable()
export class CreateRecurringContractUseCase {
  constructor(private readonly repo: RecurringContractsRepository) {}

  async execute(input: ContractInput): Promise<Either<Error, { contract: RecurringContract }>> {
    const erro = valida(input.type, input.cycle, input.value);
    if (erro) return left(erro);

    const contract = RecurringContract.create({
      organizationId: input.organizationId,
      ownerId: input.requesterId,
      type: input.type as ContractType,
      label: input.label,
      value: input.value,
      currency: input.currency,
      cycle: input.cycle as ContractCycle,
      nextChargeAt: input.nextChargeAt,
      endsAt: input.endsAt,
      autoRenew: input.autoRenew,
      remindDays: input.remindDays,
      isPassThrough: input.isPassThrough,
      isCourtesy: input.isCourtesy,
      status: input.status as ContractStatus | undefined,
      notes: input.notes,
    });

    await this.repo.create(contract);
    return right({ contract });
  }
}

@Injectable()
export class ListRecurringContractsUseCase {
  constructor(private readonly repo: RecurringContractsRepository) {}

  async execute(organizationId: string): Promise<Either<Error, { contracts: RecurringContract[] }>> {
    return right({ contracts: await this.repo.findByOrganization(organizationId) });
  }
}

@Injectable()
export class UpdateRecurringContractUseCase {
  constructor(private readonly repo: RecurringContractsRepository) {}

  async execute(
    input: Partial<ContractInput> & { id: string; requesterId: string; requesterRole: string },
  ): Promise<Either<Error, { contract: RecurringContract }>> {
    const contract = await this.repo.findByIdRaw(input.id);
    if (!contract) return left(new Error("Contrato não encontrado"));
    if (input.requesterRole !== "admin" && contract.ownerId !== input.requesterId) {
      return left(new Error("Não autorizado"));
    }

    const erro = valida(
      input.type ?? contract.type,
      input.cycle ?? contract.cycle,
      input.value ?? contract.value,
    );
    if (erro) return left(erro);

    // Só o que veio: undefined aqui apagaria campo que o usuário nem tocou.
    const campos = Object.fromEntries(
      Object.entries({
        type: input.type, label: input.label, value: input.value, currency: input.currency,
        cycle: input.cycle, nextChargeAt: input.nextChargeAt, endsAt: input.endsAt,
        autoRenew: input.autoRenew, remindDays: input.remindDays,
        isPassThrough: input.isPassThrough, isCourtesy: input.isCourtesy,
        status: input.status, notes: input.notes,
      }).filter(([, v]) => v !== undefined),
    );

    contract.update(campos as never);
    await this.repo.save(contract);
    return right({ contract });
  }
}

@Injectable()
export class DeleteRecurringContractUseCase {
  constructor(private readonly repo: RecurringContractsRepository) {}

  async execute(input: { id: string; requesterId: string; requesterRole: string }): Promise<Either<Error, void>> {
    const contract = await this.repo.findByIdRaw(input.id);
    if (!contract) return left(new Error("Contrato não encontrado"));
    if (input.requesterRole !== "admin" && contract.ownerId !== input.requesterId) {
      return left(new Error("Não autorizado"));
    }
    await this.repo.delete(input.id);
    return right(undefined);
  }
}
