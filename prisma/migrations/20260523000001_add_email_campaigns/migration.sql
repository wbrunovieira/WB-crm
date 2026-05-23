-- CreateTable
CREATE TABLE "email_campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fromEmail" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_campaign_steps" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "delayDays" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "email_campaign_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_campaign_recipients" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "recipientType" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "company" TEXT,
    "role" TEXT,
    "customVars" TEXT,
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "email_campaign_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_campaign_sends" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "gmailMessageId" TEXT,
    "gmailThreadId" TEXT,

    CONSTRAINT "email_campaign_sends_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_campaigns_ownerId_status_idx" ON "email_campaigns"("ownerId", "status");

-- CreateIndex
CREATE INDEX "email_campaign_steps_campaignId_order_idx" ON "email_campaign_steps"("campaignId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "email_campaign_recipients_campaignId_recipientId_recipientType_key" ON "email_campaign_recipients"("campaignId", "recipientId", "recipientType");

-- CreateIndex
CREATE INDEX "email_campaign_recipients_campaignId_status_idx" ON "email_campaign_recipients"("campaignId", "status");

-- CreateIndex
CREATE INDEX "email_campaign_sends_recipientId_stepId_idx" ON "email_campaign_sends"("recipientId", "stepId");

-- CreateIndex
CREATE INDEX "email_campaign_sends_stepId_idx" ON "email_campaign_sends"("stepId");

-- AddForeignKey
ALTER TABLE "email_campaigns" ADD CONSTRAINT "email_campaigns_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_campaign_steps" ADD CONSTRAINT "email_campaign_steps_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "email_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_campaign_recipients" ADD CONSTRAINT "email_campaign_recipients_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "email_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_campaign_sends" ADD CONSTRAINT "email_campaign_sends_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "email_campaign_recipients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_campaign_sends" ADD CONSTRAINT "email_campaign_sends_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "email_campaign_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
