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

// Infrastructure
import { GmailClient } from "./infra/gmail.client";
import { GoogleOAuthService } from "./infra/google-oauth.service";
import { PrismaEmailMessagesRepository } from "./infra/prisma-email-messages.repository";
import { PrismaEmailTrackingRepository } from "./infra/prisma-email-tracking.repository";
import { EmailWebhookController } from "./infra/controllers/email-webhook.controller";
import { EmailController } from "./infra/controllers/email.controller";
import { GmailPollCronService } from "./infra/scheduled/gmail-poll-cron.service";

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

    // Port implementations
    { provide: GmailPort, useClass: GmailClient },
    { provide: GoogleOAuthPort, useClass: GoogleOAuthService },

    // Repository implementations
    PrismaEmailMessagesRepository,
    { provide: EmailMessagesRepository, useClass: PrismaEmailMessagesRepository },
    PrismaEmailTrackingRepository,
    { provide: EmailTrackingRepository, useClass: PrismaEmailTrackingRepository },

    // Scheduled
    GmailPollCronService,
  ],
  exports: [EmailMessagesRepository, EmailTrackingRepository],
})
export class EmailModule {}
