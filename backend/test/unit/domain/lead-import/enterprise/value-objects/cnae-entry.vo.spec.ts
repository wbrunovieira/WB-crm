import { describe, it, expect } from "vitest";
import { CnaeEntry } from "@/domain/lead-import/enterprise/value-objects/cnae-entry.vo";

describe("CnaeEntry VO", () => {
  it("parseia 'codigo - descrição'", () => {
    const e = CnaeEntry.parse("6201501 - Desenvolvimento de software");
    expect(e).not.toBeNull();
    expect(e!.code).toBe("6201501");
    expect(e!.description).toBe("Desenvolvimento de software");
  });

  it("faz trim e aceita travessão (–) além do hífen", () => {
    const e = CnaeEntry.parse("  1234 – Algo  ");
    expect(e).not.toBeNull();
    expect(e!.code).toBe("1234");
    expect(e!.description).toBe("Algo");
  });

  it("aceita código de 4 a 7 dígitos", () => {
    expect(CnaeEntry.parse("1234 - x")).not.toBeNull();
    expect(CnaeEntry.parse("1234567 - x")).not.toBeNull();
  });

  it("retorna null quando não casa o formato", () => {
    expect(CnaeEntry.parse("sem codigo")).toBeNull();
    expect(CnaeEntry.parse("123 - curto demais")).toBeNull(); // <4 dígitos
    expect(CnaeEntry.parse("6201501")).toBeNull(); // sem descrição
    expect(CnaeEntry.parse("")).toBeNull();
    expect(CnaeEntry.parse(null)).toBeNull();
    expect(CnaeEntry.parse(undefined)).toBeNull();
  });
});
