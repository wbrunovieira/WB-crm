import { describe, it, expect } from "vitest";
import { CadenceName } from "@/domain/cadences/enterprise/value-objects/cadence-name.vo";
import { CadenceSlug } from "@/domain/cadences/enterprise/value-objects/cadence-slug.vo";
import { CadenceStatus } from "@/domain/cadences/enterprise/value-objects/cadence-status.vo";
import { StepChannel } from "@/domain/cadences/enterprise/value-objects/step-channel.vo";
import { StepDayNumber } from "@/domain/cadences/enterprise/value-objects/step-day-number.vo";
import { LeadCadenceStatus } from "@/domain/cadences/enterprise/value-objects/lead-cadence-status.vo";

describe("CadenceName", () => {
  it("accepts valid name", () => expect(CadenceName.create("Cadência 14 dias").isRight()).toBe(true));
  it("rejects empty name", () => expect(CadenceName.create("  ").isLeft()).toBe(true));
  it("rejects name > 100 chars", () => expect(CadenceName.create("a".repeat(101)).isLeft()).toBe(true));
  it("trims whitespace", () => expect(CadenceName.create("  Nome  ").unwrap().value).toBe("Nome"));
});

describe("CadenceSlug", () => {
  it("accepts valid slug", () => expect(CadenceSlug.create("cadencia-14-dias").isRight()).toBe(true));
  it("rejects uppercase", () => expect(CadenceSlug.create("Cadencia").isLeft()).toBe(true));
  it("rejects spaces", () => expect(CadenceSlug.create("cadencia 14").isLeft()).toBe(true));
  it("fromName strips accents", () => expect(CadenceSlug.fromName("Cadência Técnica").value).toBe("cadencia-tecnica"));
  it("fromName collapses hyphens", () => expect(CadenceSlug.fromName("A & B").value).toBe("a-b"));
});

describe("CadenceStatus", () => {
  it("accepts draft/active/archived", () => {
    expect(CadenceStatus.create("draft").isRight()).toBe(true);
    expect(CadenceStatus.create("active").isRight()).toBe(true);
    expect(CadenceStatus.create("archived").isRight()).toBe(true);
  });
  it("rejects invalid", () => expect(CadenceStatus.create("published").isLeft()).toBe(true));
});

describe("StepChannel", () => {
  it("accepts all valid channels", () => {
    for (const ch of ["email", "linkedin", "whatsapp", "call", "meeting", "instagram", "task"]) {
      expect(StepChannel.create(ch).isRight()).toBe(true);
    }
  });
  it("rejects invalid channel", () => expect(StepChannel.create("fax").isLeft()).toBe(true));
  it("maps channel to activity type", () => {
    expect(StepChannel.create("instagram").unwrap().toActivityType()).toBe("instagram_dm");
    expect(StepChannel.create("linkedin").unwrap().toActivityType()).toBe("task");
  });
});

describe("StepDayNumber", () => {
  it("accepts day 1", () => expect(StepDayNumber.create(1).isRight()).toBe(true));
  it("accepts day 365", () => expect(StepDayNumber.create(365).isRight()).toBe(true));
  it("rejects day 0", () => expect(StepDayNumber.create(0).isLeft()).toBe(true));
  it("rejects day 366", () => expect(StepDayNumber.create(366).isLeft()).toBe(true));
  it("rejects float", () => expect(StepDayNumber.create(1.5).isLeft()).toBe(true));
});

describe("LeadCadenceStatus", () => {
  it("accepts all valid statuses", () => {
    for (const s of ["active", "paused", "completed", "cancelled"]) {
      expect(LeadCadenceStatus.create(s).isRight()).toBe(true);
    }
  });
  it("rejects invalid", () => expect(LeadCadenceStatus.create("stopped").isLeft()).toBe(true));
});
