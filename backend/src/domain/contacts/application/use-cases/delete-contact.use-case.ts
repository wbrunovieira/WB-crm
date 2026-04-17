import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { ContactsRepository } from "../repositories/contacts.repository";

interface Input { id: string; requesterId: string; requesterRole: string }
type Output = Either<Error, void>;

@Injectable()
export class DeleteContactUseCase {
  constructor(private readonly contacts: ContactsRepository) {}

  async execute({ id, requesterId, requesterRole }: Input): Promise<Output> {
    const contact = await this.contacts.findByIdWithAccess(id, requesterId, requesterRole);
    if (!contact) return left(new Error("Contato não encontrado"));
    if (requesterRole !== "admin" && contact.ownerId !== requesterId) {
      return left(new Error("Não autorizado"));
    }
    await this.contacts.delete(id);
    return right(undefined);
  }
}
