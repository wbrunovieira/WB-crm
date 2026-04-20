import { describe, it, expect } from "vitest";
import { DisqualificationReason } from "@/domain/disqualification-reasons/enterprise/entities/disqualification-reason";
import { ReasonName } from "@/domain/disqualification-reasons/enterprise/value-objects/reason-name.vo";

describe("ReasonName VO", () => {
  it("accepts valid name", () => expect(ReasonName.create("Sem budget").isRight()).toBe(true));
  it("trims whitespace", () => expect(ReasonName.create("  Sem interesse  ").unwrap().value).toBe("Sem interesse"));
  it("rejects empty", () => expect(ReasonName.create("   ").isLeft()).toBe(true));
  it("rejects name > 100 chars", () => expect(ReasonName.create("a".repeat(101)).isLeft()).toBe(true));
});

describe("DisqualificationReason entity", () => {
  it("creates with valid data", () => {
    const r = DisqualificationReason.create({ name: "Sem budget", ownerId: "u1" });
    expect(r.isRight()).toBe(true);
    expect(r.unwrap().name).toBe("Sem budget");
  });

  it("rejects empty name", () => {
    expect(DisqualificationReason.create({ name: "", ownerId: "u1" }).isLeft()).toBe(true);
  });
});
