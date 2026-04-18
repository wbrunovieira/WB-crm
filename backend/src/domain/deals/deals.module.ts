import { Module } from "@nestjs/common";
import { AuthModule } from "@/infra/auth/auth.module";
import { DealsRepository } from "./application/repositories/deals.repository";
import { PrismaDealsRepository } from "@/infra/database/prisma/repositories/deals/prisma-deals.repository";
import { GetDealsUseCase } from "./application/use-cases/get-deals.use-case";
import { GetDealByIdUseCase } from "./application/use-cases/get-deal-by-id.use-case";
import { CreateDealUseCase } from "./application/use-cases/create-deal.use-case";
import { UpdateDealUseCase } from "./application/use-cases/update-deal.use-case";
import { DeleteDealUseCase } from "./application/use-cases/delete-deal.use-case";
import { UpdateDealStageUseCase } from "./application/use-cases/update-deal-stage.use-case";
import { DealsController } from "@/infra/controllers/deals.controller";

@Module({
  imports: [AuthModule],
  controllers: [DealsController],
  providers: [
    { provide: DealsRepository, useClass: PrismaDealsRepository },
    GetDealsUseCase,
    GetDealByIdUseCase,
    CreateDealUseCase,
    UpdateDealUseCase,
    DeleteDealUseCase,
    UpdateDealStageUseCase,
  ],
  exports: [DealsRepository],
})
export class DealsModule {}
