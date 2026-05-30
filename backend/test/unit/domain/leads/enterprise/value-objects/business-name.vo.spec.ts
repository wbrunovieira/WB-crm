import { describe, it, expect } from "vitest";
import { BusinessName } from "@/domain/leads/enterprise/value-objects/business-name.vo";

describe("BusinessName VO", () => {
  it("aceita e faz trim", () => {
    const r = BusinessName.create("  Acme Ltda  ");
    expect(r.isRight()).toBe(true);
    if (r.isRight()) expect(r.value.value).toBe("Acme Ltda");
  });
  it("rejeita vazio com a mensagem de domínio", () => {
    const r = BusinessName.create("   ");
    expect(r.isLeft()).toBe(true);
    if (r.isLeft()) expect(r.value.message).toBe("Nome da empresa é obrigatório");
  });
  it("rejeita null/undefined", () => {
    expect(BusinessName.create(null).isLeft()).toBe(true);
    expect(BusinessName.create(undefined).isLeft()).toBe(true);
  });
});
