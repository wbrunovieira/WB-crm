import { describe, it, expect } from "vitest";
import { Cnpj, InvalidCnpjError } from "@/domain/leads/enterprise/value-objects/cnpj.vo";

// CNPJ alfanumérico (Receita, jul/2026): 12 posições alfanuméricas + 2 dígitos
// verificadores numéricos; valor do char no DV = ASCII − 48; módulo 11.
// O CNPJ numérico tradicional continua válido (subconjunto). Exemplo oficial: 12ABC34501DE35.

describe("Cnpj VO — numérico (legado)", () => {
  it("aceita CNPJ numérico válido e guarda normalizado (só dígitos)", () => {
    const r = Cnpj.create("11.222.333/0001-81");
    expect(r.isRight()).toBe(true);
    if (r.isRight()) expect(r.value.value).toBe("11222333000181");
  });

  it("rejeita dígito verificador numérico errado", () => {
    const r = Cnpj.create("11.222.333/0001-82");
    expect(r.isLeft()).toBe(true);
    if (r.isLeft()) expect(r.value).toBeInstanceOf(InvalidCnpjError);
  });

  it("rejeita todos os dígitos iguais", () => {
    expect(Cnpj.create("00000000000000").isLeft()).toBe(true);
  });

  it("rejeita comprimento inválido", () => {
    expect(Cnpj.create("123").isLeft()).toBe(true);
  });

  it("rejeita vazio/nulo", () => {
    expect(Cnpj.create("").isLeft()).toBe(true);
    expect(Cnpj.create(null).isLeft()).toBe(true);
    expect(Cnpj.create(undefined).isLeft()).toBe(true);
  });
});

describe("Cnpj VO — alfanumérico (Receita 2026)", () => {
  it("aceita o CNPJ alfanumérico oficial 12ABC34501DE35", () => {
    const r = Cnpj.create("12ABC34501DE35");
    expect(r.isRight()).toBe(true);
    if (r.isRight()) expect(r.value.value).toBe("12ABC34501DE35");
  });

  it("aceita com pontuação e minúsculas, guarda normalizado maiúsculo", () => {
    const r = Cnpj.create("12.abc.345/01de-35");
    expect(r.isRight()).toBe(true);
    if (r.isRight()) expect(r.value.value).toBe("12ABC34501DE35");
  });

  it("rejeita dígito verificador alfanumérico errado", () => {
    expect(Cnpj.create("12ABC34501DE34").isLeft()).toBe(true);
  });

  it("rejeita quando os 2 últimos não são numéricos", () => {
    expect(Cnpj.create("12ABC34501DEAB").isLeft()).toBe(true);
  });
});

describe("Cnpj VO — isValid + equals", () => {
  it("isValid reflete a validação", () => {
    expect(Cnpj.isValid("12ABC34501DE35")).toBe(true);
    expect(Cnpj.isValid("12ABC34501DE34")).toBe(false);
  });

  it("equals compara o valor normalizado", () => {
    const a = Cnpj.create("12.ABC.345/01DE-35");
    const b = Cnpj.create("12abc34501de35");
    expect(a.isRight() && b.isRight() && a.value.equals(b.value)).toBe(true);
  });
});
