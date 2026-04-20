import { describe, it, expect } from "vitest";
import { Cadence } from "@/domain/cadences/enterprise/entities/cadence";
import { CadenceStep } from "@/domain/cadences/enterprise/entities/cadence-step";

describe("Cadence entity", () => {
  it("creates cadence with auto slug", () => {
    const r = Cadence.create({ name: "Cadência 14 Dias", ownerId: "u1" });
    expect(r.isRight()).toBe(true);
    const c = r.unwrap();
    expect(c.slug).toBe("cadencia-14-dias");
    expect(c.status).toBe("draft");
    expect(c.durationDays).toBe(14);
  });

  it("rejects empty name", () => {
    expect(Cadence.create({ name: "", ownerId: "u1" }).isLeft()).toBe(true);
  });

  it("rejects duration 0", () => {
    expect(Cadence.create({ name: "Test", ownerId: "u1", durationDays: 0 }).isLeft()).toBe(true);
  });

  it("rejects invalid status", () => {
    expect(Cadence.create({ name: "Test", ownerId: "u1", status: "invalid" }).isLeft()).toBe(true);
  });

  it("publish sets status to active", () => {
    const c = Cadence.create({ name: "Test", ownerId: "u1" }).unwrap();
    c.publish();
    expect(c.status).toBe("active");
    expect(c.isPublished).toBe(true);
  });

  it("unpublish sets status back to draft", () => {
    const c = Cadence.create({ name: "Test", ownerId: "u1", status: "active" }).unwrap();
    c.unpublish();
    expect(c.status).toBe("draft");
  });

  it("cannot publish archived cadence", () => {
    const c = Cadence.create({ name: "Test", ownerId: "u1", status: "archived" }).unwrap();
    expect(c.publish().isLeft()).toBe(true);
  });

  it("update changes name and generates no slug change if slug not passed", () => {
    const c = Cadence.create({ name: "Original", ownerId: "u1" }).unwrap();
    c.update({ name: "Atualizado" });
    expect(c.name).toBe("Atualizado");
  });
});

describe("CadenceStep entity", () => {
  it("creates step with valid data", () => {
    const r = CadenceStep.create({ cadenceId: "c1", dayNumber: 1, channel: "email", subject: "Contato inicial" });
    expect(r.isRight()).toBe(true);
    const s = r.unwrap();
    expect(s.dayNumber).toBe(1);
    expect(s.activityType).toBe("email");
  });

  it("rejects day 0", () => {
    expect(CadenceStep.create({ cadenceId: "c1", dayNumber: 0, channel: "email", subject: "X" }).isLeft()).toBe(true);
  });

  it("rejects invalid channel", () => {
    expect(CadenceStep.create({ cadenceId: "c1", dayNumber: 1, channel: "fax", subject: "X" }).isLeft()).toBe(true);
  });

  it("rejects empty subject", () => {
    expect(CadenceStep.create({ cadenceId: "c1", dayNumber: 1, channel: "call", subject: "" }).isLeft()).toBe(true);
  });

  it("maps instagram to instagram_dm activity type", () => {
    const s = CadenceStep.create({ cadenceId: "c1", dayNumber: 3, channel: "instagram", subject: "DM" }).unwrap();
    expect(s.activityType).toBe("instagram_dm");
  });

  it("update changes channel and day", () => {
    const s = CadenceStep.create({ cadenceId: "c1", dayNumber: 1, channel: "email", subject: "X" }).unwrap();
    s.update({ dayNumber: 5, channel: "call" });
    expect(s.dayNumber).toBe(5);
    expect(s.channel).toBe("call");
  });
});
