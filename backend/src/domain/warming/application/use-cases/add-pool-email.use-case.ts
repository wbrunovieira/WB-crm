import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { WarmingPoolEmail } from "../../enterprise/entities/warming-pool-email.entity";
import { WarmingPoolEmailsRepository } from "../repositories/warming-pool-emails.repository";

type Input = { email: string; name?: string; ownerId: string };
type Output = Either<Error, { poolEmail: WarmingPoolEmail }>;

@Injectable()
export class AddPoolEmailUseCase {
  constructor(private readonly poolEmails: WarmingPoolEmailsRepository) {}

  async execute({ email, name, ownerId }: Input): Promise<Output> {
    const existing = await this.poolEmails.findByEmail(email, ownerId);
    if (existing) return left(new Error("Email já está no pool de aquecimento"));

    const poolEmail = WarmingPoolEmail.create({
      email,
      name: name ?? null,
      isActive: true,
      ownerId,
    });

    await this.poolEmails.save(poolEmail);
    return right({ poolEmail });
  }
}
