import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryContactsRepository } from "@test/unit/domain/contacts/repositories/in-memory-contacts.repository";
import { Contact } from "@/domain/contacts/enterprise/entities/contact";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { PhoneValidatorPort, type PhoneValidationResult } from "@/domain/integrations/phone/application/ports/phone-validator.port";
import { BatchVerifyContactPhonesUseCase } from "@/domain/integrations/phone/application/use-cases/batch-verify-contact-phones.use-case";

class FakePhoneValidator extends PhoneValidatorPort {
  public resultToReturn: PhoneValidationResult = { valid: true, type: "MOBILE", country: "BR" };

  validate(_phone: string): PhoneValidationResult {
    return this.resultToReturn;
  }
}

function makeContact(id: string, overrides: Partial<{ phone: string; whatsapp: string; ownerId: string }> = {}) {
  return Contact.create({
    ownerId: overrides.ownerId ?? "owner-1",
    name: `Contato ${id}`,
    phone: overrides.phone,
    whatsapp: overrides.whatsapp,
  }, new UniqueEntityID(id));
}

describe("BatchVerifyContactPhonesUseCase", () => {
  let contactsRepo: InMemoryContactsRepository;
  let phoneValidator: FakePhoneValidator;
  let sut: BatchVerifyContactPhonesUseCase;

  beforeEach(() => {
    contactsRepo = new InMemoryContactsRepository();
    phoneValidator = new FakePhoneValidator();
    sut = new BatchVerifyContactPhonesUseCase(phoneValidator, contactsRepo);
  });

  it("returns left when no contacts found for ownerId", async () => {
    const result = await sut.execute({ ownerId: "nonexistent-owner" });
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toContain("Nenhum contato encontrado");
  });

  it("counts skipped contacts with no phone fields", async () => {
    const c1 = makeContact("c-1"); // no phone
    const c2 = makeContact("c-2", { phone: "+5511999998888" });
    contactsRepo.items.push(c1, c2);

    const result = await sut.execute({ ownerId: "owner-1" });
    expect(result.isRight()).toBe(true);

    const value = result.value as { total: number; checked: number; skipped: number };
    expect(value.total).toBe(2);
    expect(value.skipped).toBe(1);
    expect(value.checked).toBe(1);
  });

  it("counts valid and invalid correctly", async () => {
    const c1 = makeContact("c-1", { phone: "+5511999998888" });
    const c2 = makeContact("c-2", { phone: "bad-phone" });
    contactsRepo.items.push(c1, c2);

    let callNum = 0;
    phoneValidator.validate = (_phone) => {
      callNum++;
      return callNum === 1
        ? { valid: true, type: "MOBILE", country: "BR" }
        : { valid: false, type: "UNKNOWN", country: "" };
    };

    const result = await sut.execute({ ownerId: "owner-1" });
    expect(result.isRight()).toBe(true);

    const value = result.value as { total: number; valid: number; invalid: number; checked: number };
    expect(value.valid).toBe(1);
    expect(value.invalid).toBe(1);
    expect(value.checked).toBe(2);
  });

  it("fires onProgress callback for each contact", async () => {
    const c1 = makeContact("c-1", { phone: "+5511999998888" });
    const c2 = makeContact("c-2"); // skipped
    contactsRepo.items.push(c1, c2);

    const events: unknown[] = [];
    await sut.execute({ ownerId: "owner-1", onProgress: (p) => events.push(p) });

    expect(events).toHaveLength(2);
  });
});
