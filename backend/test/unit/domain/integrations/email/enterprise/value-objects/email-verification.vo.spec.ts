import { describe, it, expect } from "vitest";
import { EmailVerification, InvalidEmailVerificationError } from "@/domain/integrations/email/enterprise/value-objects/email-verification.vo";

describe("EmailVerification (Value Object)", () => {
  it("creates a valid verification", () => {
    const r = EmailVerification.create({ valid: true, status: "valid", reason: "Email válido" });
    expect(r.isRight()).toBe(true);
    const v = r.value as EmailVerification;
    expect(v.valid).toBe(true);
    expect(v.status).toBe("valid");
    expect(v.reason).toBe("Email válido");
    expect(v.verifiedAt).toBeInstanceOf(Date);
  });

  it.each(["valid", "invalid", "risky", "unknown"] as const)("accepts known status %s", (status) => {
    const r = EmailVerification.create({ valid: status === "valid", status, reason: "x" });
    expect(r.isRight()).toBe(true);
    expect((r.value as EmailVerification).status).toBe(status);
  });

  it("rejects an unknown status", () => {
    const r = EmailVerification.create({ valid: false, status: "bogus" as never, reason: "x" });
    expect(r.isLeft()).toBe(true);
    expect(r.value).toBeInstanceOf(InvalidEmailVerificationError);
  });

  it("trims the reason", () => {
    const r = EmailVerification.create({ valid: true, status: "valid", reason: "  ok  " });
    expect((r.value as EmailVerification).reason).toBe("ok");
  });

  it("falls back to a status-derived reason when reason is empty/whitespace", () => {
    const r = EmailVerification.create({ valid: false, status: "invalid", reason: "   " });
    expect(r.isRight()).toBe(true);
    const v = r.value as EmailVerification;
    expect(v.reason.length).toBeGreaterThan(0);
    expect(v.reason.toLowerCase()).toContain("invalid");
  });

  it("uses the provided verifiedAt when given (deterministic)", () => {
    const at = new Date("2026-01-02T03:04:05Z");
    const r = EmailVerification.create({ valid: true, status: "valid", reason: "ok" }, at);
    expect((r.value as EmailVerification).verifiedAt).toEqual(at);
  });

  it("does not couple `valid` to `status` for ambiguous statuses (risky can be valid or not)", () => {
    const a = EmailVerification.create({ valid: true, status: "risky", reason: "catch-all" });
    const b = EmailVerification.create({ valid: false, status: "risky", reason: "catch-all" });
    expect(a.isRight()).toBe(true);
    expect(b.isRight()).toBe(true);
  });

  it.each([null, undefined])("falls back to a default reason when reason is %s", (reason) => {
    const r = EmailVerification.create({ valid: true, status: "valid", reason: reason as never });
    expect(r.isRight()).toBe(true);
    expect((r.value as EmailVerification).reason.length).toBeGreaterThan(0);
  });

  it("preserves internal whitespace, trimming only the edges", () => {
    const r = EmailVerification.create({ valid: true, status: "valid", reason: "  multi\nline reason  " });
    expect((r.value as EmailVerification).reason).toBe("multi\nline reason");
  });

  it("does not truncate a very long reason", () => {
    const long = "x".repeat(5000);
    const r = EmailVerification.create({ valid: false, status: "invalid", reason: long });
    expect((r.value as EmailVerification).reason).toBe(long);
  });

  it("stamps a fresh verifiedAt on each create when none is provided", async () => {
    const a = EmailVerification.create({ valid: true, status: "valid", reason: "ok" }).value as EmailVerification;
    await new Promise((res) => setTimeout(res, 2));
    const b = EmailVerification.create({ valid: true, status: "valid", reason: "ok" }).value as EmailVerification;
    expect(b.verifiedAt.getTime()).toBeGreaterThanOrEqual(a.verifiedAt.getTime());
  });
});
