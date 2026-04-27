import { Module } from "@nestjs/common";
import { AuthModule } from "@/infra/auth/auth.module";
import { LeadsModule } from "@/domain/leads/leads.module";
import { ContactsModule } from "@/domain/contacts/contacts.module";

// Port
import { PhoneValidatorPort } from "./application/ports/phone-validator.port";
import { EmailVerifierPort } from "@/domain/integrations/email/application/ports/email-verifier.port";

// Adapter
import { LibphonenumberAdapter } from "./infra/libphonenumber.adapter";
import { DeepEmailValidatorAdapter } from "@/domain/integrations/email/infra/deep-email-validator.adapter";

// Use Cases
import { VerifyLeadPhonesUseCase } from "./application/use-cases/verify-lead-phones.use-case";
import { BatchVerifyLeadPhonesUseCase } from "./application/use-cases/batch-verify-lead-phones.use-case";
import { VerifyContactPhonesUseCase } from "./application/use-cases/verify-contact-phones.use-case";
import { BatchVerifyContactPhonesUseCase } from "./application/use-cases/batch-verify-contact-phones.use-case";
import { VerifyContactEmailUseCase } from "./application/use-cases/verify-contact-email.use-case";
import { BatchVerifyContactEmailsUseCase } from "./application/use-cases/batch-verify-contact-emails.use-case";
import { VerifyLeadContactPhonesUseCase } from "./application/use-cases/verify-lead-contact-phones.use-case";

// Controller
import { PhoneController } from "./infra/controllers/phone.controller";

@Module({
  imports: [AuthModule, LeadsModule, ContactsModule],
  controllers: [PhoneController],
  providers: [
    // Use Cases
    VerifyLeadPhonesUseCase,
    BatchVerifyLeadPhonesUseCase,
    VerifyContactPhonesUseCase,
    BatchVerifyContactPhonesUseCase,
    VerifyContactEmailUseCase,
    BatchVerifyContactEmailsUseCase,
    VerifyLeadContactPhonesUseCase,

    // Port implementations
    { provide: PhoneValidatorPort, useClass: LibphonenumberAdapter },
    DeepEmailValidatorAdapter,
    { provide: EmailVerifierPort, useClass: DeepEmailValidatorAdapter },
  ],
  exports: [PhoneValidatorPort, VerifyLeadPhonesUseCase, BatchVerifyLeadPhonesUseCase, VerifyContactPhonesUseCase, BatchVerifyContactPhonesUseCase, VerifyContactEmailUseCase, BatchVerifyContactEmailsUseCase, VerifyLeadContactPhonesUseCase],
})
export class PhoneModule {}
