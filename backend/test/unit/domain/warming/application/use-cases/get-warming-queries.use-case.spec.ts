import { describe, it, expect } from "vitest";
import { GetWarmingPoolEmailsUseCase } from "@/domain/warming/application/use-cases/get-warming-pool-emails.use-case";
import { GetWarmingHistoryUseCase } from "@/domain/warming/application/use-cases/get-warming-history.use-case";

describe("GetWarmingPoolEmailsUseCase", () => {
  it("encaminha o ownerId para findAll e retorna o resultado", async () => {
    let calledWith = "";
    const fakeRepo = {
      findAll: async (ownerId: string) => { calledWith = ownerId; return [{ id: "p1" }] as never; },
    };
    const sut = new GetWarmingPoolEmailsUseCase(fakeRepo as never);
    const result = await sut.execute("owner-1");
    expect(calledWith).toBe("owner-1");
    expect(result).toHaveLength(1);
  });
});

describe("GetWarmingHistoryUseCase", () => {
  it("encaminha ownerId/page/pageSize e retorna { sends, total }", async () => {
    const args: unknown[] = [];
    const fakeRepo = {
      findAll: async (ownerId: string, page: number, pageSize: number) => {
        args.push(ownerId, page, pageSize);
        return { sends: [{ id: "s1" }] as never, total: 7 };
      },
    };
    const sut = new GetWarmingHistoryUseCase(fakeRepo as never);
    const result = await sut.execute("owner-1", 2, 20);
    expect(args).toEqual(["owner-1", 2, 20]);
    expect(result.total).toBe(7);
    expect(result.sends).toHaveLength(1);
  });
});
