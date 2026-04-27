import { Injectable } from "@nestjs/common";
import { parsePhoneNumber } from "libphonenumber-js";
import { PhoneValidatorPort, type PhoneValidationResult } from "../application/ports/phone-validator.port";

function mapPhoneType(type: string | undefined): string {
  if (!type) return "UNKNOWN";
  switch (type) {
    case "MOBILE": return "MOBILE";
    case "FIXED_LINE": return "FIXED_LINE";
    case "FIXED_LINE_OR_MOBILE": return "FIXED_LINE_OR_MOBILE";
    case "VOIP": return "VOIP";
    default: return "UNKNOWN";
  }
}

@Injectable()
export class LibphonenumberAdapter extends PhoneValidatorPort {
  validate(phone: string): PhoneValidationResult {
    try {
      const parsed = parsePhoneNumber(phone);
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
}
