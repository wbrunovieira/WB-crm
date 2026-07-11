/**
 * Partner schema validation tests
 *
 * Tests for src/lib/validations/partner.ts — focus on the new partnerStatus field.
 *
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect } from "vitest";
import { partnerSchema, PARTNER_STATUSES, PARTNER_STATUS_LABELS } from "@/lib/validations/partner";

const base = { name: "Agência X", partnerType: "agencia_digital" };

describe("partnerSchema — partnerStatus", () => {
  it("accepts each valid lifecycle status", () => {
    for (const status of PARTNER_STATUSES) {
      const result = partnerSchema.safeParse({ ...base, partnerStatus: status });
      expect(result.success).toBe(true);
    }
  });

  it("allows partnerStatus to be omitted (backend defaults to prospect)", () => {
    const result = partnerSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it("rejects an invalid partnerStatus", () => {
    const result = partnerSchema.safeParse({ ...base, partnerStatus: "banana" });
    expect(result.success).toBe(false);
  });

  it("has a pt-BR label for every status", () => {
    for (const status of PARTNER_STATUSES) {
      expect(PARTNER_STATUS_LABELS[status]).toBeTruthy();
    }
  });
});
