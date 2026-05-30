import { describe, it, expect } from "vitest";
import { PipelineName } from "@/domain/pipelines/enterprise/value-objects/pipeline-name.vo";

describe("PipelineName VO", () => {
  it("aceita e faz trim", () => {
    const r = PipelineName.create("  Vendas  ");
    expect(r.isRight()).toBe(true);
    if (r.isRight()) expect(r.value.value).toBe("Vendas");
  });
  it("rejeita vazio com a mensagem de domínio", () => {
    const r = PipelineName.create("   ");
    expect(r.isLeft()).toBe(true);
    if (r.isLeft()) expect(r.value.message).toBe("Nome do pipeline é obrigatório");
  });
  it("rejeita null/undefined", () => {
    expect(PipelineName.create(null).isLeft()).toBe(true);
    expect(PipelineName.create(undefined).isLeft()).toBe(true);
  });
});
