export interface StepContent {
  subject: string;
  bodyHtml: string;
}

export interface StepTranslationLite {
  language: string;
  subject: string;
  bodyHtml: string;
}

/**
 * Content of a campaign step for a given language: the matching translation if one
 * exists, otherwise the step's own subject/bodyHtml (the default — pt — fallback).
 */
export function resolveStepContent(
  base: StepContent,
  translations: StepTranslationLite[],
  language: string,
): StepContent {
  const match = translations.find((t) => t.language === language);
  return match
    ? { subject: match.subject, bodyHtml: match.bodyHtml }
    : { subject: base.subject, bodyHtml: base.bodyHtml };
}
