-- CreateTable
CREATE TABLE "warming_accounts" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "phase" TEXT NOT NULL DEFAULT 'ramping',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warming_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warming_pool_emails" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "warming_pool_emails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warming_sends" (
    "id" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "gmailMessageId" TEXT,
    "gmailThreadId" TEXT,
    "isAutoReply" BOOLEAN NOT NULL DEFAULT false,
    "warmingAccountId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "warming_sends_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "warming_accounts_email_key" ON "warming_accounts"("email");
CREATE INDEX "warming_accounts_ownerId_isActive_idx" ON "warming_accounts"("ownerId", "isActive");
CREATE UNIQUE INDEX "warming_pool_emails_email_ownerId_key" ON "warming_pool_emails"("email", "ownerId");
CREATE INDEX "warming_pool_emails_ownerId_isActive_idx" ON "warming_pool_emails"("ownerId", "isActive");
CREATE INDEX "warming_sends_warmingAccountId_sentAt_idx" ON "warming_sends"("warmingAccountId", "sentAt");
CREATE INDEX "warming_sends_fromEmail_sentAt_idx" ON "warming_sends"("fromEmail", "sentAt");

-- AddForeignKey
ALTER TABLE "warming_accounts" ADD CONSTRAINT "warming_accounts_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warming_pool_emails" ADD CONSTRAINT "warming_pool_emails_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warming_sends" ADD CONSTRAINT "warming_sends_warmingAccountId_fkey" FOREIGN KEY ("warmingAccountId") REFERENCES "warming_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
