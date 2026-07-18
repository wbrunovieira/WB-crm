-- Per-language content for campaign steps (base step subject/bodyHtml = pt fallback).
CREATE TABLE "email_campaign_step_translations" (
    "id"       TEXT NOT NULL,
    "stepId"   TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "subject"  TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    CONSTRAINT "email_campaign_step_translations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "email_campaign_step_translations_stepId_language_key" ON "email_campaign_step_translations"("stepId", "language");
CREATE INDEX "email_campaign_step_translations_stepId_idx" ON "email_campaign_step_translations"("stepId");
ALTER TABLE "email_campaign_step_translations" ADD CONSTRAINT "email_campaign_step_translations_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "email_campaign_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
