import { describe, it, expect } from "vitest";
import { normalizePhoneE164, normalizePhoneForWhatsApp } from "@/infra/shared/phone/phone-normalizer";

describe("normalizePhoneE164", () => {
  it("normalizes a formatted BR number to E.164", () => {
    expect(normalizePhoneE164("+55 (24) 2222-6134")).toBe("+552422226134");
  });

  it("normalizes an unformatted number with country code", () => {
    expect(normalizePhoneE164("552422226134")).toBe("+552422226134");
  });

  it("keeps already correct E.164 number", () => {
    expect(normalizePhoneE164("+552422226134")).toBe("+552422226134");
  });

  it("normalizes US number with country code", () => {
    expect(normalizePhoneE164("+1 212 555-0100")).toBe("+12125550100");
  });

  it("strips spaces and dashes", () => {
    expect(normalizePhoneE164("24 2222-6134")).toBe("+2422226134");
  });

  it("returns null for empty string", () => {
    expect(normalizePhoneE164("")).toBeNull();
  });

  it("returns null for null", () => {
    expect(normalizePhoneE164(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(normalizePhoneE164(undefined)).toBeNull();
  });

  it("returns null for whitespace only", () => {
    expect(normalizePhoneE164("   ")).toBeNull();
  });
});

describe("normalizePhoneForWhatsApp", () => {
  it("strips + from E.164 for Evolution API", () => {
    expect(normalizePhoneForWhatsApp("+552422226134")).toBe("552422226134");
  });

  it("returns digits unchanged if no + present", () => {
    expect(normalizePhoneForWhatsApp("552422226134")).toBe("552422226134");
  });

  it("strips formatting from stored E.164", () => {
    expect(normalizePhoneForWhatsApp("+1 212 555-0100")).toBe("12125550100");
  });

  it("returns null for empty string", () => {
    expect(normalizePhoneForWhatsApp("")).toBeNull();
  });

  it("returns null for null", () => {
    expect(normalizePhoneForWhatsApp(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(normalizePhoneForWhatsApp(undefined)).toBeNull();
  });
});
