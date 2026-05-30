import { describe, it, expect } from "vitest";
import { DealTitle } from "@/domain/deals/enterprise/value-objects/deal-title.vo";

describe("DealTitle VO", () => {
  it("aceita e faz trim", () => {
    const r = DealTitle.create("  Projeto X  ");
    expect(r.isRight()).toBe(true);
    if (r.isRight()) expect(r.value.value).toBe("Projeto X");
  });
  it("rejeita vazio com a mensagem de domínio", () => {
    const r = DealTitle.create("   ");
    expect(r.isLeft()).toBe(true);
    if (r.isLeft()) expect(r.value.message).toBe("Título do deal é obrigatório");
  });
  it("rejeita null/undefined", () => {
    expect(DealTitle.create(null).isLeft()).toBe(true);
    expect(DealTitle.create(undefined).isLeft()).toBe(true);
  });
  it("toString e equals", () => {
    const a = DealTitle.create("X");
    const b = DealTitle.create(" X ");
    if (a.isRight() && b.isRight()) {
      expect(a.value.toString()).toBe("X");
      expect(a.value.equals(b.value)).toBe(true);
    }
  });
});
