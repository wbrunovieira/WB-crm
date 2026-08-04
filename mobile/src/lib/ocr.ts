/**
 * Card/flyer OCR. Text extraction runs ON-DEVICE via ML Kit (free, offline, image never leaves
 * the phone). ML Kit is a NATIVE module — it is NOT in Expo Go, so `recognizeText` throws
 * OcrUnavailableError there; it works in a dev/EAS build. The `parseCardText` heuristic is pure
 * JS and works everywhere. A smarter cloud structuring (Gemini) can be layered later (see plan §4.1).
 */

export class OcrUnavailableError extends Error {
  constructor() {
    super("ocr-unavailable");
    this.name = "OcrUnavailableError";
  }
}

/** Runs on-device OCR. Lazy-requires ML Kit so Expo Go doesn't crash — it degrades gracefully. */
export async function recognizeText(imageUri: string): Promise<string> {
  let mod: unknown;
  try {
    mod = require("@react-native-ml-kit/text-recognition");
  } catch {
    throw new OcrUnavailableError();
  }
  const TextRecognition = (mod as { default?: unknown })?.default ?? mod;
  const recognize = (TextRecognition as { recognize?: (u: string) => Promise<{ text?: string }> })?.recognize;
  if (typeof recognize !== "function") throw new OcrUnavailableError();
  try {
    const result = await recognize(imageUri);
    return result?.text ?? "";
  } catch {
    throw new OcrUnavailableError();
  }
}

export interface ParsedCard {
  businessName?: string;
  contactName?: string;
  contactRole?: string;
  contactMobile?: string;
  phone?: string;
  contactEmail?: string;
  website?: string;
}

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const URL_RE = /((https?:\/\/)?www\.[^\s]+|[a-z0-9-]+\.(com|net|io|co|dev|app)(\.br)?)/i;
const PHONE_RE = /\+?\d[\d\s().-]{7,}\d/g;
// Non-global twin of PHONE_RE for boolean checks: `.test()` on a global regex is stateful
// (mutates lastIndex), so reusing PHONE_RE across lines in a loop can silently return false
// on a real match once an earlier line has advanced its lastIndex past the current line's length.
const PHONE_TEST_RE = /\+?\d[\d\s().-]{7,}\d/;
const LEGAL_SUFFIX = /\b(ltda|me|eireli|s\.?a\.?|epp|mei)\b/i;
const ROLE_WORDS = [
  "ceo", "cto", "cfo", "coo", "diretor", "diretora", "gerente", "sócio", "socio", "proprietár",
  "fundador", "consultor", "analista", "coordenador", "supervisor", "vendedor", "representante",
  "gestor", "presidente", "assistente", "designer", "arquiteto", "engenheiro", "advogad",
];

/** BR mobiles: 11 digits (DDD+9+8) or 9 starting with 9; landlines are 10/8. */
function looksMobile(digits: string): boolean {
  let d = digits;
  if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
  if (d.length === 11) return d[2] === "9";
  if (d.length === 9) return d[0] === "9";
  return false;
}

const NAME_PARTICLE = /^(d[aeo]s?|e)$/i; // de, da, do, das, dos, e

function isPersonName(line: string): boolean {
  if (LEGAL_SUFFIX.test(line) || /[@\d]/.test(line)) return false;
  const tokens = line.split(/\s+/);
  if (tokens.length < 2 || tokens.length > 4) return false;
  // Accept UPPER or Title case (cards use both), plus lowercase particles after the first token.
  return tokens.every((t, i) => (i > 0 && NAME_PARTICLE.test(t)) || /^[A-ZÀ-Ý][A-Za-zÀ-ÿ'.-]+$/.test(t));
}

/** Heuristic extraction from raw OCR text. Best-effort — the user confirms/edits afterwards. */
export function parseCardText(text: string): ParsedCard {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out: ParsedCard = {};
  const used = new Set<number>();

  lines.forEach((l, i) => {
    if (!out.contactEmail) {
      const m = l.match(EMAIL_RE);
      if (m) { out.contactEmail = m[0].toLowerCase(); used.add(i); }
    }
  });

  lines.forEach((l, i) => {
    if (out.website || EMAIL_RE.test(l)) return;
    const m = l.match(URL_RE);
    if (m) { out.website = m[0].replace(/^https?:\/\//, ""); used.add(i); }
  });

  for (const l of lines) {
    // Split on 2+ spaces so a "tel   cel" pair doesn't merge into one garbage number.
    for (const seg of l.split(/\s{2,}/)) {
      const matches = seg.match(PHONE_RE);
      if (!matches) continue;
      for (const raw of matches) {
        const d = raw.replace(/\D/g, "");
        if (d.length < 8 || d.length > 13) continue; // >13 = two numbers merged → skip
        if (looksMobile(d) && !out.contactMobile) out.contactMobile = raw.trim();
        else if (!looksMobile(d) && !out.phone) out.phone = raw.trim();
      }
    }
  }

  const roleIdx = lines.findIndex((l) => ROLE_WORDS.some((k) => l.toLowerCase().includes(k)));
  if (roleIdx >= 0) { out.contactRole = lines[roleIdx]; used.add(roleIdx); }

  // Person name: prefer the line just above the role, else the first person-like line.
  let nameIdx = roleIdx > 0 && isPersonName(lines[roleIdx - 1]) ? roleIdx - 1 : -1;
  if (nameIdx < 0) nameIdx = lines.findIndex((l, i) => !used.has(i) && isPersonName(l));
  if (nameIdx >= 0) { out.contactName = lines[nameIdx]; used.add(nameIdx); }

  // Business name: a legal-suffix line, else the first unused non-contact line.
  let bizIdx = lines.findIndex((l) => LEGAL_SUFFIX.test(l));
  if (bizIdx < 0) {
    bizIdx = lines.findIndex((l, i) => !used.has(i) && !EMAIL_RE.test(l) && !URL_RE.test(l) && !PHONE_TEST_RE.test(l) && !isPersonName(l));
  }
  if (bizIdx >= 0) out.businessName = lines[bizIdx];

  return out;
}

/** Full pipeline: image → on-device OCR → heuristic fields. */
export async function scanCard(imageUri: string): Promise<ParsedCard> {
  return parseCardText(await recognizeText(imageUri));
}
