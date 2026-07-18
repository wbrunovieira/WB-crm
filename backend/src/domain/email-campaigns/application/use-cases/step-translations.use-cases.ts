import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { CommLanguage } from "@/core/value-objects/comm-language";
import { EmailCampaignStepTranslation } from "../../enterprise/entities/email-campaign-step-translation.entity";
import { EmailCampaignStepsRepository } from "../repositories/email-campaign-steps.repository";
import { EmailCampaignsRepository } from "../repositories/email-campaigns.repository";
import { EmailCampaignStepTranslationsRepository } from "../repositories/email-campaign-step-translations.repository";
import { CampaignStepNotFoundError, CampaignAccessDeniedError } from "./update-campaign.use-cases";

/** Loads the step and verifies its campaign belongs to the caller. */
async function assertStepOwnership(
  steps: EmailCampaignStepsRepository,
  campaigns: EmailCampaignsRepository,
  stepId: string,
  ownerId: string,
): Promise<Either<Error, void>> {
  const step = await steps.findById(stepId);
  if (!step) return left(new CampaignStepNotFoundError());
  const campaign = await campaigns.findById(step.campaignId);
  if (!campaign || campaign.ownerId !== ownerId) return left(new CampaignAccessDeniedError());
  return right(undefined);
}

interface UpsertInput {
  stepId: string;
  ownerId: string;
  language: string;
  subject: string;
  bodyHtml: string;
}

/**
 * Create/update the localized content of a step for a language. "pt" is rejected —
 * the step's own subject/bodyHtml IS the Portuguese (default) content; translations
 * exist only for the other languages (en/es/it).
 */
@Injectable()
export class UpsertStepTranslationUseCase {
  constructor(
    private readonly steps: EmailCampaignStepsRepository,
    private readonly campaigns: EmailCampaignsRepository,
    private readonly translations: EmailCampaignStepTranslationsRepository,
  ) {}

  async execute(input: UpsertInput): Promise<Either<Error, { id: string }>> {
    const langR = CommLanguage.create(input.language);
    if (langR.isLeft()) return left(langR.value);
    const language = langR.value.value;
    if (language === CommLanguage.DEFAULT_CODE) {
      return left(new Error("O idioma padrão (pt) é o conteúdo base do step — crie traduções apenas para en/es/it."));
    }
    if (!input.subject?.trim() || !input.bodyHtml?.trim()) {
      return left(new Error("Assunto e corpo são obrigatórios."));
    }

    const access = await assertStepOwnership(this.steps, this.campaigns, input.stepId, input.ownerId);
    if (access.isLeft()) return left(access.value);

    const existing = await this.translations.findByStepAndLanguage(input.stepId, language);
    const entity = existing
      ? existing.update({ subject: input.subject, bodyHtml: input.bodyHtml })
      : EmailCampaignStepTranslation.create({ stepId: input.stepId, language, subject: input.subject, bodyHtml: input.bodyHtml });

    await this.translations.upsert(entity);
    return right({ id: entity.id.toString() });
  }
}

@Injectable()
export class ListStepTranslationsUseCase {
  constructor(
    private readonly steps: EmailCampaignStepsRepository,
    private readonly campaigns: EmailCampaignsRepository,
    private readonly translations: EmailCampaignStepTranslationsRepository,
  ) {}

  async execute(input: { stepId: string; ownerId: string }): Promise<Either<Error, EmailCampaignStepTranslation[]>> {
    const access = await assertStepOwnership(this.steps, this.campaigns, input.stepId, input.ownerId);
    if (access.isLeft()) return left(access.value);
    return right(await this.translations.findByStep(input.stepId));
  }
}

@Injectable()
export class RemoveStepTranslationUseCase {
  constructor(
    private readonly steps: EmailCampaignStepsRepository,
    private readonly campaigns: EmailCampaignsRepository,
    private readonly translations: EmailCampaignStepTranslationsRepository,
  ) {}

  async execute(input: { stepId: string; ownerId: string; language: string }): Promise<Either<Error, void>> {
    const langR = CommLanguage.create(input.language);
    if (langR.isLeft()) return left(langR.value);
    const access = await assertStepOwnership(this.steps, this.campaigns, input.stepId, input.ownerId);
    if (access.isLeft()) return left(access.value);
    await this.translations.delete(input.stepId, langR.value.value);
    return right(undefined);
  }
}
