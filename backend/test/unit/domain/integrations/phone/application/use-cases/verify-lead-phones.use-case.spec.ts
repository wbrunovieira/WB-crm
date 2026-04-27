import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryLeadsRepository } from "@test/unit/domain/leads/repositories/in-memory-leads.repository";
import { Lead } from "@/domain/leads/enterprise/entities/lead";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { PhoneValidatorPort, type PhoneValidationResult } from "@/domain/integrations/phone/application/ports/phone-validator.port";
import { VerifyLeadPhonesUseCase } from "@/domain/integrations/phone/application/use-cases/verify-lead-phones.use-case";

class FakePhoneValidator extends PhoneValidatorPort {
  public callCount = 0;
  public resultToReturn: PhoneValidationResult = { valid: true, type: "MOBILE", country: "BR" };

  validate(_phone: string): PhoneValidationResult {
    this.callCount++;
    return this.resultToReturn;
  }
}

function makeLead(overrides: Partial<{ phone: string; phone2: string; whatsapp: string }> = {}) {
  return Lead.create({
    ownerId: "owner-1",
    businessName: "Empresa Teste",
    phone: overrides.phone,
    phone2: overrides.phone2,
    whatsapp: overrides.whatsapp,
  }, new UniqueEntityID("lead-1"));
}

describe("VerifyLeadPhonesUseCase", () => {
  let leadsRepo: InMemoryLeadsRepository;
  let phoneValidator: FakePhoneValidator;
  let sut: VerifyLeadPhonesUseCase;

  beforeEach(() => {
    leadsRepo = new InMemoryLeadsRepository();
    phoneValidator = new FakePhoneValidator();
    sut = new VerifyLeadPhonesUseCase(phoneValidator, leadsRepo);
  });

  it("returns left when lead not found", async () => {
    const result = await sut.execute({ leadId: "nonexistent", requesterId: "owner-1" });
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toBe("Lead não encontrado");
  });

  it("returns right with no results when lead has no phone fields", async () => {
    const lead = makeLead(); // no phones
    leadsRepo.items.push(lead);

    const result = await sut.execute({ leadId: "lead-1", requesterId: "owner-1" });
    expect(result.isRight()).toBe(true);
    const value = result.value as { phone?: object; phone2?: object; whatsapp?: object };
    expect(value.phone).toBeUndefined();
    expect(value.phone2).toBeUndefined();
    expect(value.whatsapp).toBeUndefined();
    expect(phoneValidator.callCount).toBe(0);
  });

  it("validates phone field when present and saves result", async () => {
    const lead = makeLead({ phone: "+5511999998888" });
    leadsRepo.items.push(lead);

    phoneValidator.resultToReturn = { valid: true, type: "MOBILE", country: "BR" };

    const result = await sut.execute({ leadId: "lead-1", requesterId: "owner-1" });
    expect(result.isRight()).toBe(true);

    const updated = leadsRepo.items[0];
    expect(updated.phoneValid).toBe(true);
    expect(updated.phoneType).toBe("MOBILE");
    expect(phoneValidator.callCount).toBe(1);
  });

  it("validates all three phone fields when all present", async () => {
    const lead = makeLead({ phone: "+5511999998888", phone2: "+5521988887777", whatsapp: "+5531977776666" });
    leadsRepo.items.push(lead);

    const result = await sut.execute({ leadId: "lead-1", requesterId: "owner-1" });
    expect(result.isRight()).toBe(true);
    expect(phoneValidator.callCount).toBe(3);

    const updated = leadsRepo.items[0];
    expect(updated.phoneValid).toBeDefined();
    expect(updated.phone2Valid).toBeDefined();
    expect(updated.whatsappPhoneValid).toBeDefined();
  });

  it("returns validation result for each phone field in response", async () => {
    const lead = makeLead({ phone: "+5511999998888" });
    leadsRepo.items.push(lead);

    phoneValidator.resultToReturn = { valid: false, type: "UNKNOWN", country: "" };

    const result = await sut.execute({ leadId: "lead-1", requesterId: "owner-1" });
    expect(result.isRight()).toBe(true);

    const value = result.value as { phone: PhoneValidationResult };
    expect(value.phone.valid).toBe(false);
    expect(value.phone.type).toBe("UNKNOWN");
  });
});
