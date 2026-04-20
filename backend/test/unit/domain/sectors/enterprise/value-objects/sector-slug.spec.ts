import { describe, it, expect } from "vitest";
import { SectorSlug } from "@/domain/sectors/enterprise/value-objects/sector-slug.vo";

describe("SectorSlug", () => {
  it("creates with valid slug", () => {
    expect(SectorSlug.create("tecnologia-saas").isRight()).toBe(true);
  });

  it("generates slug from name", () => {
    const result = SectorSlug.fromName("Tecnologia SaaS");
    expect(result.isRight()).toBe(true);
    expect(result.unwrap().toString()).toBe("tecnologia-saas");
  });

  it("generates slug stripping accents", () => {
    const result = SectorSlug.fromName("Indústria Automotiva");
    expect(result.unwrap().toString()).toBe("industria-automotiva");
  });

  it("rejects empty slug", () => {
    expect(SectorSlug.create("").isLeft()).toBe(true);
  });

  it("rejects slug with spaces", () => {
    expect(SectorSlug.create("has space").isLeft()).toBe(true);
  });

  it("rejects slug with uppercase", () => {
    expect(SectorSlug.create("Tecnologia").isLeft()).toBe(true);
  });
});
