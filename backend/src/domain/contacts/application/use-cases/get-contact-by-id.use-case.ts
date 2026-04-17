import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { ContactsRepository } from "../repositories/contacts.repository";
import type { Contact } from "../../enterprise/entities/contact";

interface Input { id: string; requesterId: string; requesterRole: string }
type Output = Either<Error, { contact: Contact }>;

@Injectable()
export class GetContactByIdUseCase {
  constructor(private readonly contacts: ContactsRepository) {}

  async execute({ id, requesterId, requesterRole }: Input): Promise<Output> {
    const contact = await this.contacts.findByIdWithAccess(id, requesterId, requesterRole);
    if (!contact) return left(new Error("Contato não encontrado"));
    return right({ contact });
  }
}
