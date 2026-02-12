-- CreateTable
CREATE TABLE IF NOT EXISTS "notifications" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "jobId" TEXT,
    "status" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "payload" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey (only if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'notifications_userId_fkey'
    ) THEN
        ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "notifications_read_idx" ON "notifications"("read");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "notifications_jobId_idx" ON "notifications"("jobId");
