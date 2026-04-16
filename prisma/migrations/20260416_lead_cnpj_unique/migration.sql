-- Normaliza CNPJs existentes: remove pontuação → apenas 14 dígitos
UPDATE "leads"
SET "companyRegistrationID" = regexp_replace("companyRegistrationID", '[^0-9]', '', 'g')
WHERE "companyRegistrationID" IS NOT NULL
  AND "companyRegistrationID" <> regexp_replace("companyRegistrationID", '[^0-9]', '', 'g');

-- Adiciona constraint de unicidade (NULLs múltiplos são permitidos pelo PostgreSQL)
ALTER TABLE "leads"
ADD CONSTRAINT "leads_companyRegistrationID_key" UNIQUE ("companyRegistrationID");
