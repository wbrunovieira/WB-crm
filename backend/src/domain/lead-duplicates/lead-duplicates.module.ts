import { Module } from "@nestjs/common";
import { AuthModule } from "@/infra/auth/auth.module";
import { LeadDuplicatesRepository } from "./application/repositories/lead-duplicates.repository";
import { CheckLeadDuplicatesUseCase } from "./application/use-cases/check-lead-duplicates.use-case";
import { PrismaLeadDuplicatesRepository } from "./infra/repositories/prisma-lead-duplicates.repository";
import { LeadDuplicatesController } from "./infra/controllers/lead-duplicates.controller";

@Module({
  imports: [AuthModule],
  controllers: [LeadDuplicatesController],
  providers: [
    CheckLeadDuplicatesUseCase,
    { provide: LeadDuplicatesRepository, useClass: PrismaLeadDuplicatesRepository },
  ],
})
export class LeadDuplicatesModule {}
