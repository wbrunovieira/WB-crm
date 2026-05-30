import { describe, it, expect } from "vitest";
import { BusinessLineName } from "@/domain/admin/enterprise/value-objects/business-line-name.vo";
import { ProductName } from "@/domain/admin/enterprise/value-objects/product-name.vo";
import { TechOptionName } from "@/domain/admin/enterprise/value-objects/tech-option-name.vo";

describe("Admin name VOs", () => {
  const cases = [
    { VO: BusinessLineName, msg: "Nome da linha de negócio é obrigatório" },
    { VO: ProductName, msg: "Nome do produto é obrigatório" },
    { VO: TechOptionName, msg: "Nome é obrigatório" },
  ] as const;

  for (const { VO, msg } of cases) {
    describe(VO.name, () => {
      it("aceita e faz trim", () => {
        const r = VO.create("  Algo  ");
        expect(r.isRight()).toBe(true);
        if (r.isRight()) expect(r.value.value).toBe("Algo");
      });
      it("rejeita vazio com a mensagem de domínio", () => {
        const r = VO.create("   ");
        expect(r.isLeft()).toBe(true);
        if (r.isLeft()) expect(r.value.message).toBe(msg);
      });
      it("rejeita null/undefined", () => {
        expect(VO.create(null).isLeft()).toBe(true);
        expect(VO.create(undefined).isLeft()).toBe(true);
      });
    });
  }
});
