import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "@/infra/auth/auth.module";
import { LeadsModule } from "@/domain/leads/leads.module";

import { MetaAdsCheckerPort } from "./application/ports/meta-ads-checker.port";
import { MetaGraphApiAdapter } from "./infra/meta-graph-api.adapter";
import { VerifyLeadMetaAdsUseCase } from "./application/use-cases/verify-lead-meta-ads.use-case";
import { BatchVerifyLeadMetaAdsUseCase } from "./application/use-cases/batch-verify-lead-meta-ads.use-case";
import { MetaAdsController } from "./infra/controllers/meta-ads.controller";

@Module({
  imports: [ConfigModule, AuthModule, LeadsModule],
  controllers: [MetaAdsController],
  providers: [
    VerifyLeadMetaAdsUseCase,
    BatchVerifyLeadMetaAdsUseCase,
    { provide: MetaAdsCheckerPort, useClass: MetaGraphApiAdapter },
    MetaGraphApiAdapter,
  ],
  exports: [VerifyLeadMetaAdsUseCase, BatchVerifyLeadMetaAdsUseCase],
})
export class MetaAdsModule {}
