import { Injectable } from "@nestjs/common";
import { Either, right } from "@/core/either";
import { WarmingAccountsRepository } from "../repositories/warming-accounts.repository";
import { WarmingSendsRepository } from "../repositories/warming-sends.repository";

export interface AccountStatus {
  id: string;
  email: string;
  isActive: boolean;
  phase: string;
  startedAt: Date;
  daysSinceStart: number;
  dailyVolume: number;
  todaySentCount: number;
}

type Output = Either<never, { accounts: AccountStatus[] }>;

@Injectable()
export class GetWarmingStatusUseCase {
  constructor(
    private readonly accounts: WarmingAccountsRepository,
    private readonly sends: WarmingSendsRepository,
  ) {}

  async execute({ ownerId }: { ownerId: string }): Promise<Output> {
    const accounts = await this.accounts.findAll(ownerId);

    const statuses = await Promise.all(
      accounts.map(async (account) => ({
        id: account.id.toString(),
        email: account.email,
        isActive: account.isActive,
        phase: account.phase,
        startedAt: account.startedAt,
        daysSinceStart: account.daysSinceStart,
        dailyVolume: account.dailyVolume,
        todaySentCount: await this.sends.countTodayByAccount(account.id.toString()),
      })),
    );

    return right({ accounts: statuses });
  }
}
