-- AlterTable: add notes and parentLeadId to Lead
ALTER TABLE "Lead" ADD COLUMN "notes" TEXT;
ALTER TABLE "Lead" ADD COLUMN "parentLeadId" TEXT;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_parentLeadId_fkey" FOREIGN KEY ("parentLeadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
