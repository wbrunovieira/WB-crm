import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { AuthModule } from "@/infra/auth/auth.module";
import { CampaignsRepository } from "./application/repositories/campaigns.repository";
import { CampaignSendsRepository } from "./application/repositories/campaign-sends.repository";
import { AntiBlockService } from "./application/services/anti-block.service";
import { StepExecutorService } from "./application/services/step-executor.service";
import { EvolutionApiPort } from "./application/ports/evolution-api.port";
import { EvolutionApiClient } from "./infra/evolution/evolution-api.client";
import { CreateCampaignUseCase } from "./application/use-cases/create-campaign.use-case";
import { ListCampaignsUseCase } from "./application/use-cases/list-campaigns.use-case";
import { GetCampaignUseCase } from "./application/use-cases/get-campaign.use-case";
import { DeleteCampaignUseCase } from "./application/use-cases/delete-campaign.use-case";
import { StartCampaignUseCase } from "./application/use-cases/start-campaign.use-case";
import { PauseCampaignUseCase } from "./application/use-cases/pause-campaign.use-case";
import { ResumeCampaignUseCase } from "./application/use-cases/resume-campaign.use-case";
import { AddCampaignStepUseCase } from "./application/use-cases/add-campaign-step.use-case";
import { AddRecipientsUseCase } from "./application/use-cases/add-recipients.use-case";
import { GetCampaignStatsUseCase } from "./application/use-cases/get-campaign-stats.use-case";
import { PrismaCampaignsRepository } from "@/infra/database/prisma/repositories/campaigns/prisma-campaigns.repository";
import { PrismaCampaignSendsRepository } from "@/infra/database/prisma/repositories/campaigns/prisma-campaign-sends.repository";
import { CampaignWorkerService } from "@/infra/scheduled/campaign-worker.service";
import { CampaignsController } from "@/infra/controllers/campaigns.controller";

@Module({
  imports: [ScheduleModule.forRoot(), AuthModule],
  controllers: [CampaignsController],
  providers: [
    // Repositories
    { provide: CampaignsRepository, useClass: PrismaCampaignsRepository },
    { provide: CampaignSendsRepository, useClass: PrismaCampaignSendsRepository },
    // Ports
    { provide: EvolutionApiPort, useClass: EvolutionApiClient },
    // Services
    AntiBlockService,
    StepExecutorService,
    CampaignWorkerService,
    // Use Cases
    CreateCampaignUseCase,
    ListCampaignsUseCase,
    GetCampaignUseCase,
    DeleteCampaignUseCase,
    StartCampaignUseCase,
    PauseCampaignUseCase,
    ResumeCampaignUseCase,
    AddCampaignStepUseCase,
    AddRecipientsUseCase,
    GetCampaignStatsUseCase,
  ],
  exports: [
    CampaignsRepository,
    CampaignSendsRepository,
    CreateCampaignUseCase,
    ListCampaignsUseCase,
    GetCampaignUseCase,
    StartCampaignUseCase,
    PauseCampaignUseCase,
  ],
})
export class CampaignsModule {}
