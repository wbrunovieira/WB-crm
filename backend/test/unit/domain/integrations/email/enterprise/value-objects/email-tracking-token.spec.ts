import { describe, it, expect } from "vitest";
import { EmailTrackingToken } from "@/domain/integrations/email/enterprise/value-objects/email-tracking-token.vo";

describe("EmailTrackingToken", () => {
  it("creates successfully for a valid 32-char alphanumeric token", () => {
    const result = EmailTrackingToken.create("abcdefghijklmnopqrstuvwxyz123456");
    expect(result.isRight()).toBe(true);
    expect(result.unwrap().value).toBe("abcdefghijklmnopqrstuvwxyz123456");
  });

  it("creates successfully for a token with dashes and underscores", () => {
    const result = EmailTrackingToken.create("abc_def-ghi_jkl-mno_pqr-stu_vwx");
    expect(result.isRight()).toBe(true);
  });

  it("creates successfully for exactly 8 chars (minimum)", () => {
    const result = EmailTrackingToken.create("abcdefgh");
    expect(result.isRight()).toBe(true);
  });

  it("creates successfully for exactly 128 chars (maximum)", () => {
    const token = "a".repeat(128);
    const result = EmailTrackingToken.create(token);
    expect(result.isRight()).toBe(true);
  });

  it("returns left for empty string", () => {
    const result = EmailTrackingToken.create("");
    expect(result.isLeft()).toBe(true);
  });

  it("returns left for whitespace-only string", () => {
    const result = EmailTrackingToken.create("   ");
    expect(result.isLeft()).toBe(true);
  });

  it("returns left for token shorter than 8 chars", () => {
    const result = EmailTrackingToken.create("abc");
    expect(result.isLeft()).toBe(true);
  });

  it("returns left for token longer than 128 chars", () => {
    const result = EmailTrackingToken.create("a".repeat(129));
    expect(result.isLeft()).toBe(true);
  });

  it("returns left for token with special characters (spaces)", () => {
    const result = EmailTrackingToken.create("abc def ghijk");
    expect(result.isLeft()).toBe(true);
  });

  it("returns left for token with dots", () => {
    const result = EmailTrackingToken.create("abc.def.ghijk.lmnop");
    expect(result.isLeft()).toBe(true);
  });

  it("returns left for token with slashes", () => {
    const result = EmailTrackingToken.create("abc/def/ghijklmno");
    expect(result.isLeft()).toBe(true);
  });

  it(".value returns the exact token string", () => {
    const token = "validToken_with-dashes";
    const result = EmailTrackingToken.create(token);
    expect(result.unwrap().value).toBe(token);
  });

  it("toString() returns the token value", () => {
    const token = "validToken_123456789";
    const result = EmailTrackingToken.create(token);
    expect(result.unwrap().toString()).toBe(token);
  });

  it("trims whitespace before validating", () => {
    const result = EmailTrackingToken.create("  abcdefghijklmnop  ");
    // Trimmed to "abcdefghijklmnop" (16 chars) — valid
    expect(result.isRight()).toBe(true);
    expect(result.unwrap().value).toBe("abcdefghijklmnop");
  });
});
