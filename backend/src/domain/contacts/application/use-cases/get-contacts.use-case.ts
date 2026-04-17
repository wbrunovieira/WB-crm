import { Injectable } from "@nestjs/common";
import { right, type Either } from "@/core/either";
import { ContactsRepository, type ContactFilters } from "../repositories/contacts.repository";
import type { Contact } from "../../enterprise/entities/contact";

interface Input {
  requesterId: string;
  requesterRole: string;
  filters?: ContactFilters;
}
type Output = Either<never, { contacts: Contact[] }>;

@Injectable()
export class GetContactsUseCase {
  constructor(private readonly contacts: ContactsRepository) {}

  async execute({ requesterId, requesterRole, filters = {} }: Input): Promise<Output> {
    const contacts = await this.contacts.findMany({
      filters,
      requesterId,
      requesterRole,
    });
    return right({ contacts });
  }
}
