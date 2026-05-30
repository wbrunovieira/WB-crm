import { describe, it, expect } from "vitest";
import {
  GetDealTechStackUseCase,
  AddCategoryToDealUseCase,
  RemoveCategoryFromDealUseCase,
  AddLanguageToDealUseCase,
  RemoveLanguageFromDealUseCase,
  SetPrimaryLanguageUseCase,
  AddFrameworkToDealUseCase,
  RemoveFrameworkFromDealUseCase,
  DealNotFoundError,
} from "@/domain/deals/application/use-cases/deal-tech-stack.use-cases";

const OWNER = "owner-1";

function makeRepo(deal: { ownerId: string } | null) {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const wrap = (method: string) => async (...args: unknown[]) => { calls.push({ method, args }); };
  const repo = {
    findByIdRaw: async () => deal,
    getTechStack: async (...args: unknown[]) => { calls.push({ method: "getTechStack", args }); return { categories: [], languages: [], frameworks: [] }; },
    addCategory: wrap("addCategory"),
    removeCategory: wrap("removeCategory"),
    addLanguage: wrap("addLanguage"),
    removeLanguage: wrap("removeLanguage"),
    setPrimaryLanguage: wrap("setPrimaryLanguage"),
    addFramework: wrap("addFramework"),
    removeFramework: wrap("removeFramework"),
  };
  return { repo: repo as never, calls };
}

describe("Deal tech-stack use cases", () => {
  describe("GetDealTechStackUseCase", () => {
    it("dono → right + getTechStack chamado", async () => {
      const { repo, calls } = makeRepo({ ownerId: OWNER });
      const r = await new GetDealTechStackUseCase(repo).execute({ dealId: "d1", requesterId: OWNER, requesterRole: "sdr" });
      expect(r.isRight()).toBe(true);
      expect(calls.some((c) => c.method === "getTechStack")).toBe(true);
    });
    it("deal inexistente → DealNotFoundError", async () => {
      const { repo } = makeRepo(null);
      const r = await new GetDealTechStackUseCase(repo).execute({ dealId: "x", requesterId: OWNER, requesterRole: "sdr" });
      if (r.isLeft()) expect(r.value).toBeInstanceOf(DealNotFoundError);
      else throw new Error("esperava left");
    });
    it("outro dono + não admin → DealNotFoundError (sem vazar existência) e não lê tech stack", async () => {
      const { repo, calls } = makeRepo({ ownerId: "outro" });
      const r = await new GetDealTechStackUseCase(repo).execute({ dealId: "d1", requesterId: OWNER, requesterRole: "sdr" });
      if (r.isLeft()) expect(r.value).toBeInstanceOf(DealNotFoundError);
      else throw new Error("esperava left");
      expect(calls.some((c) => c.method === "getTechStack")).toBe(false);
    });
    it("admin acessa de qualquer dono", async () => {
      const { repo } = makeRepo({ ownerId: "outro" });
      const r = await new GetDealTechStackUseCase(repo).execute({ dealId: "d1", requesterId: OWNER, requesterRole: "admin" });
      expect(r.isRight()).toBe(true);
    });
  });

  describe("mutators — happy path encaminha args corretos ao repo", () => {
    it("AddCategory", async () => {
      const { repo, calls } = makeRepo({ ownerId: OWNER });
      const r = await new AddCategoryToDealUseCase(repo).execute({ dealId: "d1", categoryId: "c1", requesterId: OWNER, requesterRole: "sdr" });
      expect(r.isRight()).toBe(true);
      expect(calls).toContainEqual({ method: "addCategory", args: ["d1", "c1"] });
    });
    it("RemoveCategory", async () => {
      const { repo, calls } = makeRepo({ ownerId: OWNER });
      await new RemoveCategoryFromDealUseCase(repo).execute({ dealId: "d1", categoryId: "c1", requesterId: OWNER, requesterRole: "sdr" });
      expect(calls).toContainEqual({ method: "removeCategory", args: ["d1", "c1"] });
    });
    it("AddLanguage com isPrimary", async () => {
      const { repo, calls } = makeRepo({ ownerId: OWNER });
      await new AddLanguageToDealUseCase(repo).execute({ dealId: "d1", languageId: "l1", isPrimary: true, requesterId: OWNER, requesterRole: "sdr" });
      expect(calls).toContainEqual({ method: "addLanguage", args: ["d1", "l1", true] });
    });
    it("RemoveLanguage", async () => {
      const { repo, calls } = makeRepo({ ownerId: OWNER });
      await new RemoveLanguageFromDealUseCase(repo).execute({ dealId: "d1", languageId: "l1", requesterId: OWNER, requesterRole: "sdr" });
      expect(calls).toContainEqual({ method: "removeLanguage", args: ["d1", "l1"] });
    });
    it("SetPrimaryLanguage", async () => {
      const { repo, calls } = makeRepo({ ownerId: OWNER });
      await new SetPrimaryLanguageUseCase(repo).execute({ dealId: "d1", languageId: "l1", requesterId: OWNER, requesterRole: "sdr" });
      expect(calls).toContainEqual({ method: "setPrimaryLanguage", args: ["d1", "l1"] });
    });
    it("AddFramework", async () => {
      const { repo, calls } = makeRepo({ ownerId: OWNER });
      await new AddFrameworkToDealUseCase(repo).execute({ dealId: "d1", frameworkId: "f1", requesterId: OWNER, requesterRole: "sdr" });
      expect(calls).toContainEqual({ method: "addFramework", args: ["d1", "f1"] });
    });
    it("RemoveFramework", async () => {
      const { repo, calls } = makeRepo({ ownerId: OWNER });
      await new RemoveFrameworkFromDealUseCase(repo).execute({ dealId: "d1", frameworkId: "f1", requesterId: OWNER, requesterRole: "sdr" });
      expect(calls).toContainEqual({ method: "removeFramework", args: ["d1", "f1"] });
    });
  });

  describe("mutators — barram deal de outro dono (left + sem efeito no repo)", () => {
    const run = (uc: { execute: (i: never) => Promise<{ isLeft: () => boolean }> }, input: Record<string, unknown>, calls: Array<{ method: string }>) =>
      uc.execute({ ...input, dealId: "d1", requesterId: OWNER, requesterRole: "sdr" } as never).then((r) => {
        expect(r.isLeft()).toBe(true);
        // nenhuma mutação foi chamada (só findByIdRaw, que não é registrado)
        expect(calls).toHaveLength(0);
      });

    it("mutator com deal inexistente → DealNotFoundError, sem efeito (branch not-found)", async () => {
      const { repo, calls } = makeRepo(null);
      const r = await new AddCategoryToDealUseCase(repo).execute({ dealId: "x", categoryId: "c1", requesterId: OWNER, requesterRole: "sdr" });
      expect(r.isLeft()).toBe(true);
      if (r.isLeft()) expect(r.value).toBeInstanceOf(DealNotFoundError);
      expect(calls).toHaveLength(0);
    });

    it("todos os mutators", async () => {
      const cases = [
        () => { const f = makeRepo({ ownerId: "outro" }); return run(new AddCategoryToDealUseCase(f.repo), { categoryId: "c1" }, f.calls); },
        () => { const f = makeRepo({ ownerId: "outro" }); return run(new RemoveCategoryFromDealUseCase(f.repo), { categoryId: "c1" }, f.calls); },
        () => { const f = makeRepo({ ownerId: "outro" }); return run(new AddLanguageToDealUseCase(f.repo), { languageId: "l1" }, f.calls); },
        () => { const f = makeRepo({ ownerId: "outro" }); return run(new RemoveLanguageFromDealUseCase(f.repo), { languageId: "l1" }, f.calls); },
        () => { const f = makeRepo({ ownerId: "outro" }); return run(new SetPrimaryLanguageUseCase(f.repo), { languageId: "l1" }, f.calls); },
        () => { const f = makeRepo({ ownerId: "outro" }); return run(new AddFrameworkToDealUseCase(f.repo), { frameworkId: "f1" }, f.calls); },
        () => { const f = makeRepo({ ownerId: "outro" }); return run(new RemoveFrameworkFromDealUseCase(f.repo), { frameworkId: "f1" }, f.calls); },
      ];
      await Promise.all(cases.map((c) => c()));
    });
  });
});
