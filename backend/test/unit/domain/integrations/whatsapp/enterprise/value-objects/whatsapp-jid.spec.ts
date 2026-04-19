import { describe, it, expect } from "vitest";
import { WhatsAppJid } from "@/domain/integrations/whatsapp/enterprise/value-objects/whatsapp-jid.vo";

describe("WhatsAppJid", () => {
  it("creates successfully for a valid individual JID", () => {
    const result = WhatsAppJid.create("5511999998888@s.whatsapp.net");
    expect(result.isRight()).toBe(true);
    expect(result.unwrap().toString()).toBe("5511999998888@s.whatsapp.net");
  });

  it("creates successfully for a valid group JID", () => {
    const result = WhatsAppJid.create("120363000000000@g.us");
    expect(result.isRight()).toBe(true);
  });

  it("returns left for empty string", () => {
    const result = WhatsAppJid.create("");
    expect(result.isLeft()).toBe(true);
  });

  it("returns left for whitespace-only string", () => {
    const result = WhatsAppJid.create("   ");
    expect(result.isLeft()).toBe(true);
  });

  it("isGroup() returns true for @g.us JID", () => {
    const jid = WhatsAppJid.create("120363000000000@g.us").unwrap();
    expect(jid.isGroup()).toBe(true);
  });

  it("isGroup() returns false for @s.whatsapp.net JID", () => {
    const jid = WhatsAppJid.create("5511999998888@s.whatsapp.net").unwrap();
    expect(jid.isGroup()).toBe(false);
  });

  it("extractPhone() extracts digits before '@'", () => {
    const jid = WhatsAppJid.create("5511999@s.whatsapp.net").unwrap();
    expect(jid.extractPhone()).toBe("5511999");
  });

  it("extractPhone() handles JID with only digits before @", () => {
    const jid = WhatsAppJid.create("5511999998888@s.whatsapp.net").unwrap();
    expect(jid.extractPhone()).toBe("5511999998888");
  });

  it("toString() returns the raw JID", () => {
    const raw = "5511999998888@s.whatsapp.net";
    const jid = WhatsAppJid.create(raw).unwrap();
    expect(jid.toString()).toBe(raw);
  });
});
