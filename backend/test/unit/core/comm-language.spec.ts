import { describe, it, expect } from "vitest";
import { CommLanguage } from "@/core/value-objects/comm-language";

describe("CommLanguage", () => {
  it("aceita os idiomas suportados (pt/en/es/it)", () => {
    for (const code of ["pt", "en", "es", "it"]) {
      const r = CommLanguage.create(code);
      expect(r.isRight()).toBe(true);
      if (r.isRight()) expect(r.value.value).toBe(code);
    }
  });

  it("normaliza (trim + lowercase)", () => {
    const r = CommLanguage.create("  EN ");
    expect(r.isRight() && r.value.value).toBe("en");
  });

  it("vazio/null/undefined → default 'pt'", () => {
    for (const raw of [undefined, null, "", "   "]) {
      const r = CommLanguage.create(raw);
      expect(r.isRight() && r.value.value).toBe("pt");
    }
  });

  it("idioma não suportado → left", () => {
    const r = CommLanguage.create("fr");
    expect(r.isLeft()).toBe(true);
  });

  it("default() retorna pt", () => {
    expect(CommLanguage.default().value).toBe("pt");
  });

  it("SUPPORTED expõe a lista de códigos", () => {
    expect(CommLanguage.SUPPORTED).toEqual(["pt", "en", "es", "it"]);
  });
});
