import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { SharedInfraModule } from "@/infra/shared/shared-infra.module";
import { ActivitiesModule } from "@/domain/activities/activities.module";
import { AuthModule } from "@/infra/auth/auth.module";

// Ports
import { EvolutionApiPort } from "./application/ports/evolution-api.port";

// Repository abstracts
import { WhatsAppMessagesRepository } from "./application/repositories/whatsapp-messages.repository";
import { WhatsAppEntityRepository } from "./application/repositories/whatsapp-entity.repository";

// Use Cases
import { HandleWhatsAppWebhookUseCase } from "./application/use-cases/handle-whatsapp-webhook.use-case";
import { ProcessWhatsAppMessageUseCase } from "./application/use-cases/process-whatsapp-message.use-case";
import { ProcessWhatsAppMediaUseCase } from "./application/use-cases/process-whatsapp-media.use-case";
import { PollWhatsAppTranscriptionsUseCase } from "./application/use-cases/poll-whatsapp-transcriptions.use-case";
import { SendWhatsAppMessageUseCase } from "./application/use-cases/send-whatsapp-message.use-case";
import { SendWhatsAppMediaUseCase } from "./application/use-cases/send-whatsapp-media.use-case";
import { GetWhatsAppMediaMessagesUseCase } from "./application/use-cases/get-whatsapp-media-messages.use-case";
import { SaveWhatsAppVerificationUseCase } from "./application/use-cases/save-whatsapp-verification.use-case";
import { SaveWhatsAppNumberUseCase } from "./application/use-cases/save-whatsapp-number.use-case";
import { GetWhatsAppTemplatesUseCase, CreateWhatsAppTemplateUseCase, UpdateWhatsAppTemplateUseCase, DeleteWhatsAppTemplateUseCase } from "./application/use-cases/whatsapp-templates.use-cases";
import { GetWhatsAppMessageByIdUseCase } from "./application/use-cases/get-whatsapp-message-by-id.use-case";

// Repository abstracts
import { WhatsAppTemplatesRepository } from "./application/repositories/whatsapp-templates.repository";

// Infrastructure
import { EvolutionApiClient } from "./infra/evolution-api.client";
import { PrismaWhatsAppTemplatesRepository } from "./infra/prisma-whatsapp-templates.repository";
import { PrismaWhatsAppMessagesRepository } from "./infra/prisma-whatsapp-messages.repository";
import { PrismaWhatsAppEntityRepository } from "./infra/prisma-whatsapp-entity.repository";
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
    SendWhatsAppMediaUseCase,
    GetWhatsAppMediaMessagesUseCase,
    SaveWhatsAppVerificationUseCase,
    SaveWhatsAppNumberUseCase,
    GetWhatsAppTemplatesUseCase,
    CreateWhatsAppTemplateUseCase,
    UpdateWhatsAppTemplateUseCase,
    DeleteWhatsAppTemplateUseCase,
    GetWhatsAppMessageByIdUseCase,
    // Port implementations
    { provide: EvolutionApiPort, useClass: EvolutionApiClient },
    // Repositories
    PrismaWhatsAppMessagesRepository,
    { provide: WhatsAppMessagesRepository, useClass: PrismaWhatsAppMessagesRepository },
    PrismaWhatsAppEntityRepository,
    { provide: WhatsAppEntityRepository, useClass: PrismaWhatsAppEntityRepository },
    PrismaWhatsAppTemplatesRepository,
    { provide: WhatsAppTemplatesRepository, useClass: PrismaWhatsAppTemplatesRepository },
    // Scheduled
    WhatsAppTranscriptionCronService,
  ],
})
export class WhatsAppModule {}
