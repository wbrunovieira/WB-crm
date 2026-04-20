import { Injectable } from "@nestjs/common";
import { Either, right } from "@/core/either";
import { LeadsRepository } from "../repositories/leads.repository";

export interface BulkArchiveResult {
  archived: number;
  skipped: number;
}

@Injectable()
export class BulkArchiveLeadsUseCase {
  constructor(private readonly repo: LeadsRepository) {}

  async execute(input: {
    ids: string[];
    requesterId: string;
    requesterRole: string;
    reason?: string;
  }): Promise<Either<Error, BulkArchiveResult>> {
    let archived = 0;
    let skipped = 0;

    for (const id of input.ids) {
      const lead = await this.repo.findByIdRaw(id);
      if (!lead) { skipped++; continue; }
      if (input.requesterRole !== "admin" && lead.ownerId !== input.requesterId) { skipped++; continue; }
      if (lead.isArchived) { skipped++; continue; }
      lead.archive(input.reason);
      await this.repo.save(lead);
      archived++;
    }

    return right({ archived, skipped });
  }
}
