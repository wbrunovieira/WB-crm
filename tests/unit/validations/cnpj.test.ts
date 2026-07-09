import { describe, it, expect } from "vitest";
import { validateCNPJ, normalizeCNPJ, formatCNPJ } from "@/lib/validations/cnpj";

// CNPJ alfanumérico entra em vigor em jul/2026 (Nota Técnica COCAD/SUARA/RFB nº 49):
// 12 primeiras posições alfanuméricas (A-Z, 0-9) + 2 dígitos verificadores numéricos.
// No DV, cada caractere vale (código ASCII − 48): '0'-'9' → 0-9, 'A'=17 … 'Z'=42.
// Exemplo oficial da Receita: 12ABC34501DE35.

describe("validateCNPJ — numérico (legado, regressão)", () => {
  it("valida um CNPJ numérico correto (formatado)", () => {
    expect(validateCNPJ("11.222.333/0001-81")).toBe(true);
  });
  it("valida um CNPJ numérico correto (só dígitos)", () => {
    expect(validateCNPJ("11222333000181")).toBe(true);
  });
  it("rejeita dígito verificador numérico errado", () => {
    expect(validateCNPJ("11.222.333/0001-82")).toBe(false);
  });
  it("rejeita todos os dígitos iguais", () => {
    expect(validateCNPJ("00000000000000")).toBe(false);
  });
  it("rejeita comprimento inválido", () => {
    expect(validateCNPJ("123")).toBe(false);
  });
});

describe("validateCNPJ — alfanumérico (Receita 2026)", () => {
  it("valida o CNPJ alfanumérico oficial 12ABC34501DE35", () => {
    expect(validateCNPJ("12ABC34501DE35")).toBe(true);
  });
  it("valida com pontuação 12.ABC.345/01DE-35", () => {
    expect(validateCNPJ("12.ABC.345/01DE-35")).toBe(true);
  });
  it("aceita minúsculas (normaliza para maiúsculas)", () => {
    expect(validateCNPJ("12abc34501de35")).toBe(true);
  });
  it("rejeita dígito verificador alfanumérico errado", () => {
    expect(validateCNPJ("12ABC34501DE34")).toBe(false);
  });
  it("rejeita quando os 2 últimos não são numéricos", () => {
    expect(validateCNPJ("12ABC34501DEAB")).toBe(false);
  });
});

describe("normalizeCNPJ", () => {
  it("mantém letras, remove pontuação e faz uppercase", () => {
    expect(normalizeCNPJ("12.abc.345/01de-35")).toBe("12ABC34501DE35");
  });
  it("mantém CNPJ numérico (compat)", () => {
    expect(normalizeCNPJ("11.222.333/0001-81")).toBe("11222333000181");
  });
});

describe("formatCNPJ", () => {
  it("formata alfanumérico como XX.XXX.XXX/XXXX-XX", () => {
    expect(formatCNPJ("12ABC34501DE35")).toBe("12.ABC.345/01DE-35");
  });
  it("formata numérico", () => {
    expect(formatCNPJ("11222333000181")).toBe("11.222.333/0001-81");
  });
});
