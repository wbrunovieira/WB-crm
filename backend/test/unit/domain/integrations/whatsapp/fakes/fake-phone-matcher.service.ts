import { IPhoneMatcherService, PhoneMatchResult } from "@/infra/shared/phone-matcher/phone-matcher.service";

export class FakePhoneMatcherService extends IPhoneMatcherService {
  public matches: Map<string, PhoneMatchResult> = new Map();

  addMatch(phone: string, result: PhoneMatchResult): void {
    this.matches.set(phone, result);
  }

  async match(phone: string, _ownerId: string): Promise<PhoneMatchResult | null> {
    return this.matches.get(phone) ?? null;
  }
}
