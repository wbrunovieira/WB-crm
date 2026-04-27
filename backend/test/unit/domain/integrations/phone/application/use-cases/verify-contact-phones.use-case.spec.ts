import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryContactsRepository } from "@test/unit/domain/contacts/repositories/in-memory-contacts.repository";
import { Contact } from "@/domain/contacts/enterprise/entities/contact";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { PhoneValidatorPort, type PhoneValidationResult } from "@/domain/integrations/phone/application/ports/phone-validator.port";
import { VerifyContactPhonesUseCase } from "@/domain/integrations/phone/application/use-cases/verify-contact-phones.use-case";

class FakePhoneValidator extends PhoneValidatorPort {
  public callCount = 0;
  public resultToReturn: PhoneValidationResult = { valid: true, type: "MOBILE", country: "BR" };

  validate(_phone: string): PhoneValidationResult {
    this.callCount++;
    return this.resultToReturn;
  }
}

function makeContact(overrides: Partial<{ phone: string; whatsapp: string }> = {}) {
  return Contact.create({
    ownerId: "owner-1",
    name: "Contato Teste",
    phone: overrides.phone,
    whatsapp: overrides.whatsapp,
  }, new UniqueEntityID("contact-1"));
}

describe("VerifyContactPhonesUseCase", () => {
  let contactsRepo: InMemoryContactsRepository;
  let phoneValidator: FakePhoneValidator;
  let sut: VerifyContactPhonesUseCase;

  beforeEach(() => {
    contactsRepo = new InMemoryContactsRepository();
    phoneValidator = new FakePhoneValidator();
    sut = new VerifyContactPhonesUseCase(phoneValidator, contactsRepo);
  });

  it("returns left when contact not found", async () => {
    const result = await sut.execute({ contactId: "nonexistent", requesterId: "owner-1" });
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toBe("Contato não encontrado");
  });

  it("returns right with no results when contact has no phone fields", async () => {
    const contact = makeContact(); // no phones
    contactsRepo.items.push(contact);

    const result = await sut.execute({ contactId: "contact-1", requesterId: "owner-1" });
    expect(result.isRight()).toBe(true);
    const value = result.value as { phone?: object; whatsapp?: object };
    expect(value.phone).toBeUndefined();
    expect(value.whatsapp).toBeUndefined();
    expect(phoneValidator.callCount).toBe(0);
  });

  it("validates phone field when present and saves result", async () => {
    const contact = makeContact({ phone: "+5511999998888" });
    contactsRepo.items.push(contact);

    phoneValidator.resultToReturn = { valid: true, type: "MOBILE", country: "BR" };

    const result = await sut.execute({ contactId: "contact-1", requesterId: "owner-1" });
    expect(result.isRight()).toBe(true);

    const updated = contactsRepo.items[0];
    expect(updated.phoneValid).toBe(true);
    expect(updated.phoneType).toBe("MOBILE");
  });

  it("validates both phone and whatsapp when both present", async () => {
    const contact = makeContact({ phone: "+5511999998888", whatsapp: "+5521988887777" });
    contactsRepo.items.push(contact);

    const result = await sut.execute({ contactId: "contact-1", requesterId: "owner-1" });
    expect(result.isRight()).toBe(true);
    expect(phoneValidator.callCount).toBe(2);

    const updated = contactsRepo.items[0];
    expect(updated.phoneValid).toBeDefined();
    expect(updated.whatsappPhoneValid).toBeDefined();
  });

  it("returns validation results in response", async () => {
    const contact = makeContact({ phone: "+5511999998888" });
    contactsRepo.items.push(contact);

    phoneValidator.resultToReturn = { valid: false, type: "FIXED_LINE", country: "BR" };

    const result = await sut.execute({ contactId: "contact-1", requesterId: "owner-1" });
    expect(result.isRight()).toBe(true);

    const value = result.value as { phone: PhoneValidationResult };
    expect(value.phone.valid).toBe(false);
    expect(value.phone.type).toBe("FIXED_LINE");
  });
});
