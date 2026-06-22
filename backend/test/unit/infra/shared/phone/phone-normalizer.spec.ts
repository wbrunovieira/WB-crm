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

  it("prefixes +55 on a bare BR landline (DDD + 8 digits)", () => {
    expect(normalizePhoneE164("24 2222-6134")).toBe("+552422226134");
  });

  // ── Brazilian numbers must always be stored as +55 + DDD + subscriber ──────
  // Reference: +5524982864581 (DDD 24, mobile). Every spreadsheet variant of it
  // must normalize to exactly that.
  describe("BR mobile +5524982864581 — all spreadsheet variants", () => {
    const expected = "+5524982864581";
    const variants = [
      "+5524982864581",      // already E.164
      "5524982864581",       // no +
      "24982864581",         // DDD + mobile, no country code
      "(24) 98286-4581",     // formatted, no country code
      "24 98286-4581",       // spaces, no country code
      "024982864581",        // leading trunk 0
      "0055 24 98286-4581",  // 00 international prefix + 55
      "+55 (24) 98286-4581", // formatted with country code
    ];
    for (const v of variants) {
      it(`"${v}" → ${expected}`, () => {
        expect(normalizePhoneE164(v)).toBe(expected);
      });
    }
  });

  it("prefixes +55 on a bare BR mobile (DDD + 9 digits)", () => {
    expect(normalizePhoneE164("11999990000")).toBe("+5511999990000");
  });

  it("keeps a BR number that already has the 55 country code", () => {
    expect(normalizePhoneE164("552422226134")).toBe("+552422226134");
  });

  it("does NOT prefix 55 on a foreign number that carries its own code", () => {
    expect(normalizePhoneE164("+1 212 555-0100")).toBe("+12125550100");
    expect(normalizePhoneE164("+351 912 345 678")).toBe("+351912345678");
  });

  it("is idempotent (normalizing an already-E.164 value is a no-op)", () => {
    expect(normalizePhoneE164(normalizePhoneE164("24982864581"))).toBe("+5524982864581");
    expect(normalizePhoneE164(normalizePhoneE164("+12125550100"))).toBe("+12125550100");
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
