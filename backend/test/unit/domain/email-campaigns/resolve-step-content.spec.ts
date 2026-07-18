import { describe, it, expect } from "vitest";
import { resolveStepContent } from "@/domain/email-campaigns/application/services/resolve-step-content";

const base = { subject: "Assunto PT", bodyHtml: "<p>Corpo PT</p>" };
const translations = [
  { language: "en", subject: "EN subject", bodyHtml: "<p>EN body</p>" },
  { language: "es", subject: "ES asunto", bodyHtml: "<p>ES cuerpo</p>" },
];

describe("resolveStepContent", () => {
  it("retorna a tradução quando existe para o idioma", () => {
    expect(resolveStepContent(base, translations, "en")).toEqual({ subject: "EN subject", bodyHtml: "<p>EN body</p>" });
    expect(resolveStepContent(base, translations, "es")).toEqual({ subject: "ES asunto", bodyHtml: "<p>ES cuerpo</p>" });
  });

  it("cai no conteúdo base (pt) quando não há tradução p/ o idioma", () => {
    expect(resolveStepContent(base, translations, "it")).toEqual(base);
    expect(resolveStepContent(base, translations, "pt")).toEqual(base);
  });

  it("sem traduções → sempre o base", () => {
    expect(resolveStepContent(base, [], "en")).toEqual(base);
  });
});
