-- AlterTable
ALTER TABLE "activities" ADD COLUMN "emailFromAddress" TEXT;
ALTER TABLE "activities" ADD COLUMN "emailFromName" TEXT;
ALTER TABLE "activities" ADD COLUMN "emailReplied" BOOLEAN NOT NULL DEFAULT false;
