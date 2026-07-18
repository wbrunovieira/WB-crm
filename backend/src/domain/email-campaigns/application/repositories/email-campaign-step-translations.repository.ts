import type { EmailCampaignStepTranslation } from "../../enterprise/entities/email-campaign-step-translation.entity";

export abstract class EmailCampaignStepTranslationsRepository {
  abstract findByStep(stepId: string): Promise<EmailCampaignStepTranslation[]>;
  abstract findByStepAndLanguage(stepId: string, language: string): Promise<EmailCampaignStepTranslation | null>;
  /** Insert or update by (stepId, language). */
  abstract upsert(translation: EmailCampaignStepTranslation): Promise<void>;
  abstract delete(stepId: string, language: string): Promise<void>;
}
