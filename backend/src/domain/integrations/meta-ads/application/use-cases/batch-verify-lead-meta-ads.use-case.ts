import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { MetaAdsCheckerPort } from "../ports/meta-ads-checker.port";
import { LeadsRepository } from "@/domain/leads/application/repositories/leads.repository";
import { InstagramHandle } from "@/domain/integrations/meta-ads/enterprise/value-objects/instagram-handle.vo";

export interface BatchVerifyLeadMetaAdsInput {
  sourceGroup: string;
  /** Requester identity — used to scope the batch to the requester's own leads. */
  requesterId: string;
  requesterRole: string;
  onProgress?: (p: BatchVerifyLeadMetaAdsProgress) => void;
}

export interface BatchVerifyLeadMetaAdsProgress {
  current: number;
  total: number;
  leadId: string;
  businessName: string;
  skipped?: boolean;
  hasAds?: boolean;
  activeCount?: number;
  error?: string;
}

export interface BatchVerifyLeadMetaAdsResult {
  total: number;
  checked: number;
  withAds: number;
  withoutAds: number;
  skipped: number;
  errors: number;
}

type Output = Either<Error, BatchVerifyLeadMetaAdsResult>;

@Injectable()
export class BatchVerifyLeadMetaAdsUseCase {
  constructor(
    private readonly metaAdsChecker: MetaAdsCheckerPort,
    private readonly leadsRepo: LeadsRepository,
  ) {}

  async execute(input: BatchVerifyLeadMetaAdsInput): Promise<Output> {
    if (!input.sourceGroup?.trim()) {
      return left(new Error("sourceGroup é obrigatório"));
    }

    const allLeads = await this.leadsRepo.findBySourceGroup(input.sourceGroup.trim());

    // Data isolation: a non-admin only acts on their own leads within the group.
    const leads =
      input.requesterRole === "admin"
        ? allLeads
        : allLeads.filter((l) => l.ownerId === input.requesterId);

    if (leads.length === 0) {
      return left(new Error(`Nenhum lead encontrado para o sourceGroup: ${input.sourceGroup}`));
    }

    const result: BatchVerifyLeadMetaAdsResult = {
      total: leads.length,
      checked: 0,
      withAds: 0,
      withoutAds: 0,
      skipped: 0,
      errors: 0,
    };

    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];

      const handleResult = InstagramHandle.create(lead.instagram);
      if (handleResult.isLeft()) {
        // sem instagram ou handle inválido → pula
        result.skipped++;
        input.onProgress?.({
          current: i + 1,
          total: leads.length,
          leadId: lead.id.toString(),
          businessName: lead.businessName,
          skipped: true,
        });
        // small delay to keep SSE flushing
        await new Promise<void>(resolve => setTimeout(resolve, 100));
        continue;
      }

      const handle = handleResult.value.value;

      try {
        const ads = await this.metaAdsChecker.check(handle);

        const metaAdsJson = JSON.stringify({
          hasAds: ads.hasAds,
          activeCount: ads.activeCount,
          checkedAt: ads.checkedAt.toISOString(),
          searchTerm: ads.searchTerm,
        });

        await this.leadsRepo.saveMetaAds(lead.id.toString(), metaAdsJson);

        result.checked++;
        if (ads.hasAds) result.withAds++; else result.withoutAds++;

        input.onProgress?.({
          current: i + 1,
          total: leads.length,
          leadId: lead.id.toString(),
          businessName: lead.businessName,
          hasAds: ads.hasAds,
          activeCount: ads.activeCount,
        });
      } catch (err) {
        result.errors++;
        input.onProgress?.({
          current: i + 1,
          total: leads.length,
          leadId: lead.id.toString(),
          businessName: lead.businessName,
          error: err instanceof Error ? err.message : "Erro desconhecido",
        });
      }

      // throttle to respect Meta rate limits (~200 req/hour = ~1 req/18s, but in practice more lenient)
      await new Promise<void>(resolve => setTimeout(resolve, 500));
    }

    return right(result);
  }
}
