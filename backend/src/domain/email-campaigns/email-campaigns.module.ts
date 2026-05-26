import { Module } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { AuthModule } from "@/infra/auth/auth.module";
import { EmailModule } from "@/domain/integrations/email/email.module";

import { EmailCampaignsController } from "@/infra/controllers/email-campaigns.controller";
import { EmailCampaignCronService } from "@/infra/scheduled/email-campaign-cron.service";

import { CreateEmailCampaignUseCase } from "./application/use-cases/create-email-campaign.use-case";
import { AddCampaignStepUseCase } from "./application/use-cases/add-campaign-step.use-case";
import { AddRecipientsUseCase } from "./application/use-cases/add-recipients.use-case";
import { SendCampaignStepUseCase } from "./application/use-cases/send-campaign-step.use-case";
import { GetCampaignStatsUseCase } from "./application/use-cases/get-campaign-stats.use-case";
import { AddToSuppressionUseCase } from "./application/use-cases/add-to-suppression.use-case";
import { UnsubscribeRecipientUseCase } from "./application/use-cases/unsubscribe-recipient.use-case";
import { HandleGmailBounceUseCase } from "./application/use-cases/handle-gmail-bounce.use-case";
import { BulkEnrollUseCase } from "./application/use-cases/bulk-enroll.use-case";
import { VariableResolverService } from "./application/services/variable-resolver.service";

import { EmailCampaignsRepository } from "./application/repositories/email-campaigns.repository";
import { EmailCampaignStepsRepository } from "./application/repositories/email-campaign-steps.repository";
import { EmailCampaignRecipientsRepository } from "./application/repositories/email-campaign-recipients.repository";
import { EmailCampaignSendsRepository } from "./application/repositories/email-campaign-sends.repository";
import { EmailSuppressionsRepository } from "./application/repositories/email-suppressions.repository";

import { PrismaEmailCampaignsRepository } from "@/infra/database/prisma/repositories/email-campaigns/prisma-email-campaigns.repository";
import { PrismaEmailCampaignStepsRepository } from "@/infra/database/prisma/repositories/email-campaigns/prisma-email-campaign-steps.repository";
import { PrismaEmailCampaignRecipientsRepository } from "@/infra/database/prisma/repositories/email-campaigns/prisma-email-campaign-recipients.repository";
import { PrismaEmailCampaignSendsRepository } from "@/infra/database/prisma/repositories/email-campaigns/prisma-email-campaign-sends.repository";
import { PrismaEmailSuppressionsRepository } from "@/infra/database/prisma/repositories/email-campaigns/prisma-email-suppressions.repository";

@Module({
  imports: [AuthModule, EmailModule],
  controllers: [EmailCampaignsController],
  providers: [
    PrismaService,
    VariableResolverService,
    EmailCampaignCronService,

    CreateEmailCampaignUseCase,
    AddCampaignStepUseCase,
    AddRecipientsUseCase,
    SendCampaignStepUseCase,
    GetCampaignStatsUseCase,
    AddToSuppressionUseCase,
    UnsubscribeRecipientUseCase,
    HandleGmailBounceUseCase,
    BulkEnrollUseCase,

    { provide: EmailCampaignsRepository, useClass: PrismaEmailCampaignsRepository },
    { provide: EmailCampaignStepsRepository, useClass: PrismaEmailCampaignStepsRepository },
    { provide: EmailCampaignRecipientsRepository, useClass: PrismaEmailCampaignRecipientsRepository },
    { provide: EmailCampaignSendsRepository, useClass: PrismaEmailCampaignSendsRepository },
    { provide: EmailSuppressionsRepository, useClass: PrismaEmailSuppressionsRepository },
  ],
})
export class EmailCampaignsModule {}
