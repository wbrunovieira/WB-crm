import { Injectable } from "@nestjs/common";
import { EnrollmentSourceRepository, RecipientSearchResult } from "../repositories/enrollment-source.repository";
import { EmailSuppressionsRepository } from "../repositories/email-suppressions.repository";

@Injectable()
export class GetCampaignSourceGroupsUseCase {
  constructor(private readonly source: EnrollmentSourceRepository) {}
  execute(ownerId: string): Promise<string[]> {
    return this.source.findSourceGroups(ownerId);
  }
}

@Injectable()
export class SearchEnrollableRecipientsUseCase {
  constructor(private readonly source: EnrollmentSourceRepository) {}
  async execute(input: { ownerId: string; query: string }): Promise<RecipientSearchResult[]> {
    const term = (input.query ?? "").trim();
    if (term.length < 2) return [];
    return this.source.searchEnrollable(input.ownerId, term);
  }
}

export interface SuppressionWithNames {
  id: string;
  email: string;
  reason: string;
  createdAt: Date;
  leadName: string | null;
  contactName: string | null;
}

@Injectable()
export class ListSuppressionsWithNamesUseCase {
  constructor(
    private readonly suppressions: EmailSuppressionsRepository,
    private readonly source: EnrollmentSourceRepository,
  ) {}

  async execute(ownerId: string): Promise<SuppressionWithNames[]> {
    const list = await this.suppressions.findAllByOwner(ownerId);

    const enriched = await Promise.all(
      list.map(async (s) => {
        const names = await this.source.resolveEmailEntityNames(ownerId, s.email);
        return {
          id: s.id.toString(),
          email: s.email,
          reason: s.reason,
          createdAt: s.createdAt,
          leadName: names.leadName,
          contactName: names.contactName,
        };
      }),
    );

    return enriched.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
  }
}
