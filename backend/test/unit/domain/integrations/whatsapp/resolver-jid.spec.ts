/**
 * O WhatsApp está migrando de JID por telefone (`5524...@s.whatsapp.net`) para LID
 * (`102138684420250@lid`), um identificador que NÃO contém o número.
 *
 * Quando o remoteJid vem como LID, o Evolution manda o telefone verdadeiro ao lado, em
 * `remoteJidAlt` — e o CRM ignorava esse campo. Hoje funciona porque o webhook ao vivo ainda
 * traz o telefone no campo principal; no dia em que vier só o LID, toda mensagem daquele
 * contato é descartada em silêncio, com HTTP 200, exatamente como aconteceu em 14/09/2026.
 *
 * Descoberto por acidente: ao reenviar uma mensagem guardada (onde o remoteJid É o LID), o CRM
 * extraiu "102138684420250" como se fosse telefone e não achou vínculo nenhum.
 */
import { describe, it, expect } from "vitest";
import { resolverJid } from "@/domain/integrations/whatsapp/infra/controllers/resolver-jid";

describe("resolverJid", () => {
  it("usa o remoteJid quando ele já é um telefone", () => {
    expect(
      resolverJid({ remoteJid: "5524993955235@s.whatsapp.net", remoteJidAlt: undefined }),
    ).toBe("5524993955235@s.whatsapp.net");
  });

  it("prefere o remoteJidAlt quando o remoteJid é LID", () => {
    // Caso real: áudio do Bruno para o Gomez Studio em 14/09/2026.
    expect(
      resolverJid({
        remoteJid: "102138684420250@lid",
        remoteJidAlt: "5524993955235@s.whatsapp.net",
      }),
    ).toBe("5524993955235@s.whatsapp.net");
  });

  it("mantém o LID quando não há alternativa — melhor tentar que descartar", () => {
    expect(resolverJid({ remoteJid: "102138684420250@lid", remoteJidAlt: undefined })).toBe(
      "102138684420250@lid",
    );
  });

  it("ignora remoteJidAlt vazio", () => {
    expect(resolverJid({ remoteJid: "102138684420250@lid", remoteJidAlt: "" })).toBe(
      "102138684420250@lid",
    );
  });

  it("não mexe em JID de grupo", () => {
    // Grupo nunca tem telefone; trocar por alternativa aqui seria vincular ao contato errado.
    expect(
      resolverJid({ remoteJid: "120363406877084530@g.us", remoteJidAlt: "5524993955235@s.whatsapp.net" }),
    ).toBe("120363406877084530@g.us");
  });

  it("devolve string vazia quando não vem nada", () => {
    expect(resolverJid({ remoteJid: undefined, remoteJidAlt: undefined })).toBe("");
  });
});
