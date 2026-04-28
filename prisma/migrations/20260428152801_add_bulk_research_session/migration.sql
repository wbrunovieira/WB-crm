-- CreateTable
CREATE TABLE "bulk_research_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leadIds" TEXT NOT NULL,
    "completedIds" TEXT NOT NULL DEFAULT '[]',
    "total" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bulk_research_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bulk_research_sessions_userId_status_idx" ON "bulk_research_sessions"("userId", "status");

-- AddForeignKey
ALTER TABLE "bulk_research_sessions" ADD CONSTRAINT "bulk_research_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
