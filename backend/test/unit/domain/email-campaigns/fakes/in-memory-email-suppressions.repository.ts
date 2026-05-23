import type { EmailSuppressionsRepository } from "@/domain/email-campaigns/application/repositories/email-suppressions.repository";
import type { EmailSuppression } from "@/domain/email-campaigns/enterprise/entities/email-suppression.entity";

export class InMemoryEmailSuppressionsRepository implements EmailSuppressionsRepository {
  items: EmailSuppression[] = [];

  async findByEmail(email: string, ownerId: string) {
    return this.items.find((s) => s.email === email && s.ownerId === ownerId) ?? null;
  }

  async findAllByOwner(ownerId: string) {
    return this.items.filter((s) => s.ownerId === ownerId);
  }

  async isEmailSuppressed(email: string, ownerId: string) {
    return this.items.some((s) => s.email === email && s.ownerId === ownerId);
  }

  async save(suppression: EmailSuppression) {
    const idx = this.items.findIndex((s) => s.id.equals(suppression.id));
    if (idx >= 0) this.items[idx] = suppression;
    else this.items.push(suppression);
  }

  async delete(email: string, ownerId: string) {
    this.items = this.items.filter((s) => !(s.email === email && s.ownerId === ownerId));
  }
}
