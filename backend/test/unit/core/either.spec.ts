import { describe, it, expect } from "vitest";
import { left, right, Left, Right } from "@/core/either";

describe("Either", () => {
  it("left() cria um Left com o valor correto", () => {
    const result = left<string, number>("erro");
    expect(result.isLeft()).toBe(true);
    expect(result.isRight()).toBe(false);
    expect(result.value).toBe("erro");
  });

  it("right() cria um Right com o valor correto", () => {
    const result = right<string, number>(42);
    expect(result.isRight()).toBe(true);
    expect(result.isLeft()).toBe(false);
    expect(result.value).toBe(42);
  });

  it("Left.isLeft retorna true e isRight retorna false", () => {
    const l = new Left<string, number>("e");
    expect(l.isLeft()).toBe(true);
    expect(l.isRight()).toBe(false);
  });

  it("Right.isRight retorna true e isLeft retorna false", () => {
    const r = new Right<string, number>(1);
    expect(r.isRight()).toBe(true);
    expect(r.isLeft()).toBe(false);
  });

  it("funciona como type guard para narrowing", () => {
    const result = left<Error, string>(new Error("falhou"));
    if (result.isLeft()) {
      expect(result.value.message).toBe("falhou");
    }
  });
});
