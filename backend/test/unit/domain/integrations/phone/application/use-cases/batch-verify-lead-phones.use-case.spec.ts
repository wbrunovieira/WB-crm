import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryLeadsRepository } from "@test/unit/domain/leads/repositories/in-memory-leads.repository";
import { Lead } from "@/domain/leads/enterprise/entities/lead";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { PhoneValidatorPort, type PhoneValidationResult } from "@/domain/integrations/phone/application/ports/phone-validator.port";
import { BatchVerifyLeadPhonesUseCase } from "@/domain/integrations/phone/application/use-cases/batch-verify-lead-phones.use-case";

class FakePhoneValidator extends PhoneValidatorPort {
  public resultToReturn: PhoneValidationResult = { valid: true, type: "MOBILE", country: "BR" };

  validate(_phone: string): PhoneValidationResult {
    return this.resultToReturn;
  }
}

function makeLead(id: string, overrides: Partial<{ phone: string; phone2: string; whatsapp: string; sourceGroup: string }> = {}) {
  return Lead.create({
    ownerId: "owner-1",
    businessName: `Empresa ${id}`,
    phone: overrides.phone,
    phone2: overrides.phone2,
    whatsapp: overrides.whatsapp,
    sourceGroup: overrides.sourceGroup ?? "grupo-teste",
  }, new UniqueEntityID(id));
}

describe("BatchVerifyLeadPhonesUseCase", () => {
  let leadsRepo: InMemoryLeadsRepository;
  let phoneValidator: FakePhoneValidator;
  let sut: BatchVerifyLeadPhonesUseCase;

  beforeEach(() => {
    leadsRepo = new InMemoryLeadsRepository();
    phoneValidator = new FakePhoneValidator();
    sut = new BatchVerifyLeadPhonesUseCase(phoneValidator, leadsRepo);
  });

  it("returns left when no leads found for sourceGroup", async () => {
    const result = await sut.execute({ sourceGroup: "grupo-vazio" });
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toContain("Nenhum lead encontrado");
  });

  it("returns left when sourceGroup is empty", async () => {
    const result = await sut.execute({ sourceGroup: "" });
    expect(result.isLeft()).toBe(true);
  });

  it("counts skipped leads with no phone fields", async () => {
    const lead1 = makeLead("lead-1"); // no phone
    const lead2 = makeLead("lead-2", { phone: "+5511999998888" });
    leadsRepo.items.push(lead1, lead2);

    const result = await sut.execute({ sourceGroup: "grupo-teste" });
    expect(result.isRight()).toBe(true);

    const value = result.value as { total: number; checked: number; skipped: number; errors: number };
    expect(value.total).toBe(2);
    expect(value.skipped).toBe(1);
    expect(value.checked).toBe(1);
  });

  it("counts valid and invalid correctly", async () => {
    const lead1 = makeLead("lead-1", { phone: "+5511999998888" }); // valid
    const lead2 = makeLead("lead-2", { phone: "invalid-phone" });  // invalid
    leadsRepo.items.push(lead1, lead2);

    let callNum = 0;
    phoneValidator.validate = (_phone) => {
      callNum++;
      return callNum === 1
        ? { valid: true, type: "MOBILE", country: "BR" }
        : { valid: false, type: "UNKNOWN", country: "" };
    };

    const result = await sut.execute({ sourceGroup: "grupo-teste" });
    expect(result.isRight()).toBe(true);

    const value = result.value as { total: number; checked: number; valid: number; invalid: number; skipped: number; errors: number };
    expect(value.total).toBe(2);
    expect(value.checked).toBe(2);
    expect(value.valid).toBe(1);
    expect(value.invalid).toBe(1);
    expect(value.skipped).toBe(0);
  });

  it("fires onProgress callback for each lead", async () => {
    const lead1 = makeLead("lead-1", { phone: "+5511999998888" });
    const lead2 = makeLead("lead-2"); // no phone — skipped
    leadsRepo.items.push(lead1, lead2);

    const progressEvents: unknown[] = [];
    await sut.execute({
      sourceGroup: "grupo-teste",
      onProgress: (p) => progressEvents.push(p),
    });

    expect(progressEvents).toHaveLength(2);
  });
});
