import { describe, it, expect } from "vitest";
import { PartnerName } from "@/domain/partners/enterprise/value-objects/partner-name.vo";

describe("PartnerName VO", () => {
  it("aceita e faz trim", () => {
    const r = PartnerName.create("  Agência Z  ");
    expect(r.isRight()).toBe(true);
    if (r.isRight()) expect(r.value.value).toBe("Agência Z");
  });
  it("rejeita vazio com a mensagem de domínio", () => {
    const r = PartnerName.create("   ");
    expect(r.isLeft()).toBe(true);
    if (r.isLeft()) expect(r.value.message).toBe("Nome do parceiro é obrigatório");
  });
  it("rejeita null/undefined", () => {
    expect(PartnerName.create(null).isLeft()).toBe(true);
    expect(PartnerName.create(undefined).isLeft()).toBe(true);
  });
  it("toString e equals", () => {
    const a = PartnerName.create("Z");
    const b = PartnerName.create(" Z ");
    if (a.isRight() && b.isRight()) {
      expect(a.value.toString()).toBe("Z");
      expect(a.value.equals(b.value)).toBe(true);
    }
  });
});
