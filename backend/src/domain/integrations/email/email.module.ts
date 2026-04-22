import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { SharedInfraModule } from "@/infra/shared/shared-infra.module";
import { ActivitiesModule } from "@/domain/activities/activities.module";
import { AuthModule } from "@/infra/auth/auth.module";

// Ports
import { GmailPort } from "./application/ports/gmail.port";
import { GoogleOAuthPort } from "./application/ports/google-oauth.port";

// Repositories (abstract)
import { EmailMessagesRepository } from "./application/repositories/email-messages.repository";
import { EmailTrackingRepository } from "./application/repositories/email-tracking.repository";

// Use Cases
import { ProcessIncomingEmailUseCase } from "./application/use-cases/process-incoming-email.use-case";
import { SendEmailUseCase } from "./application/use-cases/send-email.use-case";
import { PollGmailUseCase } from "./application/use-cases/poll-gmail.use-case";
import { TrackEmailOpenUseCase } from "./application/use-cases/track-email-open.use-case";
import { TrackEmailClickUseCase } from "./application/use-cases/track-email-click.use-case";
import { GetGmailTemplatesUseCase, CreateGmailTemplateUseCase, UpdateGmailTemplateUseCase, DeleteGmailTemplateUseCase } from "./application/use-cases/gmail-templates.use-cases";
import { GetGoogleTokenUseCase, SaveGoogleTokenUseCase, DeleteGoogleTokenUseCase, UpdateTokenHistoryIdUseCase } from "./application/use-cases/google-token.use-cases";
import { GetSendAsAliasesUseCase } from "./application/use-cases/get-send-as-aliases.use-case";
import { GoogleTokenRepository } from "./application/repositories/google-token.repository";
import { PrismaGoogleTokenRepository } from "./infra/prisma-google-token.repository";

// Repositories
import { GmailTemplatesRepository } from "./application/repositories/gmail-templates.repository";

// Infrastructure
import { GmailClient } from "./infra/gmail.client";
import { GoogleOAuthService } from "./infra/google-oauth.service";
import { PrismaEmailMessagesRepository } from "./infra/prisma-email-messages.repository";
import { PrismaEmailTrackingRepository } from "./infra/prisma-email-tracking.repository";
import { EmailWebhookController } from "./infra/controllers/email-webhook.controller";
import { EmailController } from "./infra/controllers/email.controller";
import { GmailPollCronService } from "./infra/scheduled/gmail-poll-cron.service";
import { PrismaGmailTemplatesRepository } from "./infra/prisma-gmail-templates.repository";

@Module({
  imports: [ScheduleModule.forRoot(), SharedInfraModule, ActivitiesModule, AuthModule],
  controllers: [EmailWebhookController, EmailController],
  providers: [
    // Use Cases
    ProcessIncomingEmailUseCase,
    SendEmailUseCase,
    PollGmailUseCase,
    TrackEmailOpenUseCase,
    TrackEmailClickUseCase,
    GetGmailTemplatesUseCase,
    CreateGmailTemplateUseCase,
    UpdateGmailTemplateUseCase,
    DeleteGmailTemplateUseCase,
    GetGoogleTokenUseCase,
    SaveGoogleTokenUseCase,
    DeleteGoogleTokenUseCase,
    UpdateTokenHistoryIdUseCase,
    GetSendAsAliasesUseCase,

    // Port implementations
    { provide: GmailPort, useClass: GmailClient },
    { provide: GoogleOAuthPort, useClass: GoogleOAuthService },

    // Repository implementations
    PrismaEmailMessagesRepository,
    { provide: EmailMessagesRepository, useClass: PrismaEmailMessagesRepository },
    PrismaEmailTrackingRepository,
    { provide: EmailTrackingRepository, useClass: PrismaEmailTrackingRepository },

    // Gmail templates
    PrismaGmailTemplatesRepository,
    { provide: GmailTemplatesRepository, useClass: PrismaGmailTemplatesRepository },
    // Google token
    PrismaGoogleTokenRepository,
    { provide: GoogleTokenRepository, useClass: PrismaGoogleTokenRepository },

    // Scheduled
    GmailPollCronService,
  ],
  exports: [EmailMessagesRepository, EmailTrackingRepository],
})
export class EmailModule {}
