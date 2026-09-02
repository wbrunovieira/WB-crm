-- Data em que a organização deixou de ser lead (preenchida pela conversão).
-- Nulo para organizações criadas diretamente, que nunca foram lead.
ALTER TABLE "organizations" ADD COLUMN "convertedAt" TIMESTAMP(3);
