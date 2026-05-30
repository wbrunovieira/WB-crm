import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { MetaAdsCheckerPort, type MetaAdsResult } from "../ports/meta-ads-checker.port";
import { LeadsRepository } from "@/domain/leads/application/repositories/leads.repository";
import { InstagramHandle } from "@/domain/integrations/meta-ads/enterprise/value-objects/instagram-handle.vo";

export interface VerifyLeadMetaAdsInput {
  leadId: string;
  requesterId: string;
}

export interface VerifyLeadMetaAdsOutput {
  leadId: string;
  instagram: string;
  hasAds: boolean;
  activeCount: number;
  checkedAt: Date;
}

type Output = Either<Error, VerifyLeadMetaAdsOutput>;

@Injectable()
export class VerifyLeadMetaAdsUseCase {
  constructor(
    private readonly metaAdsChecker: MetaAdsCheckerPort,
    private readonly leadsRepo: LeadsRepository,
  ) {}

  async execute(input: VerifyLeadMetaAdsInput): Promise<Output> {
    const lead = await this.leadsRepo.findByIdRaw(input.leadId);
    if (!lead) return left(new Error("Lead não encontrado"));

    if (!lead.instagram) return left(new Error("Lead não possui Instagram"));

    const handleResult = InstagramHandle.create(lead.instagram);
    if (handleResult.isLeft()) return left(handleResult.value);
    const handle = handleResult.value.value;

    let result: MetaAdsResult;
    try {
      result = await this.metaAdsChecker.check(handle);
    } catch (err) {
      return left(new Error(err instanceof Error ? err.message : "Erro ao consultar Meta Ads"));
    }

    const metaAdsJson = JSON.stringify({
      hasAds: result.hasAds,
      activeCount: result.activeCount,
      checkedAt: result.checkedAt.toISOString(),
      searchTerm: result.searchTerm,
    });

    await this.leadsRepo.saveMetaAds(lead.id.toString(), metaAdsJson);

    return right({
      leadId: lead.id.toString(),
      instagram: handle,
      hasAds: result.hasAds,
      activeCount: result.activeCount,
      checkedAt: result.checkedAt,
    });
  }
}
