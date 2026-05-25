import { Module } from "@nestjs/common";
import { AuthModule } from "@/infra/auth/auth.module";
import { BotFlowsRepository } from "./application/repositories/bot-flows.repository";
import { BotFlowSessionsRepository } from "./application/repositories/bot-flow-sessions.repository";
import { PrismaBotFlowsRepository } from "@/infra/database/prisma/repositories/bot-flows/prisma-bot-flows.repository";
import { PrismaBotFlowSessionsRepository } from "@/infra/database/prisma/repositories/bot-flows/prisma-bot-flow-sessions.repository";
import { CreateBotFlowUseCase } from "./application/use-cases/create-bot-flow.use-case";
import { SaveBotFlowUseCase } from "./application/use-cases/save-bot-flow.use-case";
import { GetBotFlowUseCase } from "./application/use-cases/get-bot-flow.use-case";
import { ListBotFlowsUseCase } from "./application/use-cases/list-bot-flows.use-case";
import { DeleteBotFlowUseCase } from "./application/use-cases/delete-bot-flow.use-case";
import { ToggleBotFlowUseCase } from "./application/use-cases/toggle-bot-flow.use-case";
import { ProcessBotFlowMessageUseCase } from "./application/use-cases/process-bot-flow-message.use-case";
import { BotFlowMessageListener } from "./application/listeners/bot-flow-message.listener";
import { BotFlowsController } from "@/infra/controllers/bot-flows.controller";
import { PrismaService } from "@/infra/database/prisma.service";
import { EvolutionApiPort } from "@/domain/campaigns/application/ports/evolution-api.port";
import { EvolutionApiClient } from "@/domain/campaigns/infra/evolution/evolution-api.client";

@Module({
  imports: [AuthModule],
  controllers: [BotFlowsController],
  providers: [
    PrismaService,
    { provide: BotFlowsRepository, useClass: PrismaBotFlowsRepository },
    { provide: BotFlowSessionsRepository, useClass: PrismaBotFlowSessionsRepository },
    { provide: EvolutionApiPort, useClass: EvolutionApiClient },
    CreateBotFlowUseCase,
    SaveBotFlowUseCase,
    GetBotFlowUseCase,
    ListBotFlowsUseCase,
    DeleteBotFlowUseCase,
    ToggleBotFlowUseCase,
    ProcessBotFlowMessageUseCase,
    BotFlowMessageListener,
  ],
})
export class BotFlowsModule {}
