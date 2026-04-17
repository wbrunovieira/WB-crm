import { describe, it, expect } from "vitest";
import { PhoneNumber } from "@/domain/campaigns/enterprise/value-objects/phone-number";

describe("PhoneNumber", () => {
  it("cria número brasileiro válido (11 dígitos com DDD)", () => {
    const result = PhoneNumber.create("11999998888");
    expect(result.isRight()).toBe(true);
    expect(result.value instanceof PhoneNumber ? result.value.toString() : null).toBe("5511999998888");
  });

  it("aceita número já com código de país", () => {
    const result = PhoneNumber.create("5511999998888");
    expect(result.isRight()).toBe(true);
  });

  it("normaliza removendo formatação", () => {
    const result = PhoneNumber.create("(11) 99999-8888");
    expect(result.isRight()).toBe(true);
    const phone = result.value as PhoneNumber;
    expect(phone.toString()).toBe("5511999998888");
  });

  it("rejeita número com menos de 10 dígitos", () => {
    const result = PhoneNumber.create("119999");
    expect(result.isLeft()).toBe(true);
  });

  it("rejeita string vazia", () => {
    const result = PhoneNumber.create("");
    expect(result.isLeft()).toBe(true);
  });

  it("equals compara por valor", () => {
    const a = PhoneNumber.create("11999998888").value as PhoneNumber;
    const b = PhoneNumber.create("5511999998888").value as PhoneNumber;
    expect(a.equals(b)).toBe(true);
  });
});
