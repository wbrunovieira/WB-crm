import { Module } from "@nestjs/common";
import { AuthModule } from "@/infra/auth/auth.module";
import { PartnersRepository } from "./application/repositories/partners.repository";
import { PrismaPartnersRepository } from "@/infra/database/prisma/repositories/partners/prisma-partners.repository";
import { GetPartnersUseCase } from "./application/use-cases/get-partners.use-case";
import { GetPartnerByIdUseCase } from "./application/use-cases/get-partner-by-id.use-case";
import { CreatePartnerUseCase } from "./application/use-cases/create-partner.use-case";
import { UpdatePartnerUseCase } from "./application/use-cases/update-partner.use-case";
import { DeletePartnerUseCase } from "./application/use-cases/delete-partner.use-case";
import { UpdatePartnerLastContactUseCase } from "./application/use-cases/update-partner-last-contact.use-case";
import { PartnersController } from "@/infra/controllers/partners.controller";

@Module({
  imports: [AuthModule],
  controllers: [PartnersController],
  providers: [
    { provide: PartnersRepository, useClass: PrismaPartnersRepository },
    GetPartnersUseCase,
    GetPartnerByIdUseCase,
    CreatePartnerUseCase,
    UpdatePartnerUseCase,
    DeletePartnerUseCase,
    UpdatePartnerLastContactUseCase,
  ],
})
export class PartnersModule {}
