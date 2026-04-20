import { describe, it, expect } from "vitest";
import { HexColor } from "@/domain/labels/enterprise/value-objects/hex-color.vo";

describe("HexColor", () => {
  it("creates with valid 6-char hex", () => {
    const result = HexColor.create("#FF5733");
    expect(result.isRight()).toBe(true);
    expect(result.value.toString()).toBe("#FF5733");
  });

  it("creates with valid 3-char hex", () => {
    expect(HexColor.create("#FFF").isRight()).toBe(true);
  });

  it("normalizes to uppercase", () => {
    const result = HexColor.create("#ff5733");
    expect(result.isRight()).toBe(true);
    expect(result.value.toString()).toBe("#FF5733");
  });

  it("rejects without hash prefix", () => {
    expect(HexColor.create("FF5733").isLeft()).toBe(true);
  });

  it("rejects invalid characters", () => {
    expect(HexColor.create("#GGGGGG").isLeft()).toBe(true);
  });

  it("rejects wrong length", () => {
    expect(HexColor.create("#FFFF").isLeft()).toBe(true);
    expect(HexColor.create("#FFFFFFF").isLeft()).toBe(true);
  });

  it("rejects empty string", () => {
    expect(HexColor.create("").isLeft()).toBe(true);
  });
});
