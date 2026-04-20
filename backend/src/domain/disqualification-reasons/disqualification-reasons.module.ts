import { Module } from "@nestjs/common";
import { AuthModule } from "@/infra/auth/auth.module";
import { DisqualificationReasonsRepository } from "./application/repositories/disqualification-reasons.repository";
import {
  GetDisqualificationReasonsUseCase,
  CreateDisqualificationReasonUseCase,
  DeleteDisqualificationReasonUseCase,
} from "./application/use-cases/disqualification-reasons.use-cases";
import { PrismaDisqualificationReasonsRepository } from "./infra/repositories/prisma-disqualification-reasons.repository";
import { DisqualificationReasonsController } from "./infra/controllers/disqualification-reasons.controller";

@Module({
  imports: [AuthModule],
  controllers: [DisqualificationReasonsController],
  providers: [
    GetDisqualificationReasonsUseCase,
    CreateDisqualificationReasonUseCase,
    DeleteDisqualificationReasonUseCase,
    { provide: DisqualificationReasonsRepository, useClass: PrismaDisqualificationReasonsRepository },
  ],
  exports: [DisqualificationReasonsRepository],
})
export class DisqualificationReasonsModule {}
