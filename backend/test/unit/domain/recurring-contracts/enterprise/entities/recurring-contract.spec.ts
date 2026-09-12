/**
 * Regras do contrato recorrente.
 *
 * As duas que mais importam vêm de decisões do Bruno (12/09/2026):
 *
 * 1. Domínio é REPASSE — entra R$40 e sai R$40 para o registro.br, sem margem. Não pode somar
 *    como receita, senão a recorrência parece maior do que é. Para o domínio o que vale é o
 *    AVISO: esquecer a renovação derruba o site do cliente ou perde o domínio.
 * 2. Contrato sem renovação automática precisa avisar ANTES de acabar. Com renovação
 *    automática, o sistema segue sozinho e não há o que avisar.
 */
import { describe, it, expect } from "vitest";
import { RecurringContract } from "@/domain/recurring-contracts/enterprise/entities/recurring-contract";

function contrato(over: Partial<Parameters<typeof RecurringContract.create>[0]> = {}) {
  return RecurringContract.create({
    organizationId: "org-1",
    ownerId: "user-1",
    type: "hospedagem",
    value: 128,
    cycle: "anual",
    ...over,
  });
}

describe("RecurringContract — repasse", () => {
  it("marca domínio como repasse sozinho, sem precisar lembrar", () => {
    expect(contrato({ type: "dominio", value: 40 }).isPassThrough).toBe(true);
  });

  it("não marca hospedagem como repasse", () => {
    expect(contrato({ type: "hospedagem" }).isPassThrough).toBe(false);
  });

  it("respeita marcação explícita contrária ao padrão do tipo", () => {
    // Existe caso de domínio revendido com margem; a regra é padrão, não camisa de força.
    expect(contrato({ type: "dominio", isPassThrough: false }).isPassThrough).toBe(false);
  });
});

describe("RecurringContract — valor mensalizado", () => {
  it("converte anual em mensal para poder somar formatos diferentes", () => {
    expect(contrato({ value: 1200, cycle: "anual" }).monthlyValue).toBeCloseTo(100, 2);
  });

  it("converte trimestral", () => {
    expect(contrato({ value: 705, cycle: "trimestral" }).monthlyValue).toBeCloseTo(235, 2);
  });

  it("mensal fica como está", () => {
    expect(contrato({ value: 235, cycle: "mensal" }).monthlyValue).toBe(235);
  });
});

describe("RecurringContract — aviso de término", () => {
  const em = (dias: number) => new Date(Date.now() + dias * 86_400_000);

  it("avisa quando o contrato NÃO renova sozinho e o fim está dentro do prazo", () => {
    const c = contrato({ autoRenew: false, endsAt: em(10), remindDays: 30 });
    expect(c.precisaAvisar()).toBe(true);
  });

  it("não avisa quando renova sozinho, mesmo com fim próximo", () => {
    const c = contrato({ autoRenew: true, endsAt: em(10), remindDays: 30 });
    expect(c.precisaAvisar()).toBe(false);
  });

  it("não avisa quando o fim ainda está longe", () => {
    const c = contrato({ autoRenew: false, endsAt: em(90), remindDays: 30 });
    expect(c.precisaAvisar()).toBe(false);
  });

  it("não avisa contrato cancelado", () => {
    const c = contrato({ autoRenew: false, endsAt: em(5), status: "cancelado" });
    expect(c.precisaAvisar()).toBe(false);
  });

  it("avisa pela próxima cobrança quando não há data de término", () => {
    // Renovação anual de domínio não tem "fim de contrato": o que existe é a data de cobrar.
    const c = contrato({ type: "dominio", autoRenew: false, nextChargeAt: em(7), endsAt: undefined });
    expect(c.precisaAvisar()).toBe(true);
  });
});

describe("RecurringContract — cortesia", () => {
  /**
   * Caso real: Elaine Vieira (irmã do Bruno) tem hospedagem que NUNCA é cobrada, por decisão
   * permanente. Valor zero sozinho é ambíguo — não distingue "de graça de propósito" de
   * "ninguém preencheu". A diferença importa: sem ela, alguém no futuro vê valor zero, acha
   * que é dado faltando, e cobra.
   *
   * Cortesia é marcador próprio, não status: um contrato de cortesia está ATIVO. Se fosse
   * status, não daria para expressar "cortesia cancelada".
   */
  it("um contrato de cortesia continua ativo", () => {
    const c = contrato({ value: 0, isCourtesy: true });
    expect(c.isCourtesy).toBe(true);
    expect(c.status).toBe("ativo");
  });

  it("cortesia não é o padrão — valor zero sozinho não vira cortesia", () => {
    expect(contrato({ value: 0 }).isCourtesy).toBe(false);
  });

  it("cortesia pode ser cancelada como qualquer contrato", () => {
    const c = contrato({ value: 0, isCourtesy: true });
    c.update({ status: "cancelado" });
    expect(c.isCourtesy).toBe(true);
    expect(c.status).toBe("cancelado");
  });

  it("não avisa cobrança de cortesia — não há o que cobrar", () => {
    const c = contrato({
      value: 0, isCourtesy: true, autoRenew: false,
      nextChargeAt: new Date(Date.now() + 5 * 86_400_000),
    });
    expect(c.precisaAvisar()).toBe(false);
  });

  it("cortesia não soma na receita", () => {
    expect(contrato({ value: 0, isCourtesy: true }).monthlyValue).toBe(0);
  });
});
