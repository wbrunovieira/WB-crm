import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { WarmingAccount } from "../../enterprise/entities/warming-account.entity";
import { WarmingAccountsRepository } from "../repositories/warming-accounts.repository";

type Input = { email: string; ownerId: string };
type Output = Either<Error, { account: WarmingAccount }>;

@Injectable()
export class AddWarmingAccountUseCase {
  constructor(private readonly accounts: WarmingAccountsRepository) {}

  async execute({ email, ownerId }: Input): Promise<Output> {
    const existing = await this.accounts.findByEmail(email);
    if (existing) return left(new Error("Email já cadastrado no aquecimento"));

    const account = WarmingAccount.create({
      email,
      isActive: true,
      phase: "ramping",
      startedAt: new Date(),
      ownerId,
    });

    await this.accounts.save(account);
    return right({ account });
  }
}
