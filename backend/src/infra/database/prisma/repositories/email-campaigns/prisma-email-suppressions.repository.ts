import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { EmailSuppressionsRepository } from "@/domain/email-campaigns/application/repositories/email-suppressions.repository";
import { EmailSuppression, SuppressionReason } from "@/domain/email-campaigns/enterprise/entities/email-suppression.entity";
import { UniqueEntityID } from "@/core/unique-entity-id";

@Injectable()
export class PrismaEmailSuppressionsRepository implements EmailSuppressionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toDomain(raw: any): EmailSuppression {
    return EmailSuppression.reconstitute(
      { email: raw.email, ownerId: raw.ownerId, reason: raw.reason as SuppressionReason, createdAt: raw.createdAt },
      new UniqueEntityID(raw.id),
    );
  }

  async findByEmail(email: string, ownerId: string) {
    const raw = await this.prisma.emailSuppression.findUnique({ where: { email_ownerId: { email, ownerId } } });
    return raw ? this.toDomain(raw) : null;
  }

  async findAllByOwner(ownerId: string) {
    const rows = await this.prisma.emailSuppression.findMany({ where: { ownerId }, orderBy: { createdAt: "desc" } });
    return rows.map((r) => this.toDomain(r));
  }

  async isEmailSuppressed(email: string, ownerId: string) {
    const count = await this.prisma.emailSuppression.count({ where: { email, ownerId } });
    return count > 0;
  }

  async save(suppression: EmailSuppression) {
    await this.prisma.emailSuppression.upsert({
      where: { email_ownerId: { email: suppression.email, ownerId: suppression.ownerId } },
      create: {
        id: suppression.id.toString(),
        email: suppression.email,
        ownerId: suppression.ownerId,
        reason: suppression.reason,
      },
      update: { reason: suppression.reason },
    });
  }

  async delete(email: string, ownerId: string) {
    await this.prisma.emailSuppression.delete({ where: { email_ownerId: { email, ownerId } } });
  }
}
