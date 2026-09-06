-- Rastro de alteração de valor/status de negócio. Espelha deal_stage_history, que só cobre
-- mudança de etapa. Necessário para reconstruir divergências entre o CRM e o financeiro.
CREATE TABLE "DealValueHistory" (
    "id"           TEXT NOT NULL,
    "dealId"       TEXT NOT NULL,
    "fromValue"    DOUBLE PRECISION,
    "toValue"      DOUBLE PRECISION,
    "fromCurrency" TEXT,
    "toCurrency"   TEXT,
    "fromStatus"   TEXT,
    "toStatus"     TEXT,
    "changedById"  TEXT NOT NULL,
    "changedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DealValueHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DealValueHistory_dealId_idx"    ON "DealValueHistory"("dealId");
CREATE INDEX "DealValueHistory_changedAt_idx" ON "DealValueHistory"("changedAt");

ALTER TABLE "DealValueHistory" ADD CONSTRAINT "DealValueHistory_dealId_fkey"
  FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DealValueHistory" ADD CONSTRAINT "DealValueHistory_changedById_fkey"
  FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
