/**
 * Normalizes a phone number to E.164 format (+countrycode+digits).
 * Assumes the phone already contains the country code.
 * Returns null if the input is empty/falsy.
 */
export function normalizePhoneE164(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  return `+${digits}`;
}

/**
 * Returns the phone number as digits only (no +) for Evolution API / WhatsApp check.
 * Assumes the phone is already stored in E.164 format.
 */
export function normalizePhoneForWhatsApp(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return digits || null;
}
