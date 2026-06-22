/**
 * Normalizes a phone number to E.164 format (+countrycode+digits).
 *
 * Brazil-aware: spreadsheet numbers often arrive WITHOUT the country code
 * (e.g. "(24) 98286-4581", "24982864581", "024982864581"). Those must still be
 * stored as +55… (e.g. +5524982864581). A number that already carries a
 * foreign country code (e.g. +1 / +351) is preserved as-is.
 *
 * Brazilian national number = DDD(2) + subscriber, where subscriber is 9 digits
 * for mobile (starts with 9) or 8 digits for landline.
 *
 * Returns null if the input is empty/falsy.
 */
export function normalizePhoneE164(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (!digits) return null;

  // International access prefix ("00" + country code) → drop it.
  if (digits.startsWith("00")) digits = digits.slice(2);

  // Already carries the Brazilian country code: 55 + 10 (landline) / 11 (mobile).
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return `+${digits}`;
  }

  // Trunk-prefix "0" before a 10/11-digit national number ("0" + DDD + number).
  if (digits.startsWith("0") && (digits.length === 11 || digits.length === 12)) {
    digits = digits.slice(1);
  }

  // Bare Brazilian national number → prepend the +55 country code.
  if (digits.length === 11 && digits[2] === "9") return `+55${digits}`; // DDD + mobile
  if (digits.length === 10) return `+55${digits}`;                       // DDD + landline

  // Otherwise assume the number already includes its own country code.
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
