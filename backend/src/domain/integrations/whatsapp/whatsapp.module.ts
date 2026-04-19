import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { SharedInfraModule } from "@/infra/shared/shared-infra.module";
import { ActivitiesModule } from "@/domain/activities/activities.module";
import { AuthModule } from "@/infra/auth/auth.module";

// Ports
import { EvolutionApiPort } from "./application/ports/evolution-api.port";

// Repository abstract
import { WhatsAppMessagesRepository } from "./application/repositories/whatsapp-messages.repository";

// Use Cases
import { HandleWhatsAppWebhookUseCase } from "./application/use-cases/handle-whatsapp-webhook.use-case";
import { ProcessWhatsAppMessageUseCase } from "./application/use-cases/process-whatsapp-message.use-case";
import { ProcessWhatsAppMediaUseCase } from "./application/use-cases/process-whatsapp-media.use-case";
import { PollWhatsAppTranscriptionsUseCase } from "./application/use-cases/poll-whatsapp-transcriptions.use-case";
import { SendWhatsAppMessageUseCase } from "./application/use-cases/send-whatsapp-message.use-case";

// Infrastructure
import { EvolutionApiClient } from "./infra/evolution-api.client";
import { PrismaWhatsAppMessagesRepository } from "./infra/prisma-whatsapp-messages.repository";
import { WhatsAppWebhookController } from "./infra/controllers/whatsapp-webhook.controller";
import { WhatsAppController } from "./infra/controllers/whatsapp.controller";
import { WhatsAppTranscriptionCronService } from "./infra/scheduled/whatsapp-transcription-cron.service";

@Module({
  imports: [ScheduleModule.forRoot(), SharedInfraModule, ActivitiesModule, AuthModule],
  controllers: [WhatsAppWebhookController, WhatsAppController],
  providers: [
    // Use Cases
    HandleWhatsAppWebhookUseCase,
    ProcessWhatsAppMessageUseCase,
    ProcessWhatsAppMediaUseCase,
    PollWhatsAppTranscriptionsUseCase,
    SendWhatsAppMessageUseCase,
    // Port implementations
    { provide: EvolutionApiPort, useClass: EvolutionApiClient },
    // Repository
    PrismaWhatsAppMessagesRepository,
    { provide: WhatsAppMessagesRepository, useClass: PrismaWhatsAppMessagesRepository },
    // Scheduled
    WhatsAppTranscriptionCronService,
  ],
})
export class WhatsAppModule {}
