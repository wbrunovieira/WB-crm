-- AlterTable
ALTER TABLE "organizations" ADD COLUMN "referredByPartnerId" TEXT;

-- CreateIndex
CREATE INDEX "organizations_referredByPartnerId_idx" ON "organizations"("referredByPartnerId");

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_referredByPartnerId_fkey" FOREIGN KEY ("referredByPartnerId") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;
