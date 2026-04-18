import { describe, it, expect } from "vitest";
import { OrganizationName } from "@/domain/organizations/enterprise/value-objects/organization-name.vo";

describe("OrganizationName VO", () => {
  it("cria com nome válido", () => {
    const result = OrganizationName.create("Empresa XPTO");
    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.value).toBe("Empresa XPTO");
    }
  });

  it("faz trim no nome", () => {
    const result = OrganizationName.create("  Empresa com Espaços  ");
    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.value).toBe("Empresa com Espaços");
    }
  });

  it("retorna erro quando nome é string vazia", () => {
    const result = OrganizationName.create("");
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.message).toContain("Nome da organização é obrigatório");
    }
  });

  it("retorna erro quando nome é apenas espaços", () => {
    const result = OrganizationName.create("   ");
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.message).toContain("Nome da organização é obrigatório");
    }
  });

  it("retorna erro quando nome é undefined", () => {
    const result = OrganizationName.create(undefined);
    expect(result.isLeft()).toBe(true);
  });

  it("retorna erro quando nome é null", () => {
    const result = OrganizationName.create(null);
    expect(result.isLeft()).toBe(true);
  });

  it("toString retorna o valor", () => {
    const result = OrganizationName.create("Tech Corp");
    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.toString()).toBe("Tech Corp");
    }
  });

  it("equals compara dois OrganizationName com mesmo valor", () => {
    const a = OrganizationName.create("Empresa A");
    const b = OrganizationName.create("Empresa A");
    expect(a.isRight() && b.isRight()).toBe(true);
    if (a.isRight() && b.isRight()) {
      expect(a.value.equals(b.value)).toBe(true);
    }
  });

  it("equals retorna false para valores diferentes", () => {
    const a = OrganizationName.create("Empresa A");
    const b = OrganizationName.create("Empresa B");
    if (a.isRight() && b.isRight()) {
      expect(a.value.equals(b.value)).toBe(false);
    }
  });
});
