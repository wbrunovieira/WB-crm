import { describe, it, expect } from "vitest";
import { Label } from "@/domain/labels/enterprise/entities/label";
import { LabelName } from "@/domain/labels/enterprise/value-objects/label-name.vo";
import { HexColor } from "@/domain/labels/enterprise/value-objects/hex-color.vo";

function makeName(v = "Cliente VIP") {
  return (LabelName.create(v) as any).value as LabelName;
}
function makeColor(v = "#FF5733") {
  return (HexColor.create(v) as any).value as HexColor;
}

describe("Label entity", () => {
  it("creates with required fields", () => {
    const label = Label.create({ name: makeName(), color: makeColor(), ownerId: "user-001" });
    expect(label.name).toBe("Cliente VIP");
    expect(label.color).toBe("#FF5733");
    expect(label.ownerId).toBe("user-001");
  });

  it("update name returns right and changes value", () => {
    const label = Label.create({ name: makeName(), color: makeColor(), ownerId: "user-001" });
    const result = label.update({ name: "Urgente" });
    expect(result.isRight()).toBe(true);
    expect(label.name).toBe("Urgente");
  });

  it("update with empty name returns left", () => {
    const label = Label.create({ name: makeName(), color: makeColor(), ownerId: "user-001" });
    const result = label.update({ name: "" });
    expect(result.isLeft()).toBe(true);
  });

  it("update color returns right and changes value", () => {
    const label = Label.create({ name: makeName(), color: makeColor(), ownerId: "user-001" });
    const result = label.update({ color: "#00FF00" });
    expect(result.isRight()).toBe(true);
    expect(label.color).toBe("#00FF00");
  });

  it("update with invalid color returns left", () => {
    const label = Label.create({ name: makeName(), color: makeColor(), ownerId: "user-001" });
    const result = label.update({ color: "not-a-color" });
    expect(result.isLeft()).toBe(true);
    expect(label.color).toBe("#FF5733"); // unchanged
  });

  it("update with no fields is a no-op right", () => {
    const label = Label.create({ name: makeName(), color: makeColor(), ownerId: "user-001" });
    const result = label.update({});
    expect(result.isRight()).toBe(true);
  });
});
