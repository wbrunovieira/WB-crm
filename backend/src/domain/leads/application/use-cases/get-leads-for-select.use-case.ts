import { Injectable } from "@nestjs/common";
import { Either, right } from "@/core/either";
import { LeadsRepository, LeadSelectItem } from "../repositories/leads.repository";

@Injectable()
export class GetLeadsForSelectUseCase {
  constructor(private readonly repo: LeadsRepository) {}

  async execute(requesterId: string, requesterRole: string): Promise<Either<never, { leads: LeadSelectItem[] }>> {
    const leads = await this.repo.findForSelect(requesterId, requesterRole);
    return right({ leads });
  }
}
