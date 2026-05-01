import { Module } from "@nestjs/common";
import { AuthModule } from "@/infra/auth/auth.module";
import { TransferAnalysisAgentPort } from "./application/ports/transfer-analysis-agent.port";
import { TriggerTransferAnalysisUseCase } from "./application/use-cases/trigger-transfer-analysis.use-case";
import { HttpTransferAnalysisAgentClient } from "./infra/http-transfer-analysis-agent.client";
import { TransferAnalysisController } from "./infra/controllers/transfer-analysis.controller";
import { GatekeeperAnalysisRepository } from "@/domain/integrations/gatekeeper-analysis/application/repositories/gatekeeper-analysis.repository";
import { CallAnalysisRepository } from "@/domain/integrations/call-analysis/application/repositories/call-analysis.repository";
import { PrismaGatekeeperAnalysisRepository } from "@/infra/database/prisma/repositories/gatekeeper-analysis/prisma-gatekeeper-analysis.repository";
import { PrismaCallAnalysisRepository } from "@/infra/database/prisma/repositories/call-analysis/prisma-call-analysis.repository";

@Module({
  imports: [AuthModule],
  controllers: [TransferAnalysisController],
  providers: [
    TriggerTransferAnalysisUseCase,
    { provide: TransferAnalysisAgentPort, useClass: HttpTransferAnalysisAgentClient },
    { provide: GatekeeperAnalysisRepository, useClass: PrismaGatekeeperAnalysisRepository },
    { provide: CallAnalysisRepository, useClass: PrismaCallAnalysisRepository },
  ],
})
export class TransferAnalysisModule {}
