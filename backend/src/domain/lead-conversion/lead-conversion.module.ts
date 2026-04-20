import { Module } from "@nestjs/common";
import { AuthModule } from "@/infra/auth/auth.module";
import { LeadConversionRepository } from "./application/repositories/lead-conversion.repository";
import { ConvertLeadToOrganizationUseCase } from "./application/use-cases/convert-lead-to-organization.use-case";
import { PrismaLeadConversionRepository } from "./infra/repositories/prisma-lead-conversion.repository";
import { LeadConversionController } from "./infra/controllers/lead-conversion.controller";

@Module({
  imports: [AuthModule],
  controllers: [LeadConversionController],
  providers: [
    ConvertLeadToOrganizationUseCase,
    { provide: LeadConversionRepository, useClass: PrismaLeadConversionRepository },
  ],
})
export class LeadConversionModule {}
