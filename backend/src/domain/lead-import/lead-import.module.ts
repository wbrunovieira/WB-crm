import { Module } from "@nestjs/common";
import { AuthModule } from "@/infra/auth/auth.module";
import { LeadImportRepository } from "./application/repositories/lead-import.repository";
import { ImportLeadsUseCase } from "./application/use-cases/import-leads.use-case";
import { PrismaLeadImportRepository } from "./infra/repositories/prisma-lead-import.repository";
import { LeadImportController } from "./infra/controllers/lead-import.controller";

@Module({
  imports: [AuthModule],
  controllers: [LeadImportController],
  providers: [
    ImportLeadsUseCase,
    { provide: LeadImportRepository, useClass: PrismaLeadImportRepository },
  ],
})
export class LeadImportModule {}
