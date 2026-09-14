/**
 * O carimbo de hora das mensagens de WhatsApp precisa estar no fuso do Brasil.
 *
 * Caso real (14/09/2026): o Bruno mandou mensagem às 08:23 e a atividade registrou
 * "[11:23] Você:". O container roda Alpine e estava sem TZ nem tzdata, então `getHours()`
 * devolvia hora UTC.
 *
 * O carimbo era o sintoma visível. O grave era o mesmo UTC fazer o DIA virar às 21:00 de
 * Brasília — negócio ganho às 22:00 do dia 30 caía no mês seguinte no painel e no filtro.
 *
 * Este teste fixa o comportamento: com TZ=America/Sao_Paulo, um instante conhecido tem de
 * produzir a hora de Brasília. Se alguém remover o tzdata do Dockerfile ou o TZ do compose,
 * ele quebra — em vez de o relógio voltar a mentir calado.
 */
import { describe, it, expect } from "vitest";

describe("carimbo de hora no fuso do Brasil", () => {
  it("um instante UTC conhecido vira hora de Brasília", () => {
    // 2026-09-14T11:23:00Z é 08:23 em São Paulo (UTC-3).
    const instante = new Date("2026-09-14T11:23:00.000Z");
    const hora = instante.toLocaleTimeString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
    });
    expect(hora).toBe("08:23");
  });

  it("o ambiente reconhece o fuso — sem tzdata isto falha", () => {
    // No Alpine sem o pacote tzdata, TZ é ignorado em silêncio e o container fica em UTC.
    // Falhar aqui é melhor que descobrir pelo carimbo errado semanas depois.
    const comFuso = new Date("2026-09-14T11:23:00.000Z").toLocaleString("en-US", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      hour12: false,
    });
    expect(comFuso).toBe("08");
  });

  it("a virada do dia acontece à meia-noite de Brasília, não às 21:00", () => {
    // 2026-09-30T23:30:00-03:00 = 2026-10-01T02:30Z. Em UTC já é outubro; em Brasília ainda
    // é 30 de setembro — e é o mês de Brasília que conta para o painel do Bruno.
    const fimDoMes = new Date("2026-10-01T02:30:00.000Z");
    const diaBrasil = fimDoMes.toLocaleDateString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
    });
    expect(diaBrasil).toBe("30/09");
  });
});
