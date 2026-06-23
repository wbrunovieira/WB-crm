import { Module, forwardRef } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { AuthModule } from "@/infra/auth/auth.module";
import { EmailModule } from "@/domain/integrations/email/email.module";
import { ActivitiesModule } from "@/domain/activities/activities.module";

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
import { EnrollEntityUseCase } from "./application/use-cases/enroll-entity.use-case";
import { TriggerCampaignSendNowUseCase } from "./application/use-cases/trigger-campaign-send-now.use-case";
import { GetCampaignProgressUseCase } from "./application/use-cases/get-campaign-progress.use-case";
import { ClearCampaignRecipientsUseCase } from "./application/use-cases/clear-campaign-recipients.use-case";
import { GetCampaignSourceGroupsUseCase, SearchEnrollableRecipientsUseCase, ListSuppressionsWithNamesUseCase } from "./application/use-cases/campaign-recipient-queries.use-cases";
import { ListEmailCampaignsUseCase, DeleteEmailCampaignUseCase, StartEmailCampaignUseCase, PauseEmailCampaignUseCase, ActivateCampaignForSendNowUseCase } from "./application/use-cases/email-campaign-lifecycle.use-cases";
import { RemoveSuppressionUseCase } from "./application/use-cases/remove-suppression.use-case";
import { TrackEmailOpenUseCase, TrackEmailClickUseCase } from "./application/use-cases/email-tracking.use-cases";
import { UpdateEmailCampaignUseCase, UpdateCampaignStepUseCase, GetCampaignStepsUseCase } from "./application/use-cases/update-campaign.use-cases";
import { VariableResolverService } from "./application/services/variable-resolver.service";

import { EmailCampaignsRepository } from "./application/repositories/email-campaigns.repository";
import { EmailCampaignStepsRepository } from "./application/repositories/email-campaign-steps.repository";
import { EmailCampaignRecipientsRepository } from "./application/repositories/email-campaign-recipients.repository";
import { EmailCampaignSendsRepository } from "./application/repositories/email-campaign-sends.repository";
import { EmailSuppressionsRepository } from "./application/repositories/email-suppressions.repository";
import { EnrollmentSourceRepository } from "./application/repositories/enrollment-source.repository";
import { PrismaEnrollmentSourceRepository } from "@/infra/database/prisma/repositories/email-campaigns/prisma-enrollment-source.repository";

import { PrismaEmailCampaignsRepository } from "@/infra/database/prisma/repositories/email-campaigns/prisma-email-campaigns.repository";
import { PrismaEmailCampaignStepsRepository } from "@/infra/database/prisma/repositories/email-campaigns/prisma-email-campaign-steps.repository";
import { PrismaEmailCampaignRecipientsRepository } from "@/infra/database/prisma/repositories/email-campaigns/prisma-email-campaign-recipients.repository";
import { PrismaEmailCampaignSendsRepository } from "@/infra/database/prisma/repositories/email-campaigns/prisma-email-campaign-sends.repository";
import { PrismaEmailSuppressionsRepository } from "@/infra/database/prisma/repositories/email-campaigns/prisma-email-suppressions.repository";
import { RecipientContextPort } from "./application/ports/recipient-context.port";
import { PrismaRecipientContextAdapter } from "@/infra/database/prisma/adapters/prisma-recipient-context.adapter";

@Module({
  imports: [AuthModule, forwardRef(() => EmailModule), ActivitiesModule],
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
    EnrollEntityUseCase,
    TriggerCampaignSendNowUseCase,
    GetCampaignProgressUseCase,
    ClearCampaignRecipientsUseCase,
    GetCampaignSourceGroupsUseCase,
    SearchEnrollableRecipientsUseCase,
    ListSuppressionsWithNamesUseCase,
    ListEmailCampaignsUseCase,
    DeleteEmailCampaignUseCase,
    StartEmailCampaignUseCase,
    PauseEmailCampaignUseCase,
    ActivateCampaignForSendNowUseCase,
    RemoveSuppressionUseCase,
    TrackEmailOpenUseCase,
    TrackEmailClickUseCase,
    UpdateEmailCampaignUseCase,
    UpdateCampaignStepUseCase,
    GetCampaignStepsUseCase,

    { provide: EmailCampaignsRepository, useClass: PrismaEmailCampaignsRepository },
    { provide: EmailCampaignStepsRepository, useClass: PrismaEmailCampaignStepsRepository },
    { provide: EmailCampaignRecipientsRepository, useClass: PrismaEmailCampaignRecipientsRepository },
    { provide: EmailCampaignSendsRepository, useClass: PrismaEmailCampaignSendsRepository },
    { provide: EmailSuppressionsRepository, useClass: PrismaEmailSuppressionsRepository },
    { provide: EnrollmentSourceRepository, useClass: PrismaEnrollmentSourceRepository },
    { provide: RecipientContextPort, useClass: PrismaRecipientContextAdapter },
  ],
  exports: [
    EmailCampaignsRepository,
    EmailCampaignRecipientsRepository,
    EmailCampaignSendsRepository,
    EmailSuppressionsRepository,
  ],
})
export class EmailCampaignsModule {}
