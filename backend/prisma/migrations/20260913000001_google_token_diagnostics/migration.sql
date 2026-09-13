-- Diagnostico de queda do token Google.
--
-- Contexto: em 25/08/2026 o refresh token foi revogado e a falha passou 19 dias despercebida —
-- 1835 erros registrados, a tela de admin dizendo "Conectada", e Gmail/Meet/Drive sem entrar no
-- CRM. Ao investigar, o container ja tinha reiniciado e os logs do periodo nao existiam mais:
-- nao foi possivel determinar a causa.
--
-- connectedAt guarda quando o REFRESH token foi emitido (updatedAt muda a cada renovacao de
-- access token e por isso nao serve). A idade do token na hora da falha e o que identifica a
-- causa: ~7 dias sempre = consentimento em modo "Testing" no Google Cloud; meses = evento unico.
ALTER TABLE "google_tokens" ADD COLUMN "connectedAt"       TIMESTAMP(3);
ALTER TABLE "google_tokens" ADD COLUMN "lastRefreshOkAt"   TIMESTAMP(3);
ALTER TABLE "google_tokens" ADD COLUMN "lastFailureAt"     TIMESTAMP(3);
ALTER TABLE "google_tokens" ADD COLUMN "lastFailureReason" TEXT;
ALTER TABLE "google_tokens" ADD COLUMN "failureNotifiedAt" TIMESTAMP(3);

-- A conexao atual foi feita hoje (13/09/2026, 12:15), entao updatedAt e a melhor aproximacao
-- que existe para connectedAt. Daqui pra frente o valor e escrito no momento do consentimento.
UPDATE "google_tokens" SET "connectedAt" = "updatedAt" WHERE "connectedAt" IS NULL;
