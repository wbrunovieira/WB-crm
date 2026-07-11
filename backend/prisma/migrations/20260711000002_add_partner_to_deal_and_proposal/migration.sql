-- Partner support on Deals and Proposals (two scenarios):
--  A. Partner is the deal's counterparty (agency buys a service for itself) -> deals.partnerId
--  B. Partner referred the deal (customer is a lead/org, agency gets credit)  -> deals.referredByPartnerId
-- Proposals can likewise be addressed to a partner (scenario A) -> proposals.partnerId.
-- All scalar + index + FK ON DELETE SET NULL (mirrors leadId/organizationId).

-- deals.partnerId
ALTER TABLE "deals" ADD COLUMN "partnerId" TEXT;
CREATE INDEX "deals_partnerId_idx" ON "deals"("partnerId");
ALTER TABLE "deals" ADD CONSTRAINT "deals_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- deals.referredByPartnerId
ALTER TABLE "deals" ADD COLUMN "referredByPartnerId" TEXT;
CREATE INDEX "deals_referredByPartnerId_idx" ON "deals"("referredByPartnerId");
ALTER TABLE "deals" ADD CONSTRAINT "deals_referredByPartnerId_fkey" FOREIGN KEY ("referredByPartnerId") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- proposals.partnerId
ALTER TABLE "proposals" ADD COLUMN "partnerId" TEXT;
CREATE INDEX "proposals_partnerId_idx" ON "proposals"("partnerId");
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;
