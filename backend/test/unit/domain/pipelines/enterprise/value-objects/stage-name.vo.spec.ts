import { describe, it, expect } from "vitest";
import { StageName } from "@/domain/pipelines/enterprise/value-objects/stage-name.vo";

describe("StageName VO", () => {
  it("aceita e faz trim", () => {
    const r = StageName.create("  Qualificação  ");
    expect(r.isRight()).toBe(true);
    if (r.isRight()) expect(r.value.value).toBe("Qualificação");
  });
  it("rejeita vazio com a mensagem de domínio", () => {
    const r = StageName.create("   ");
    expect(r.isLeft()).toBe(true);
    if (r.isLeft()) expect(r.value.message).toBe("Nome do estágio é obrigatório");
  });
  it("rejeita null/undefined", () => {
    expect(StageName.create(null).isLeft()).toBe(true);
    expect(StageName.create(undefined).isLeft()).toBe(true);
  });
});
