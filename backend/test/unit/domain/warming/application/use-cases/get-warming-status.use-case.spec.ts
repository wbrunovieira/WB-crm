import { describe, it, expect } from "vitest";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { WarmingAccount } from "@/domain/warming/enterprise/entities/warming-account.entity";
import { InMemoryWarmingAccountsRepository } from "../../fakes/in-memory-warming-accounts.repository";
import { GetWarmingStatusUseCase } from "@/domain/warming/application/use-cases/get-warming-status.use-case";

const OWNER = "owner-1";

function account(id: string, email: string, ownerId = OWNER, isActive = true) {
  return WarmingAccount.create(
    { email, isActive, phase: "ramping", startedAt: new Date(2026, 0, 1), ownerId },
    new UniqueEntityID(id),
  );
}

describe("GetWarmingStatusUseCase", () => {
  it("retorna status só das contas do owner, com todaySentCount do repo de sends", async () => {
    const accounts = new InMemoryWarmingAccountsRepository();
    accounts.items.push(account("a1", "a@x.com"), account("a2", "b@x.com", "outro"));
    const sends = { countTodayByAccount: async (id: string) => (id === "a1" ? 3 : 0) } as never;

    const sut = new GetWarmingStatusUseCase(accounts, sends);
    const r = await sut.execute({ ownerId: OWNER });

    expect(r.isRight()).toBe(true);
    if (r.isRight()) {
      expect(r.value.accounts).toHaveLength(1);
      const acc = r.value.accounts[0];
      expect(acc.id).toBe("a1");
      expect(acc.email).toBe("a@x.com");
      expect(acc.isActive).toBe(true);
      expect(acc.phase).toBe("ramping");
      expect(acc.todaySentCount).toBe(3);
    }
  });

  it("owner sem contas → lista vazia", async () => {
    const accounts = new InMemoryWarmingAccountsRepository();
    const sends = { countTodayByAccount: async () => 0 } as never;
    const r = await new GetWarmingStatusUseCase(accounts, sends).execute({ ownerId: OWNER });
    if (r.isRight()) expect(r.value.accounts).toHaveLength(0);
    else throw new Error("esperava right");
  });
});
