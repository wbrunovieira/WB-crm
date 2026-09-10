-- Propostas passam a poder ser anexadas a uma organizacao (cliente), nao so a lead/deal/parceiro.
--
-- Motivo: a pagina do cliente nao tinha secao de propostas, e nao era esquecimento de tela — o
-- vinculo nunca existiu no banco. Sem isto, uma proposta feita para quem ja e cliente so podia
-- ser pendurada no lead arquivado que deu origem a ele.
ALTER TABLE "proposals" ADD COLUMN "organizationId" TEXT;

CREATE INDEX "proposals_organizationId_idx" ON "proposals"("organizationId");

ALTER TABLE "proposals"
  ADD CONSTRAINT "proposals_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
