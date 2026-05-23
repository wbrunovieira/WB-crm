import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { WarmingPoolEmailsRepository } from "../repositories/warming-pool-emails.repository";

type Input = { id: string };
type Output = Either<Error, void>;

@Injectable()
export class RemovePoolEmailUseCase {
  constructor(private readonly poolEmails: WarmingPoolEmailsRepository) {}

  async execute({ id }: Input): Promise<Output> {
    const poolEmail = await this.poolEmails.findById(id);
    if (!poolEmail) return left(new Error("Email não encontrado no pool"));

    await this.poolEmails.delete(id);
    return right(undefined);
  }
}
