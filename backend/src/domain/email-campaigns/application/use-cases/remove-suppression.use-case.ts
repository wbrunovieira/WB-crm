import { Injectable } from "@nestjs/common";
import { EmailSuppressionsRepository } from "../repositories/email-suppressions.repository";

@Injectable()
export class RemoveSuppressionUseCase {
  constructor(private readonly repo: EmailSuppressionsRepository) {}

  async execute(email: string, ownerId: string): Promise<void> {
    await this.repo.delete(email, ownerId);
  }
}
