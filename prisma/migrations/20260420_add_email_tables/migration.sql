-- CreateTable: email_messages
CREATE TABLE "email_messages" (
    "id"             TEXT NOT NULL,
    "gmailMessageId" TEXT NOT NULL,
    "threadId"       TEXT NOT NULL,
    "from"           TEXT NOT NULL,
    "to"             TEXT NOT NULL,
    "subject"        TEXT NOT NULL,
    "bodyText"       TEXT,
    "activityId"     TEXT,
    "ownerId"        TEXT NOT NULL,
    "sentAt"         TIMESTAMP(3) NOT NULL,
    "trackingToken"  TEXT,
    "openedAt"       TIMESTAMP(3),
    "openCount"      INTEGER NOT NULL DEFAULT 0,
    "lastClickedAt"  TIMESTAMP(3),
    "clickCount"     INTEGER NOT NULL DEFAULT 0,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable: email_tracking
CREATE TABLE "email_tracking" (
    "id"             TEXT NOT NULL,
    "token"          TEXT NOT NULL,
    "type"           TEXT NOT NULL,
    "emailMessageId" TEXT NOT NULL,
    "targetUrl"      TEXT,
    "ownerId"        TEXT NOT NULL,
    "openCount"      INTEGER NOT NULL DEFAULT 0,
    "clickCount"     INTEGER NOT NULL DEFAULT 0,
    "firstOpenAt"    TIMESTAMP(3),
    "lastOpenAt"     TIMESTAMP(3),
    "firstClickAt"   TIMESTAMP(3),
    "lastClickAt"    TIMESTAMP(3),
    "userAgent"      TEXT,
    "ip"             TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_messages_gmailMessageId_key" ON "email_messages"("gmailMessageId");
CREATE UNIQUE INDEX "email_messages_trackingToken_key" ON "email_messages"("trackingToken");
CREATE INDEX "email_messages_ownerId_idx" ON "email_messages"("ownerId");
CREATE INDEX "email_messages_trackingToken_idx" ON "email_messages"("trackingToken");

CREATE UNIQUE INDEX "email_tracking_token_key" ON "email_tracking"("token");
CREATE INDEX "email_tracking_token_idx" ON "email_tracking"("token");
CREATE INDEX "email_tracking_emailMessageId_idx" ON "email_tracking"("emailMessageId");

-- AddForeignKey
ALTER TABLE "email_tracking" ADD CONSTRAINT "email_tracking_emailMessageId_fkey"
    FOREIGN KEY ("emailMessageId") REFERENCES "email_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
