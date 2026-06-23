import { describe, it, expect } from "vitest";
import { extractTemplateSubject } from "@/domain/email-campaigns/templates/template-subject";

describe("extractTemplateSubject", () => {
  it("reads the subject from a <!-- subject: ... --> comment", () => {
    const html = `<!-- subject: Seu negócio mora num terreno alugado -->\n<!DOCTYPE html><html></html>`;
    expect(extractTemplateSubject(html)).toBe("Seu negócio mora num terreno alugado");
  });

  it("is case-insensitive and tolerates extra whitespace", () => {
    expect(extractTemplateSubject("<!--   SUBJECT:   Olá mundo   -->")).toBe("Olá mundo");
  });

  it("matches the marker anywhere in the document", () => {
    const html = `<!DOCTYPE html><head><!-- subject: Assunto no head --></head>`;
    expect(extractTemplateSubject(html)).toBe("Assunto no head");
  });

  it("returns the first marker when several are present", () => {
    const html = "<!-- subject: Primeiro --><!-- subject: Segundo -->";
    expect(extractTemplateSubject(html)).toBe("Primeiro");
  });

  it("returns undefined when there is no subject marker (backward compatible)", () => {
    expect(extractTemplateSubject("<!DOCTYPE html><html><title>WB</title></html>")).toBeUndefined();
  });

  it("returns undefined for an empty string", () => {
    expect(extractTemplateSubject("")).toBeUndefined();
  });
});
