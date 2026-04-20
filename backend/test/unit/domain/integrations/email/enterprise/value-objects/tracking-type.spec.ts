import { describe, it, expect } from "vitest";
import { TrackingType } from "@/domain/integrations/email/enterprise/value-objects/tracking-type.vo";

describe("TrackingType", () => {
  it('creates successfully for "open"', () => {
    const result = TrackingType.create("open");
    expect(result.isRight()).toBe(true);
    expect(result.unwrap().value).toBe("open");
  });

  it('creates successfully for "click"', () => {
    const result = TrackingType.create("click");
    expect(result.isRight()).toBe(true);
    expect(result.unwrap().value).toBe("click");
  });

  it('normalizes "OPEN" to "open"', () => {
    const result = TrackingType.create("OPEN");
    expect(result.isRight()).toBe(true);
    expect(result.unwrap().value).toBe("open");
  });

  it('normalizes "CLICK" to "click"', () => {
    const result = TrackingType.create("CLICK");
    expect(result.isRight()).toBe(true);
    expect(result.unwrap().value).toBe("click");
  });

  it('normalizes "Open" (mixed case) to "open"', () => {
    const result = TrackingType.create("Open");
    expect(result.isRight()).toBe(true);
    expect(result.unwrap().value).toBe("open");
  });

  it("returns left for empty string", () => {
    const result = TrackingType.create("");
    expect(result.isLeft()).toBe(true);
  });

  it("returns left for whitespace-only string", () => {
    const result = TrackingType.create("   ");
    expect(result.isLeft()).toBe(true);
  });

  it('returns left for "view" (invalid type)', () => {
    const result = TrackingType.create("view");
    expect(result.isLeft()).toBe(true);
  });

  it('returns left for "bounce" (invalid type)', () => {
    const result = TrackingType.create("bounce");
    expect(result.isLeft()).toBe(true);
  });

  it("returns left for numeric value", () => {
    const result = TrackingType.create("1");
    expect(result.isLeft()).toBe(true);
  });

  it(".value returns the normalized type", () => {
    const result = TrackingType.create("open");
    expect(result.unwrap().value).toBe("open");
  });

  it("toString() returns the type string", () => {
    const result = TrackingType.create("click");
    expect(result.unwrap().toString()).toBe("click");
  });
});
