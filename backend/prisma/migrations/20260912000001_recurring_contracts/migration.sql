-- Contratos recorrentes por cliente: uma LINHA POR ITEM, porque um mesmo cliente pode ter
-- dominio + hospedagem + servidor ao mesmo tempo. Campos fixos na organizacao nunca
-- comportariam isso, e foi o que deixou a mensalidade de R$235/mes do The Dark Film sem lugar.
CREATE TABLE "recurring_contracts" (
    "id"             TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ownerId"        TEXT NOT NULL,
    "type"           TEXT NOT NULL,
    "label"          TEXT,
    "value"          DOUBLE PRECISION NOT NULL,
    "currency"       TEXT NOT NULL DEFAULT 'BRL',
    "cycle"          TEXT NOT NULL,
    "nextChargeAt"   TIMESTAMP(3),
    "endsAt"         TIMESTAMP(3),
    "autoRenew"      BOOLEAN NOT NULL DEFAULT true,
    "remindDays"     INTEGER NOT NULL DEFAULT 30,
    "isPassThrough"  BOOLEAN NOT NULL DEFAULT false,
    "isCourtesy"     BOOLEAN NOT NULL DEFAULT false,
    "startsAfterEvent" TEXT,
    "status"         TEXT NOT NULL DEFAULT 'ativo',
    "notes"          TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,
    CONSTRAINT "recurring_contracts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "recurring_contracts_organizationId_idx" ON "recurring_contracts"("organizationId");
CREATE INDEX "recurring_contracts_ownerId_idx"        ON "recurring_contracts"("ownerId");
CREATE INDEX "recurring_contracts_nextChargeAt_idx"   ON "recurring_contracts"("nextChargeAt");
CREATE INDEX "recurring_contracts_status_idx"         ON "recurring_contracts"("status");

ALTER TABLE "recurring_contracts" ADD CONSTRAINT "recurring_contracts_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recurring_contracts" ADD CONSTRAINT "recurring_contracts_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Converte a hospedagem que JA existe em organizations numa linha de contrato cada.
-- Sem isto o Bruno perderia 9 registros preenchidos (R$ 1.471/ano) e teria de redigitar.
-- Criterio: so quem tem hasHosting e algum dado real (valor > 0 OU data de renovacao). A
-- Elaine Vieira entra mesmo com valor 0 (irma do Bruno, nunca cobrada) porque a DATA importa:
-- o contrato existe e a renovacao nao pode ser esquecida.
INSERT INTO "recurring_contracts" (
    "id", "organizationId", "ownerId", "type", "label", "value", "currency", "cycle",
    "nextChargeAt", "autoRenew", "remindDays", "isPassThrough", "isCourtesy", "startsAfterEvent", "status", "notes",
    "createdAt", "updatedAt"
)
SELECT
    gen_random_uuid()::text,
    o."id",
    o."ownerId",
    'hospedagem',
    COALESCE(o."hostingPlan", 'Hospedagem'),
    COALESCE(o."hostingValue", 0),
    'BRL',
    'anual',
    -- Cortesia nao tem cobranca, entao nao pode herdar data de cobranca. Na Elaine Vieira a
    -- hostingRenewalDate esta ancorada no vencimento do DOMINIO (14/01), nao da hospedagem;
    -- copia-la criaria uma cobranca que nao existe, na data errada. A data original vai para
    -- as notas para nao se perder.
    CASE WHEN o."hostingPlan" ILIKE 'cortesia' THEN NULL ELSE o."hostingRenewalDate" END,
    true,
    COALESCE(o."hostingReminderDays", 30),
    false,
    -- Cortesia e decisao registrada, nao dado faltando: sem este marcador, alguem no futuro ve
    -- valor zero, conclui que falta preencher, e cobra de quem nunca deveria ser cobrado.
    (o."hostingPlan" ILIKE 'cortesia'),
    -- Hospedagem contratada SEM data de renovacao nao e dado perdido: e o formato padrao do
    -- bonus de 12 meses que o Bruno vendia, onde o prazo so comeca a correr na PUBLICACAO do
    -- site (clausula 7 da WB-TDF-270826, caso do The Dark Film, ainda nao publicado). Marcar
    -- como aguardando evento impede que alguem invente um vencimento para "corrigir" o vazio.
    CASE WHEN o."hostingRenewalDate" IS NULL AND o."hostingPlan" NOT ILIKE 'cortesia'
         THEN 'publicação do site (12 meses de bônus começam na publicação)' END,
    'ativo',
    -- Marca explicitamente o que a migracao NAO soube resolver, em vez de criar em silencio:
    -- contrato sem data nunca dispara aviso e desaparece (caso do The Dark Film, unico dos
    -- nove sem hostingRenewalDate).
    TRIM(BOTH E'\n' FROM CONCAT_WS(E'\n',
      o."hostingNotes",
      CASE WHEN o."hostingPlan" ILIKE 'cortesia' AND o."hostingRenewalDate" IS NOT NULL
           THEN '[migracao] data original (do dominio): ' || to_char(o."hostingRenewalDate", 'DD/MM/YYYY') END,
      CASE WHEN o."hostingRenewalDate" IS NULL AND o."hostingPlan" NOT ILIKE 'cortesia'
           THEN '[migracao] sem data porque o prazo comeca na publicacao do site — preencher quando publicar' END
    )),
    now(),
    now()
FROM "organizations" o
WHERE o."hasHosting" = true
  AND (o."hostingValue" IS NOT NULL OR o."hostingRenewalDate" IS NOT NULL);
