/**
 * Os DOIS totais, que não podem se confundir (decisão do Bruno, 12/09/2026):
 *
 *   "o que eu cobro do cliente"  = hospedagem + domínio   -> é o que ele fala ao cliente
 *   "o que fica comigo"          = hospedagem             -> domínio é repasse, passa
 *
 * Em cliente que paga o domínio direto no registrador (Salão Loha, The Dark Film) não existe
 * linha de domínio, e os dois números coincidem.
 */
import { describe, it, expect } from "vitest";
import { totalizar } from "@/domain/recurring-contracts/application/use-cases/totalizar";
import { RecurringContract } from "@/domain/recurring-contracts/enterprise/entities/recurring-contract";

const c = (type: string, value: number, cycle = "anual", extra = {}) =>
  RecurringContract.create({
    organizationId: "o", ownerId: "u",
    type: type as never, value, cycle: cycle as never, ...extra,
  });

describe("totalizar — por cliente", () => {
  it("cliente com hospedagem e domínio: cobra 168, receita 128", () => {
    const t = totalizar([c("hospedagem", 128), c("dominio", 40)]);
    expect(t.cobradoAnual).toBe(168);
    expect(t.receitaAnual).toBe(128);
  });

  it("cliente que paga o domínio direto: os dois números coincidem", () => {
    // Salão Loha e The Dark Film têm conta própria no registrador.
    const t = totalizar([c("hospedagem", 128)]);
    expect(t.cobradoAnual).toBe(128);
    expect(t.receitaAnual).toBe(128);
  });

  it("cortesia não entra em nenhum dos dois", () => {
    const t = totalizar([c("hospedagem", 0, "anual", { isCourtesy: true }), c("dominio", 40)]);
    expect(t.cobradoAnual).toBe(40);
    expect(t.receitaAnual).toBe(0);
  });

  it("soma mensal com anual", () => {
    const t = totalizar([c("hospedagem", 128), c("servidor", 235, "mensal")]);
    expect(t.receitaAnual).toBeCloseTo(128 + 235 * 12, 2);
    expect(t.receitaMensal).toBeCloseTo(128 / 12 + 235, 2);
  });

  it("ignora contrato cancelado ou encerrado", () => {
    const t = totalizar([
      c("hospedagem", 128),
      c("hospedagem", 999, "anual", { status: "cancelado" }),
      c("servidor", 999, "mensal", { status: "encerrado" }),
    ]);
    expect(t.receitaAnual).toBe(128);
  });

  it("carteira vazia dá zero, não quebra", () => {
    const t = totalizar([]);
    expect(t.cobradoAnual).toBe(0);
    expect(t.receitaAnual).toBe(0);
  });
});
