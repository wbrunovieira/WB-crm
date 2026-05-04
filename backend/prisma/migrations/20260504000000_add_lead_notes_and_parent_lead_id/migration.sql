-- AlterTable: add notes and parentLeadId to leads
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "parentLeadId" TEXT;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_parentLeadId_fkey" FOREIGN KEY ("parentLeadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
