/**
 * Aviso de queda de integração.
 *
 * Duas quedas reais motivaram isto, e nas duas o sistema SABIA:
 *   - Google, 25/08 a 13/09 (19 dias): 1835 erros, a tela dizendo "Conectada".
 *   - GoTo,   05/08 a 13/09 (39 dias): a tela dizendo "⚠ Token expirado", certinho.
 *
 * A do GoTo é a mais instrutiva: a tela estava CERTA e não adiantou, porque ninguém abre tela
 * de admin para conferir se está tudo bem. Informação que existe e não é entregue não informa.
 *
 * Perderam-se 3 semanas de ligações, sem transcrição nem análise, e a API do GoTo não devolve
 * esse período retroativamente.
 */
import { describe, it, expect } from "vitest";
import { deveNotificar, montarAviso } from "@/infra/shared/integration-health/integration-health";

const diasAtras = (n: number) => new Date(Date.now() - n * 86_400_000);

describe("deveNotificar", () => {
  it("notifica na primeira falha", () => {
    expect(deveNotificar(null)).toBe(true);
  });

  it("não repete na falha seguinte", () => {
    // O cron roda de 5 em 5 minutos. Sem esta trava seriam milhares de avisos por uma causa.
    expect(deveNotificar(diasAtras(0))).toBe(false);
  });

  it("lembra de novo depois de uma semana", () => {
    // Quebrado há 39 dias merece ser lembrado; avisar uma vez só foi o que deixou passar.
    expect(deveNotificar(diasAtras(7))).toBe(true);
  });
});

describe("montarAviso", () => {
  it("diz o que parou de funcionar, não só que o token caiu", () => {
    const aviso = montarAviso("goto", 39);
    // "Token expirado" não comunica consequência. O vendedor precisa saber o que perdeu.
    expect(aviso.summary.toLowerCase()).toContain("ligaç");
    expect(aviso.title.toLowerCase()).toContain("goto");
  });

  it("para o Google, cita e-mail e reuniões", () => {
    const aviso = montarAviso("google", 19);
    expect(aviso.summary.toLowerCase()).toMatch(/e-mail|gmail/);
    expect(aviso.summary.toLowerCase()).toMatch(/reuni|meet/);
  });

  it("inclui há quanto tempo está quebrado", () => {
    expect(montarAviso("goto", 39).summary).toContain("39");
  });

  it("diz onde reconectar", () => {
    expect(montarAviso("goto", 1).summary).toContain("/admin/goto");
    expect(montarAviso("google", 1).summary).toContain("/admin/google");
  });
});
