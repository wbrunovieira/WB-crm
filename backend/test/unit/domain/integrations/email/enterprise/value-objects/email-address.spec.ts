import { describe, it, expect } from "vitest";
import { EmailAddress } from "@/domain/integrations/email/enterprise/value-objects/email-address.vo";

describe("EmailAddress", () => {
  it("creates successfully for a valid email", () => {
    const result = EmailAddress.create("user@example.com");
    expect(result.isRight()).toBe(true);
    expect(result.unwrap().value).toBe("user@example.com");
  });

  it("creates successfully for a subdomain email", () => {
    const result = EmailAddress.create("user@mail.example.com");
    expect(result.isRight()).toBe(true);
  });

  it("creates successfully for a + alias email", () => {
    const result = EmailAddress.create("user+tag@example.com");
    expect(result.isRight()).toBe(true);
  });

  it("normalizes to lowercase", () => {
    const result = EmailAddress.create("User@EXAMPLE.COM");
    expect(result.isRight()).toBe(true);
    expect(result.unwrap().value).toBe("user@example.com");
  });

  it("trims whitespace", () => {
    const result = EmailAddress.create("  user@example.com  ");
    expect(result.isRight()).toBe(true);
    expect(result.unwrap().value).toBe("user@example.com");
  });

  it("returns left for empty string", () => {
    const result = EmailAddress.create("");
    expect(result.isLeft()).toBe(true);
  });

  it("returns left for whitespace-only string", () => {
    const result = EmailAddress.create("   ");
    expect(result.isLeft()).toBe(true);
  });

  it("returns left for missing @", () => {
    const result = EmailAddress.create("userexample.com");
    expect(result.isLeft()).toBe(true);
  });

  it("returns left for missing domain TLD", () => {
    const result = EmailAddress.create("user@example");
    expect(result.isLeft()).toBe(true);
  });

  it("returns left for @ at the start", () => {
    const result = EmailAddress.create("@example.com");
    expect(result.isLeft()).toBe(true);
  });

  it("returns left for domain starting with a dot", () => {
    const result = EmailAddress.create("user@.example.com");
    expect(result.isLeft()).toBe(true);
  });

  it("returns left for domain ending with a dot", () => {
    const result = EmailAddress.create("user@example.");
    expect(result.isLeft()).toBe(true);
  });

  it("returns left for string with spaces inside", () => {
    const result = EmailAddress.create("user name@example.com");
    expect(result.isLeft()).toBe(true);
  });

  it(".value returns the normalized email", () => {
    const result = EmailAddress.create("Test@Example.COM");
    expect(result.unwrap().value).toBe("test@example.com");
  });

  it("toString() returns the email", () => {
    const result = EmailAddress.create("test@example.com");
    expect(result.unwrap().toString()).toBe("test@example.com");
  });
});
