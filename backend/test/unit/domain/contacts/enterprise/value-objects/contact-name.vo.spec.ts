import { describe, it, expect } from "vitest";
import { ContactName } from "@/domain/contacts/enterprise/value-objects/contact-name.vo";

describe("ContactName VO", () => {
  it("aceita e faz trim", () => {
    const r = ContactName.create("  Maria  ");
    expect(r.isRight()).toBe(true);
    if (r.isRight()) expect(r.value.value).toBe("Maria");
  });
  it("rejeita vazio com a mensagem de domínio", () => {
    const r = ContactName.create("   ");
    expect(r.isLeft()).toBe(true);
    if (r.isLeft()) expect(r.value.message).toBe("Nome é obrigatório");
  });
  it("rejeita null/undefined", () => {
    expect(ContactName.create(null).isLeft()).toBe(true);
    expect(ContactName.create(undefined).isLeft()).toBe(true);
  });
  it("toString e equals", () => {
    const a = ContactName.create("Ana");
    const b = ContactName.create(" Ana ");
    if (a.isRight() && b.isRight()) {
      expect(a.value.toString()).toBe("Ana");
      expect(a.value.equals(b.value)).toBe(true);
    }
  });
});
