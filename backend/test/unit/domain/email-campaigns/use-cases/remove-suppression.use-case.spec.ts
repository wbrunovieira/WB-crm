import { describe, it, expect } from "vitest";
import { RemoveSuppressionUseCase } from "@/domain/email-campaigns/application/use-cases/remove-suppression.use-case";

describe("RemoveSuppressionUseCase", () => {
  it("encaminha email + ownerId para o delete do repositório", async () => {
    const calls: Array<[string, string]> = [];
    const repo = { delete: async (email: string, ownerId: string) => { calls.push([email, ownerId]); } } as never;
    await new RemoveSuppressionUseCase(repo).execute("a@b.com", "owner-1");
    expect(calls).toEqual([["a@b.com", "owner-1"]]);
  });
});
