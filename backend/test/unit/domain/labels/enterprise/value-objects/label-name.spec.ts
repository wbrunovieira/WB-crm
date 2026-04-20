import { describe, it, expect } from "vitest";
import { LabelName } from "@/domain/labels/enterprise/value-objects/label-name.vo";

describe("LabelName", () => {
  it("creates with valid name", () => {
    const result = LabelName.create("Cliente VIP");
    expect(result.isRight()).toBe(true);
    expect(result.value.toString()).toBe("Cliente VIP");
  });

  it("trims whitespace", () => {
    const result = LabelName.create("  Urgente  ");
    expect(result.isRight()).toBe(true);
    expect(result.value.toString()).toBe("Urgente");
  });

  it("rejects empty string", () => {
    expect(LabelName.create("").isLeft()).toBe(true);
    expect(LabelName.create("   ").isLeft()).toBe(true);
  });

  it("rejects name longer than 50 chars", () => {
    const result = LabelName.create("a".repeat(51));
    expect(result.isLeft()).toBe(true);
  });

  it("accepts exactly 50 chars", () => {
    expect(LabelName.create("a".repeat(50)).isRight()).toBe(true);
  });
});
