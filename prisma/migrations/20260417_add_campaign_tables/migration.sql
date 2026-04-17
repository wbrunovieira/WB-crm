-- Migration: add_campaign_tables
-- Tabelas para automação de campanhas WhatsApp
-- Apenas CREATE TABLE/TYPE — nenhuma tabela existente é alterada

-- Enums
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'FINISHED');
CREATE TYPE "StepType"       AS ENUM ('TEXT', 'MEDIA', 'AUDIO', 'DELAY', 'TYPING');
CREATE TYPE "SendStatus"     AS ENUM ('PENDING', 'RUNNING', 'DONE', 'FAILED', 'OPTED_OUT');

-- Campaigns
CREATE TABLE "campaigns" (
    "id"              TEXT        NOT NULL,
    "ownerId"         TEXT        NOT NULL,
    "name"            TEXT        NOT NULL,
    "description"     TEXT,
    "status"          "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "instanceName"    TEXT        NOT NULL,
    "antiBlockConfig" TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "campaigns_ownerId_idx"  ON "campaigns"("ownerId");
CREATE INDEX "campaigns_status_idx"   ON "campaigns"("status");

ALTER TABLE "campaigns"
    ADD CONSTRAINT "campaigns_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Campaign Steps
CREATE TABLE "campaign_steps" (
    "id"            TEXT     NOT NULL,
    "campaignId"    TEXT     NOT NULL,
    "order"         INTEGER  NOT NULL,
    "type"          "StepType" NOT NULL,
    "text"          TEXT,
    "mediaUrl"      TEXT,
    "mediaCaption"  TEXT,
    "mediaType"     TEXT,
    "delaySeconds"  INTEGER,
    "typingSeconds" INTEGER,

    CONSTRAINT "campaign_steps_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "campaign_steps_campaignId_order_idx" ON "campaign_steps"("campaignId", "order");

ALTER TABLE "campaign_steps"
    ADD CONSTRAINT "campaign_steps_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Campaign Sends
CREATE TABLE "campaign_sends" (
    "id"           TEXT        NOT NULL,
    "campaignId"   TEXT        NOT NULL,
    "leadId"       TEXT,
    "phone"        TEXT        NOT NULL,
    "status"       "SendStatus" NOT NULL DEFAULT 'PENDING',
    "currentStep"  INTEGER     NOT NULL DEFAULT 0,
    "scheduledAt"  TIMESTAMP(3),
    "startedAt"    TIMESTAMP(3),
    "finishedAt"   TIMESTAMP(3),
    "errorMessage" TEXT,

    CONSTRAINT "campaign_sends_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "campaign_sends_campaignId_idx"          ON "campaign_sends"("campaignId");
CREATE INDEX "campaign_sends_status_scheduledAt_idx"  ON "campaign_sends"("status", "scheduledAt");
CREATE INDEX "campaign_sends_leadId_idx"              ON "campaign_sends"("leadId");

ALTER TABLE "campaign_sends"
    ADD CONSTRAINT "campaign_sends_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "campaign_sends"
    ADD CONSTRAINT "campaign_sends_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
