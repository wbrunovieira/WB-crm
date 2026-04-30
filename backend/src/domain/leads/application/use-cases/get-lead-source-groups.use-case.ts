import { Injectable } from "@nestjs/common";
import { LeadsRepository } from "../repositories/leads.repository";

@Injectable()
export class GetLeadSourceGroupsUseCase {
  constructor(private readonly leads: LeadsRepository) {}

  async execute(requesterId: string, requesterRole: string): Promise<string[]> {
    return this.leads.findDistinctSourceGroups(requesterId, requesterRole);
  }
}
