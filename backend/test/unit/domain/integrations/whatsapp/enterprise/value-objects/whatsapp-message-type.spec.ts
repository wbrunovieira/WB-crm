import { describe, it, expect } from "vitest";
import { WhatsAppMessageType } from "@/domain/integrations/whatsapp/enterprise/value-objects/whatsapp-message-type.vo";

describe("WhatsAppMessageType", () => {
  it("creates successfully for conversation", () => {
    const result = WhatsAppMessageType.create("conversation");
    expect(result.isRight()).toBe(true);
    expect(result.unwrap().toString()).toBe("conversation");
  });

  it("creates successfully for extendedTextMessage", () => {
    const result = WhatsAppMessageType.create("extendedTextMessage");
    expect(result.isRight()).toBe(true);
  });

  it("creates successfully for audioMessage", () => {
    const result = WhatsAppMessageType.create("audioMessage");
    expect(result.isRight()).toBe(true);
  });

  it("creates successfully for videoMessage", () => {
    const result = WhatsAppMessageType.create("videoMessage");
    expect(result.isRight()).toBe(true);
  });

  it("creates successfully for imageMessage", () => {
    const result = WhatsAppMessageType.create("imageMessage");
    expect(result.isRight()).toBe(true);
  });

  it("creates successfully for documentMessage", () => {
    const result = WhatsAppMessageType.create("documentMessage");
    expect(result.isRight()).toBe(true);
  });

  it("creates successfully for stickerMessage", () => {
    const result = WhatsAppMessageType.create("stickerMessage");
    expect(result.isRight()).toBe(true);
  });

  it("creates successfully for locationMessage", () => {
    const result = WhatsAppMessageType.create("locationMessage");
    expect(result.isRight()).toBe(true);
  });

  it("returns left for invalid type", () => {
    const result = WhatsAppMessageType.create("invalidType");
    expect(result.isLeft()).toBe(true);
  });

  it("returns left for empty string", () => {
    const result = WhatsAppMessageType.create("");
    expect(result.isLeft()).toBe(true);
  });

  describe("isDownloadable()", () => {
    it("returns true for audioMessage", () => {
      expect(WhatsAppMessageType.create("audioMessage").unwrap().isDownloadable()).toBe(true);
    });

    it("returns true for videoMessage", () => {
      expect(WhatsAppMessageType.create("videoMessage").unwrap().isDownloadable()).toBe(true);
    });

    it("returns true for imageMessage", () => {
      expect(WhatsAppMessageType.create("imageMessage").unwrap().isDownloadable()).toBe(true);
    });

    it("returns true for documentMessage", () => {
      expect(WhatsAppMessageType.create("documentMessage").unwrap().isDownloadable()).toBe(true);
    });

    it("returns false for conversation", () => {
      expect(WhatsAppMessageType.create("conversation").unwrap().isDownloadable()).toBe(false);
    });

    it("returns false for extendedTextMessage", () => {
      expect(WhatsAppMessageType.create("extendedTextMessage").unwrap().isDownloadable()).toBe(false);
    });

    it("returns false for stickerMessage", () => {
      expect(WhatsAppMessageType.create("stickerMessage").unwrap().isDownloadable()).toBe(false);
    });

    it("returns false for locationMessage", () => {
      expect(WhatsAppMessageType.create("locationMessage").unwrap().isDownloadable()).toBe(false);
    });
  });

  describe("isTranscribable()", () => {
    it("returns true for audioMessage", () => {
      expect(WhatsAppMessageType.create("audioMessage").unwrap().isTranscribable()).toBe(true);
    });

    it("returns true for videoMessage", () => {
      expect(WhatsAppMessageType.create("videoMessage").unwrap().isTranscribable()).toBe(true);
    });

    it("returns false for imageMessage", () => {
      expect(WhatsAppMessageType.create("imageMessage").unwrap().isTranscribable()).toBe(false);
    });

    it("returns false for documentMessage", () => {
      expect(WhatsAppMessageType.create("documentMessage").unwrap().isTranscribable()).toBe(false);
    });

    it("returns false for conversation", () => {
      expect(WhatsAppMessageType.create("conversation").unwrap().isTranscribable()).toBe(false);
    });
  });
});
