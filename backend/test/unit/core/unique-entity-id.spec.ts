import { describe, it, expect } from "vitest";
import { UniqueEntityID } from "@/core/unique-entity-id";

describe("UniqueEntityID", () => {
  it("gera um UUID quando nenhum valor é fornecido", () => {
    const id = new UniqueEntityID();
    expect(id.value).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });

  it("usa o valor fornecido", () => {
    const id = new UniqueEntityID("custom-id");
    expect(id.value).toBe("custom-id");
  });

  it("equals retorna true para o mesmo valor", () => {
    const a = new UniqueEntityID("abc");
    const b = new UniqueEntityID("abc");
    expect(a.equals(b)).toBe(true);
  });

  it("equals retorna false para valores diferentes", () => {
    const a = new UniqueEntityID("abc");
    const b = new UniqueEntityID("xyz");
    expect(a.equals(b)).toBe(false);
  });

  it("toString retorna o valor string", () => {
    const id = new UniqueEntityID("my-id");
    expect(id.toString()).toBe("my-id");
  });
});
