-- Migration: Add multiple labels support (many-to-many)
-- This migration converts Lead and Organization from single labelId to multiple labels

-- Step 1: Create junction tables for many-to-many relationships

-- Junction table for Lead <-> Label
CREATE TABLE "_LabelToLead" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- Junction table for Organization <-> Label
CREATE TABLE "_LabelToOrganization" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- Step 2: Create unique indexes (required by Prisma for implicit many-to-many)
CREATE UNIQUE INDEX "_LabelToLead_AB_unique" ON "_LabelToLead"("A", "B");
CREATE INDEX "_LabelToLead_B_index" ON "_LabelToLead"("B");

CREATE UNIQUE INDEX "_LabelToOrganization_AB_unique" ON "_LabelToOrganization"("A", "B");
CREATE INDEX "_LabelToOrganization_B_index" ON "_LabelToOrganization"("B");

-- Step 3: Migrate existing data from labelId to junction tables
-- Copy Lead labelId relationships to junction table
INSERT INTO "_LabelToLead" ("A", "B")
SELECT "labelId", "id" FROM "leads" WHERE "labelId" IS NOT NULL;

-- Copy Organization labelId relationships to junction table
INSERT INTO "_LabelToOrganization" ("A", "B")
SELECT "labelId", "id" FROM "organizations" WHERE "labelId" IS NOT NULL;

-- Step 4: Add foreign key constraints
ALTER TABLE "_LabelToLead" ADD CONSTRAINT "_LabelToLead_A_fkey" FOREIGN KEY ("A") REFERENCES "labels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_LabelToLead" ADD CONSTRAINT "_LabelToLead_B_fkey" FOREIGN KEY ("B") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_LabelToOrganization" ADD CONSTRAINT "_LabelToOrganization_A_fkey" FOREIGN KEY ("A") REFERENCES "labels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_LabelToOrganization" ADD CONSTRAINT "_LabelToOrganization_B_fkey" FOREIGN KEY ("B") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 5: Drop old labelId columns and their indexes
DROP INDEX IF EXISTS "leads_labelId_idx";
DROP INDEX IF EXISTS "organizations_labelId_idx";

ALTER TABLE "leads" DROP COLUMN "labelId";
ALTER TABLE "organizations" DROP COLUMN "labelId";
