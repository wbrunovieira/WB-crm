import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { LeadsRepository } from "../repositories/leads.repository";

interface Input {
  id: string;
  requesterId: string;
  requesterRole: string;
}

type Output = Either<Error, void>;

@Injectable()
export class DeleteLeadUseCase {
  constructor(private readonly leads: LeadsRepository) {}

  async execute({ id, requesterId, requesterRole }: Input): Promise<Output> {
    const lead = await this.leads.findByIdRaw(id);
    if (!lead) return left(new Error("Lead não encontrado"));

    if (requesterRole !== "admin" && lead.ownerId !== requesterId) {
      return left(new Error("Não autorizado"));
    }

    await this.leads.delete(id);
    return right(undefined);
  }
}
