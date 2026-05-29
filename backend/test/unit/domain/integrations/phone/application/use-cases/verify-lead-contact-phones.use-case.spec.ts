import { describe, it, expect, beforeEach } from "vitest";
import { PhoneValidatorPort, type PhoneValidationResult } from "@/domain/integrations/phone/application/ports/phone-validator.port";
import { VerifyLeadContactPhonesUseCase } from "@/domain/integrations/phone/application/use-cases/verify-lead-contact-phones.use-case";
import { InMemoryLeadContactsRepository } from "@test/unit/domain/leads/fakes/in-memory-lead-contacts.repository";
import { InMemoryLeadsRepository } from "@test/unit/domain/leads/repositories/in-memory-leads.repository";
import { Lead } from "@/domain/leads/enterprise/entities/lead";
import { UniqueEntityID } from "@/core/unique-entity-id";

const OWNER = "owner-1";
const LEAD_ID = "lead-1";

class FakePhoneValidator extends PhoneValidatorPort {
  public callCount = 0;
  public resultToReturn: PhoneValidationResult = { valid: true, type: "MOBILE", country: "BR" };
  validate(_phone: string): PhoneValidationResult {
    this.callCount++;
    return this.resultToReturn;
  }
}

describe("VerifyLeadContactPhonesUseCase", () => {
  let phoneValidator: FakePhoneValidator;
  let leadContacts: InMemoryLeadContactsRepository;
  let leads: InMemoryLeadsRepository;
  let sut: VerifyLeadContactPhonesUseCase;

  async function seedContact(phone: string | null, leadId = LEAD_ID): Promise<string> {
    const c = await leadContacts.create({ leadId, name: "Contato", phone: phone ?? undefined });
    return c.id;
  }
  function run(leadContactId: string, requesterId = OWNER, requesterRole = "sdr") {
    return sut.execute({ leadContactId, requesterId, requesterRole });
  }

  beforeEach(() => {
    phoneValidator = new FakePhoneValidator();
    leadContacts = new InMemoryLeadContactsRepository();
    leads = new InMemoryLeadsRepository();
    leads.items.push(Lead.create({ businessName: "Empresa", ownerId: OWNER }, new UniqueEntityID(LEAD_ID)));
    sut = new VerifyLeadContactPhonesUseCase(phoneValidator, leadContacts, leads);
  });

  it("returns left when leadContact not found", async () => {
    const result = await run("nonexistent");
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toBe("LeadContact não encontrado");
  });

  it("returns left when the parent lead no longer exists", async () => {
    const id = await seedContact("+5511999998888", "ghost-lead");
    const result = await run(id);
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toBe("Lead não encontrado");
    expect(phoneValidator.callCount).toBe(0);
  });

  it("denies access when the requester does not own the parent lead", async () => {
    const id = await seedContact("+5511999998888");
    const result = await run(id, "another-user", "sdr");
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toBe("Não autorizado");
    expect(phoneValidator.callCount).toBe(0);
    expect(leadContacts.phoneVerifications[id]).toBeUndefined();
  });

  it("allows an admin to verify a contact they do not own", async () => {
    const id = await seedContact("+5511999998888");
    const result = await run(id, "another-user", "admin");
    expect(result.isRight()).toBe(true);
  });

  it("returns right with no phone result when leadContact has no phone", async () => {
    const id = await seedContact(null);
    const result = await run(id);
    expect(result.isRight()).toBe(true);
    expect((result.value as { phone?: object }).phone).toBeUndefined();
    expect(phoneValidator.callCount).toBe(0);
  });

  it("validates phone and saves result when phone is present", async () => {
    const id = await seedContact("+5511999998888");
    phoneValidator.resultToReturn = { valid: true, type: "MOBILE", country: "BR" };

    const result = await run(id);
    expect(result.isRight()).toBe(true);
    expect(phoneValidator.callCount).toBe(1);
    expect(leadContacts.phoneVerifications[id]).toEqual({ phoneValid: true, phoneType: "MOBILE" });
  });

  it("returns the validation result in the response", async () => {
    const id = await seedContact("+5511999998888");
    phoneValidator.resultToReturn = { valid: false, type: "FIXED_LINE", country: "BR" };

    const result = await run(id);
    const value = result.value as { leadContactId: string; phone: PhoneValidationResult };
    expect(value.leadContactId).toBe(id);
    expect(value.phone.valid).toBe(false);
    expect(value.phone.type).toBe("FIXED_LINE");
  });

  it("saves phoneValid=false and phoneType when invalid", async () => {
    const id = await seedContact("123");
    phoneValidator.resultToReturn = { valid: false, type: "UNKNOWN", country: "" };

    await run(id);
    expect(leadContacts.phoneVerifications[id]).toEqual({ phoneValid: false, phoneType: "UNKNOWN" });
  });
});
