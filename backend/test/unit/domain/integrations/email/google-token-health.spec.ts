/**
 * Saúde do token Google — o que faltava em 25/08/2026.
 *
 * O que aconteceu: o refresh token foi revogado, o cron falhou de 5 em 5 minutos por 19 dias
 * (1835 erros), a tela de admin continuou dizendo "Conectada", e ninguém soube. Quando fomos
 * investigar, o container já tinha reiniciado e os logs do período não existiam mais.
 *
 * Duas lições viraram código: avisar UMA vez (não a cada ciclo) e guardar a IDADE do token na
 * hora da falha, porque é ela que identifica a causa na próxima vez.
 */
import { describe, it, expect } from "vitest";
import { deveAvisar, idadeEmDias, diagnostico } from "@/domain/integrations/email/infra/google-token-health";

const dias = (n: number) => new Date(Date.now() - n * 86_400_000);

describe("deveAvisar", () => {
  it("avisa na primeira falha", () => {
    expect(deveAvisar({ failureNotifiedAt: null })).toBe(true);
  });

  it("NÃO avisa de novo na falha seguinte", () => {
    // Foram 1835 falhas para uma única causa; avisar em cada uma é ruído que ensina a ignorar.
    expect(deveAvisar({ failureNotifiedAt: dias(0) })).toBe(false);
  });

  it("volta a avisar se ficar muitos dias quebrado", () => {
    // Um lembrete semanal ainda é útil: quebrado há 19 dias merece ser lembrado.
    expect(deveAvisar({ failureNotifiedAt: dias(8) })).toBe(true);
  });
});

describe("idadeEmDias", () => {
  it("mede da conexão até a falha, não do último refresh", () => {
    // updatedAt muda a cada renovação de access token e sempre pareceria "recente".
    expect(idadeEmDias(dias(7), new Date())).toBe(7);
  });

  it("devolve null quando não se sabe quando conectou", () => {
    expect(idadeEmDias(null, new Date())).toBeNull();
  });
});

describe("diagnostico", () => {
  it("aponta modo Testing quando o token morre com cerca de uma semana", () => {
    // Assinatura do app em "Testing" no Google Cloud: refresh token invalidado a cada 7 dias.
    expect(diagnostico(7)).toContain("Testing");
    expect(diagnostico(6)).toContain("Testing");
    expect(diagnostico(8)).toContain("Testing");
  });

  it("aponta evento único quando durou meses", () => {
    const d = diagnostico(95);
    expect(d).not.toContain("Testing");
    expect(d.toLowerCase()).toMatch(/senha|revoga/);
  });

  it("não chuta quando a idade é desconhecida", () => {
    expect(diagnostico(null).toLowerCase()).toContain("desconhecid");
  });
});
