import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryPartnersRepository } from "@test/unit/domain/partners/repositories/in-memory-partners.repository";
import { Partner } from "@/domain/partners/enterprise/entities/partner";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { PhoneValidatorPort, type PhoneValidationResult } from "@/domain/integrations/phone/application/ports/phone-validator.port";
import { VerifyPartnerPhonesUseCase } from "@/domain/integrations/phone/application/use-cases/verify-partner-phones.use-case";

class FakePhoneValidator extends PhoneValidatorPort {
  public callCount = 0;
  public resultToReturn: PhoneValidationResult = { valid: true, type: "MOBILE", country: "BR" };

  validate(_phone: string): PhoneValidationResult {
    this.callCount++;
    return this.resultToReturn;
  }
}

function makePartner(overrides: Partial<{ phone: string; whatsapp: string; ownerId: string }> = {}) {
  return Partner.create({
    ownerId: overrides.ownerId ?? "owner-1",
    name: "Parceiro Teste",
    partnerType: "consultoria",
    partnerStatus: "active",
    phone: overrides.phone,
    whatsapp: overrides.whatsapp,
  }, new UniqueEntityID("partner-1"));
}

describe("VerifyPartnerPhonesUseCase", () => {
  let partnersRepo: InMemoryPartnersRepository;
  let phoneValidator: FakePhoneValidator;
  let sut: VerifyPartnerPhonesUseCase;

  beforeEach(() => {
    partnersRepo = new InMemoryPartnersRepository();
    phoneValidator = new FakePhoneValidator();
    sut = new VerifyPartnerPhonesUseCase(phoneValidator, partnersRepo);
  });

  it("returns left when partner not found", async () => {
    const r = await sut.execute({ partnerId: "nope", requesterId: "owner-1", requesterRole: "sdr" });
    expect(r.isLeft()).toBe(true);
    expect((r.value as Error).message).toBe("Parceiro não encontrado");
  });

  it("rejects a partner owned by another user (data isolation)", async () => {
    partnersRepo.items.push(makePartner({ phone: "+5511999999999", ownerId: "owner-2" }));
    const r = await sut.execute({ partnerId: "partner-1", requesterId: "owner-1", requesterRole: "sdr" });
    expect(r.isLeft()).toBe(true);
    expect((r.value as Error).message).toBe("Não autorizado");
    expect(partnersRepo.phoneVerifications.has("partner-1")).toBe(false);
  });

  it("validates phone and whatsapp and persists the result", async () => {
    partnersRepo.items.push(makePartner({ phone: "+5511988887777", whatsapp: "+5511911112222" }));

    const r = await sut.execute({ partnerId: "partner-1", requesterId: "owner-1", requesterRole: "sdr" });

    expect(r.isRight()).toBe(true);
    if (r.isRight()) {
      expect(r.value.phone?.valid).toBe(true);
      expect(r.value.whatsapp?.valid).toBe(true);
    }
    expect(phoneValidator.callCount).toBe(2);
    const saved = partnersRepo.phoneVerifications.get("partner-1");
    expect(saved?.phoneValid).toBe(true);
    expect(saved?.whatsappPhoneValid).toBe(true);
  });

  it("does not persist when the partner has no phone/whatsapp", async () => {
    partnersRepo.items.push(makePartner());
    const r = await sut.execute({ partnerId: "partner-1", requesterId: "owner-1", requesterRole: "sdr" });
    expect(r.isRight()).toBe(true);
    expect(partnersRepo.phoneVerifications.has("partner-1")).toBe(false);
  });
});
