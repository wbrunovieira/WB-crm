-- Mesmo diagnostico do google_tokens, agora para as demais integracoes (goto).
--
-- Motivo: o token do GoTo expirou em 05/08/2026 e a falha durou 39 dias. A tela de admin
-- mostrava "Token expirado" corretamente o tempo todo — e nao adiantou, porque ninguem abre
-- tela de admin para conferir se esta tudo bem. Custo: tres semanas de ligacoes sem registro,
-- transcricao ou analise, e a API do GoTo nao devolve esse periodo retroativamente.
ALTER TABLE "integration_tokens" ADD COLUMN "connectedAt"       TIMESTAMP(3);
ALTER TABLE "integration_tokens" ADD COLUMN "lastFailureAt"     TIMESTAMP(3);
ALTER TABLE "integration_tokens" ADD COLUMN "lastFailureReason" TEXT;
ALTER TABLE "integration_tokens" ADD COLUMN "failureNotifiedAt" TIMESTAMP(3);

UPDATE "integration_tokens" SET "connectedAt" = "updatedAt" WHERE "connectedAt" IS NULL;
