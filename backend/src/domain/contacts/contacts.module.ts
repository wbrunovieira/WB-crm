import { Module } from "@nestjs/common";
import { AuthModule } from "@/infra/auth/auth.module";
import { ContactsRepository } from "./application/repositories/contacts.repository";
import { GetContactsUseCase } from "./application/use-cases/get-contacts.use-case";
import { GetContactByIdUseCase } from "./application/use-cases/get-contact-by-id.use-case";
import { CreateContactUseCase } from "./application/use-cases/create-contact.use-case";
import { UpdateContactUseCase } from "./application/use-cases/update-contact.use-case";
import { DeleteContactUseCase } from "./application/use-cases/delete-contact.use-case";
import { ToggleContactStatusUseCase } from "./application/use-cases/toggle-contact-status.use-case";
import { PrismaContactsRepository } from "@/infra/database/prisma/repositories/contacts/prisma-contacts.repository";
import { ContactsController } from "@/infra/controllers/contacts.controller";

@Module({
  imports: [AuthModule],
  controllers: [ContactsController],
  providers: [
    { provide: ContactsRepository, useClass: PrismaContactsRepository },
    GetContactsUseCase,
    GetContactByIdUseCase,
    CreateContactUseCase,
    UpdateContactUseCase,
    DeleteContactUseCase,
    ToggleContactStatusUseCase,
  ],
  exports: [ContactsRepository],
})
export class ContactsModule {}
