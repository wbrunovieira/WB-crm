import { describe, it, expect } from "vitest";
import { phoneVariations } from "@/infra/shared/phone-matcher/phone-matcher.service";

describe("phoneVariations", () => {
  it("returns digits-only variant", () => {
    const v = phoneVariations("+5571999998888");
    expect(v).toContain("5571999998888");
  });

  it("generates variant without Brazilian country code", () => {
    const v = phoneVariations("+5571999998888");
    expect(v).toContain("71999998888");
  });

  it("generates local number variant (without DDD)", () => {
    const v = phoneVariations("+5571999998888");
    expect(v).toContain("999998888");
  });

  it("handles number without + prefix", () => {
    const v = phoneVariations("5571999998888");
    expect(v).toContain("5571999998888");
    expect(v).toContain("71999998888");
  });

  it("adds 55 prefix when missing for Brazilian numbers", () => {
    const v = phoneVariations("71999998888");
    expect(v).toContain("5571999998888");
  });

  it("filters out variants shorter than 8 digits", () => {
    const v = phoneVariations("+551234");
    expect(v.every((n) => n.length >= 8)).toBe(true);
  });

  // --- Non-Brazilian numbers (Portugal 351, USA 1, etc.) ---

  it("includes digits-only for Portuguese number +351910155711", () => {
    const v = phoneVariations("+351910155711");
    expect(v).toContain("351910155711");
  });

  it("does NOT strip non-Brazilian country code as if it were 55", () => {
    const v = phoneVariations("+351910155711");
    // Should NOT produce "1910155711" (treating 35 as country code)
    expect(v).not.toContain("1910155711");
  });

  it("includes digits-only for US number +12025551234", () => {
    const v = phoneVariations("+12025551234");
    expect(v).toContain("12025551234");
  });
});
