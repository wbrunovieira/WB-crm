import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { WarmingAccountsRepository } from "../repositories/warming-accounts.repository";

type Input = { id: string };
type Output = Either<Error, void>;

@Injectable()
export class RemoveWarmingAccountUseCase {
  constructor(private readonly accounts: WarmingAccountsRepository) {}

  async execute({ id }: Input): Promise<Output> {
    const account = await this.accounts.findById(id);
    if (!account) return left(new Error("Conta de aquecimento não encontrada"));

    await this.accounts.delete(id);
    return right(undefined);
  }
}
