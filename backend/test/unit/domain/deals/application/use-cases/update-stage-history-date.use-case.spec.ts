import { describe, it, expect } from "vitest";
import { UpdateStageHistoryDateUseCase, StageHistoryNotFoundError } from "@/domain/deals/application/use-cases/update-stage-history-date.use-case";

describe("UpdateStageHistoryDateUseCase", () => {
  it("encaminha args e retorna { dealId } quando o registro existe", async () => {
    const args: unknown[] = [];
    const repo = {
      updateStageHistoryDate: async (historyId: string, changedAt: Date) => {
        args.push(historyId, changedAt);
        return { dealId: "deal-9" };
      },
    } as never;
    const when = new Date(2026, 4, 1);
    const r = await new UpdateStageHistoryDateUseCase(repo).execute({ historyId: "h1", changedAt: when });
    expect(r.isRight()).toBe(true);
    if (r.isRight()) expect(r.value.dealId).toBe("deal-9");
    expect(args).toEqual(["h1", when]);
  });

  it("registro inexistente → StageHistoryNotFoundError", async () => {
    const repo = { updateStageHistoryDate: async () => null } as never;
    const r = await new UpdateStageHistoryDateUseCase(repo).execute({ historyId: "x", changedAt: new Date(2026, 4, 1) });
    if (r.isLeft()) expect(r.value).toBeInstanceOf(StageHistoryNotFoundError);
    else throw new Error("esperava left");
  });
});
