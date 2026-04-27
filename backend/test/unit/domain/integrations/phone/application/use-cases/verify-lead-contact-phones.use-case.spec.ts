import { describe, it, expect, beforeEach } from "vitest";
import { PhoneValidatorPort, type PhoneValidationResult } from "@/domain/integrations/phone/application/ports/phone-validator.port";
import { VerifyLeadContactPhonesUseCase } from "@/domain/integrations/phone/application/use-cases/verify-lead-contact-phones.use-case";

// ── Fakes ────────────────────────────────────────────────────────────────────

class FakePhoneValidator extends PhoneValidatorPort {
  public callCount = 0;
  public resultToReturn: PhoneValidationResult = { valid: true, type: "MOBILE", country: "BR" };

  validate(_phone: string): PhoneValidationResult {
    this.callCount++;
    return this.resultToReturn;
  }
}

interface LeadContactRecord {
  id: string;
  phone: string | null;
  updatedData?: Record<string, unknown>;
}

function makeFakePrisma(items: LeadContactRecord[]) {
  return {
    leadContact: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        const item = items.find((i) => i.id === where.id);
        if (!item) return null;
        return { id: item.id, phone: item.phone };
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const item = items.find((i) => i.id === where.id);
        if (item) item.updatedData = data;
        return item;
      },
    },
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("VerifyLeadContactPhonesUseCase", () => {
  let phoneValidator: FakePhoneValidator;

  beforeEach(() => {
    phoneValidator = new FakePhoneValidator();
  });

  it("returns left when leadContact not found", async () => {
    const prisma = makeFakePrisma([]);
    const sut = new VerifyLeadContactPhonesUseCase(phoneValidator, prisma as never);

    const result = await sut.execute({ leadContactId: "nonexistent", requesterId: "owner-1" });
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toBe("LeadContact não encontrado");
  });

  it("returns right with no phone result when leadContact has no phone", async () => {
    const prisma = makeFakePrisma([{ id: "lc-1", phone: null }]);
    const sut = new VerifyLeadContactPhonesUseCase(phoneValidator, prisma as never);

    const result = await sut.execute({ leadContactId: "lc-1", requesterId: "owner-1" });
    expect(result.isRight()).toBe(true);
    const value = result.value as { phone?: object };
    expect(value.phone).toBeUndefined();
    expect(phoneValidator.callCount).toBe(0);
  });

  it("validates phone and saves result when phone is present", async () => {
    const items: LeadContactRecord[] = [{ id: "lc-1", phone: "+5511999998888" }];
    const prisma = makeFakePrisma(items);
    const sut = new VerifyLeadContactPhonesUseCase(phoneValidator, prisma as never);

    phoneValidator.resultToReturn = { valid: true, type: "MOBILE", country: "BR" };

    const result = await sut.execute({ leadContactId: "lc-1", requesterId: "owner-1" });
    expect(result.isRight()).toBe(true);
    expect(phoneValidator.callCount).toBe(1);

    const updated = items[0].updatedData!;
    expect(updated.phoneValid).toBe(true);
    expect(updated.phoneType).toBe("MOBILE");
  });

  it("returns validation result in response", async () => {
    const prisma = makeFakePrisma([{ id: "lc-1", phone: "+5511999998888" }]);
    const sut = new VerifyLeadContactPhonesUseCase(phoneValidator, prisma as never);

    phoneValidator.resultToReturn = { valid: false, type: "FIXED_LINE", country: "BR" };

    const result = await sut.execute({ leadContactId: "lc-1", requesterId: "owner-1" });
    expect(result.isRight()).toBe(true);

    const value = result.value as { leadContactId: string; phone: PhoneValidationResult };
    expect(value.leadContactId).toBe("lc-1");
    expect(value.phone.valid).toBe(false);
    expect(value.phone.type).toBe("FIXED_LINE");
  });

  it("saves phoneValid=false and phoneType when invalid", async () => {
    const items: LeadContactRecord[] = [{ id: "lc-1", phone: "123" }];
    const prisma = makeFakePrisma(items);
    const sut = new VerifyLeadContactPhonesUseCase(phoneValidator, prisma as never);

    phoneValidator.resultToReturn = { valid: false, type: "UNKNOWN", country: "" };

    await sut.execute({ leadContactId: "lc-1", requesterId: "owner-1" });

    const updated = items[0].updatedData!;
    expect(updated.phoneValid).toBe(false);
    expect(updated.phoneType).toBe("UNKNOWN");
  });
});
