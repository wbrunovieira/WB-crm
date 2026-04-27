export interface PhoneValidationResult {
  valid: boolean;
  type: string; // 'MOBILE' | 'FIXED_LINE' | 'FIXED_LINE_OR_MOBILE' | 'VOIP' | 'UNKNOWN'
  country: string;
}

export abstract class PhoneValidatorPort {
  abstract validate(phone: string, countryHint?: string): PhoneValidationResult;
}
