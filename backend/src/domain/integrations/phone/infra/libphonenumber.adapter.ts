import { Injectable } from "@nestjs/common";
import { parsePhoneNumber } from "libphonenumber-js/max";
import type { CountryCode } from "libphonenumber-js";
import { PhoneValidatorPort, type PhoneValidationResult } from "../application/ports/phone-validator.port";

function mapPhoneType(type: string | undefined): string {
  if (!type) return "UNKNOWN";
  switch (type) {
    case "MOBILE": return "MOBILE";
    case "FIXED_LINE": return "FIXED_LINE";
    case "FIXED_LINE_OR_MOBILE": return "FIXED_LINE_OR_MOBILE";
    case "VOIP": return "VOIP";
    case "TOLL_FREE": return "TOLL_FREE";
    case "PREMIUM_RATE": return "PREMIUM_RATE";
    default: return "UNKNOWN";
  }
}

@Injectable()
export class LibphonenumberAdapter extends PhoneValidatorPort {
  validate(phone: string, countryHint?: string): PhoneValidationResult {
    try {
      // Try parsing as E.164 first; fallback to countryHint or BR
      let parsed = this.tryParse(phone);
      if (!parsed || !parsed.isValid()) {
        const fallback = (countryHint as CountryCode | undefined) ?? "BR";
        parsed = this.tryParse(phone, fallback);
      }
      if (!parsed || !parsed.isValid()) {
        return { valid: false, type: "UNKNOWN", country: "" };
      }
      return {
        valid: true,
        type: mapPhoneType(parsed.getType()),
        country: parsed.country ?? "",
      };
    } catch {
      return { valid: false, type: "UNKNOWN", country: "" };
    }
  }

  private tryParse(phone: string, country?: CountryCode) {
    try {
      return parsePhoneNumber(phone, country);
    } catch {
      return null;
    }
  }
}
