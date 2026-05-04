-- CreateTable
CREATE TABLE "integration_tokens" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "integration_tokens_provider_key" ON "integration_tokens"("provider");
