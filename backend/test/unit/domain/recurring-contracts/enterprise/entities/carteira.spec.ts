/**
 * Soma da carteira recorrente — o número que motivou a funcionalidade.
 *
 * Prova que formatos diferentes (anual, mensal) somam corretamente e que repasse NÃO entra na
 * receita. Os valores são os reais de produção em 12/09/2026.
 */
import { describe, it, expect } from "vitest";
import { RecurringContract } from "@/domain/recurring-contracts/enterprise/entities/recurring-contract";

const c = (type: string, value: number, cycle: string) =>
  RecurringContract.create({
    organizationId: "o", ownerId: "u",
    type: type as never, value, cycle: cycle as never,
  });

const carteira = [
  c("hospedagem", 291, "anual"), c("hospedagem", 320, "anual"), c("hospedagem", 220, "anual"),
  c("hospedagem", 128, "anual"), c("hospedagem", 128, "anual"), c("hospedagem", 128, "anual"),
  c("hospedagem", 128, "anual"), c("hospedagem", 128, "anual"), c("hospedagem", 0, "anual"),
  c("dominio", 40, "anual"), c("dominio", 40, "anual"), c("dominio", 40, "anual"), c("dominio", 40, "anual"),
  c("servidor", 235, "mensal"),
];

const somaMensal = (l: RecurringContract[]) => l.reduce((s, x) => s + x.monthlyValue, 0);

describe("carteira recorrente", () => {
  it("soma anual e mensal juntos, normalizando por mês", () => {
    const receita = carteira.filter((x) => !x.isPassThrough);
    // hospedagem: 1.471/ano = 122,58/mes  +  servidor 235/mes
    expect(somaMensal(receita)).toBeCloseTo(1471 / 12 + 235, 2);
    expect(somaMensal(receita) * 12).toBeCloseTo(1471 + 235 * 12, 2);
  });

  it("mantém o repasse FORA da receita", () => {
    const repasse = carteira.filter((x) => x.isPassThrough);
    expect(repasse).toHaveLength(4);
    expect(somaMensal(repasse) * 12).toBeCloseTo(160, 2);

    const receita = carteira.filter((x) => !x.isPassThrough);
    // Se domínio entrasse na receita, ela apareceria R$160/ano maior do que é.
    expect(somaMensal(receita)).toBeLessThan(somaMensal(carteira));
  });
});
