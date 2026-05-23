import { Injectable } from "@nestjs/common";
import { Either, right } from "@/core/either";
import { EmailSuppression, SuppressionReason } from "../../enterprise/entities/email-suppression.entity";
import { EmailSuppressionsRepository } from "../repositories/email-suppressions.repository";

interface Input { email: string; ownerId: string; reason: SuppressionReason; }

@Injectable()
export class AddToSuppressionUseCase {
  constructor(private readonly suppressions: EmailSuppressionsRepository) {}

  async execute(input: Input): Promise<Either<never, { email: string }>> {
    const exists = await this.suppressions.findByEmail(input.email, input.ownerId);
    if (!exists) {
      const suppression = EmailSuppression.create(input);
      await this.suppressions.save(suppression);
    }
    return right({ email: input.email });
  }
}
