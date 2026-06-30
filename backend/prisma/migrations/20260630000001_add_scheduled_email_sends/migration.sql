-- Activity: instante de envio de um e-mail agendado (clock icon enquanto pendente)
ALTER TABLE "activities" ADD COLUMN "scheduledSendAt" TIMESTAMP(3);

-- E-mail com envio programado para uma data/hora futura
CREATE TABLE "scheduled_email_sends" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "activityId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "scheduledSendAt" TIMESTAMP(3) NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "fromEmail" TEXT,
    "threadId" TEXT,
    "attachmentsJson" TEXT,
    "leadId" TEXT,
    "contactId" TEXT,
    "contactIdsJson" TEXT,
    "organizationId" TEXT,
    "dealId" TEXT,
    "sentMessageId" TEXT,
    "sentThreadId" TEXT,
    "failReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "scheduled_email_sends_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scheduled_email_sends_activityId_key" ON "scheduled_email_sends"("activityId");
CREATE INDEX "scheduled_email_sends_status_scheduledSendAt_idx" ON "scheduled_email_sends"("status", "scheduledSendAt");
CREATE INDEX "scheduled_email_sends_ownerId_idx" ON "scheduled_email_sends"("ownerId");
CREATE INDEX "scheduled_email_sends_leadId_idx" ON "scheduled_email_sends"("leadId");
CREATE INDEX "scheduled_email_sends_contactId_idx" ON "scheduled_email_sends"("contactId");
