import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { EmailCampaignStepTranslationsRepository } from "@/domain/email-campaigns/application/repositories/email-campaign-step-translations.repository";
import { EmailCampaignStepTranslation } from "@/domain/email-campaigns/enterprise/entities/email-campaign-step-translation.entity";
import { UniqueEntityID } from "@/core/unique-entity-id";

type Row = { id: string; stepId: string; language: string; subject: string; bodyHtml: string };

@Injectable()
export class PrismaEmailCampaignStepTranslationsRepository implements EmailCampaignStepTranslationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toDomain(raw: Row): EmailCampaignStepTranslation {
    return EmailCampaignStepTranslation.reconstitute(
      { stepId: raw.stepId, language: raw.language, subject: raw.subject, bodyHtml: raw.bodyHtml },
      new UniqueEntityID(raw.id),
    );
  }

  async findByStep(stepId: string) {
    const rows = await this.prisma.emailCampaignStepTranslation.findMany({ where: { stepId } });
    return rows.map((r) => this.toDomain(r));
  }

  async findByStepAndLanguage(stepId: string, language: string) {
    const raw = await this.prisma.emailCampaignStepTranslation.findUnique({
      where: { stepId_language: { stepId, language } },
    });
    return raw ? this.toDomain(raw) : null;
  }

  async upsert(t: EmailCampaignStepTranslation) {
    await this.prisma.emailCampaignStepTranslation.upsert({
      where: { stepId_language: { stepId: t.stepId, language: t.language } },
      create: { id: t.id.toString(), stepId: t.stepId, language: t.language, subject: t.subject, bodyHtml: t.bodyHtml },
      update: { subject: t.subject, bodyHtml: t.bodyHtml },
    });
  }

  async delete(stepId: string, language: string) {
    await this.prisma.emailCampaignStepTranslation.deleteMany({ where: { stepId, language } });
  }
}
