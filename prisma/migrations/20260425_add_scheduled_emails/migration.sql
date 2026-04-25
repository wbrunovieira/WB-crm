-- CreateTable
CREATE TABLE "scheduled_emails" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3),
    "failReason" TEXT,
    "recipientEmail" TEXT NOT NULL,
    "organizerEmail" TEXT,
    "meetingTitle" TEXT NOT NULL,
    "meetingStartAt" TIMESTAMP(3) NOT NULL,
    "meetingEndAt" TIMESTAMP(3),
    "meetingDescription" TEXT,
    "meetLink" TEXT,
    "contactName" TEXT,
    "companyName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scheduled_emails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scheduled_emails_scheduledFor_status_idx" ON "scheduled_emails"("scheduledFor", "status");

-- CreateIndex
CREATE INDEX "scheduled_emails_meetingId_idx" ON "scheduled_emails"("meetingId");

-- AddForeignKey
ALTER TABLE "scheduled_emails" ADD CONSTRAINT "scheduled_emails_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
