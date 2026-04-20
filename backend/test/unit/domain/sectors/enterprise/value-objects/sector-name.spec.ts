import { describe, it, expect } from "vitest";
import { SectorName } from "@/domain/sectors/enterprise/value-objects/sector-name.vo";

describe("SectorName", () => {
  it("creates with valid name", () => {
    expect(SectorName.create("Tecnologia").isRight()).toBe(true);
  });

  it("trims whitespace", () => {
    expect(SectorName.create("  SaaS  ").unwrap().toString()).toBe("SaaS");
  });

  it("rejects empty string", () => {
    expect(SectorName.create("").isLeft()).toBe(true);
    expect(SectorName.create("   ").isLeft()).toBe(true);
  });

  it("rejects name longer than 100 chars", () => {
    expect(SectorName.create("a".repeat(101)).isLeft()).toBe(true);
  });

  it("accepts exactly 100 chars", () => {
    expect(SectorName.create("a".repeat(100)).isRight()).toBe(true);
  });
});
