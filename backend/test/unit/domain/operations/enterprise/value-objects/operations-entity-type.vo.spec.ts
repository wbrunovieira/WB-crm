import { describe, it, expect } from "vitest";
import { OperationsEntityType, InvalidEntityTypeError } from "@/domain/operations/enterprise/value-objects/operations-entity-type.vo";

describe("OperationsEntityType VO", () => {
  it("aceita 'lead'", () => {
    const r = OperationsEntityType.create("lead");
    expect(r.isRight()).toBe(true);
    if (r.isRight()) expect(r.value.value).toBe("lead");
  });

  it("aceita 'organization'", () => {
    const r = OperationsEntityType.create("organization");
    expect(r.isRight()).toBe(true);
    if (r.isRight()) expect(r.value.value).toBe("organization");
  });

  it("rejeita tipo desconhecido com InvalidEntityTypeError", () => {
    const r = OperationsEntityType.create("partner");
    expect(r.isLeft()).toBe(true);
    if (r.isLeft()) {
      expect(r.value).toBeInstanceOf(InvalidEntityTypeError);
      expect(r.value.name).toBe("InvalidEntityTypeError");
      expect(r.value.message).toContain("partner");
    }
  });

  it("é case-sensitive (rejeita 'LEAD')", () => {
    expect(OperationsEntityType.create("LEAD").isLeft()).toBe(true);
  });

  it("rejeita vazio", () => {
    expect(OperationsEntityType.create("").isLeft()).toBe(true);
  });

  it("toString retorna o valor", () => {
    const r = OperationsEntityType.create("lead");
    if (r.isRight()) expect(r.value.toString()).toBe("lead");
  });
});
